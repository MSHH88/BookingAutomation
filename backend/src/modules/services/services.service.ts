/**
 * Services service — Step 1.13
 *
 * Business logic for the Services Catalogue API.
 *
 * ── ServiceCategory management ────────────────────────────────────────────────
 *
 *   listCategories   — public; sorted by sortOrder asc, name asc
 *   createCategory   — ADMIN only
 *   updateCategory   — ADMIN only; 404 if missing
 *   deleteCategory   — ADMIN only; 409 if category still has services
 *
 * ── Service management ────────────────────────────────────────────────────────
 *
 *   listServices     — public; paginated; filters: categoryId, artistId, isActive, search
 *   getService       — public; includes artist roster
 *   createService    — ADMIN only; validates categoryId exists
 *   updateService    — ADMIN only; validates new categoryId when provided
 *   deleteService    — ADMIN only; 409 if active bookings; otherwise deactivates (isActive=false)
 *
 * ── Artist-service linking ────────────────────────────────────────────────────
 *
 *   linkService      — ARTIST links own profile; ADMIN specifies artistId
 *                      Idempotent: linking an already-linked service is a no-op
 *   unlinkService    — ARTIST unlinks own profile; ADMIN specifies artistId
 *
 * Soft-delete rationale:
 *   Services that appear in completed bookings / invoices must remain
 *   queryable for historical reporting.  deleteService sets isActive=false
 *   (hiding it from new bookings) rather than removing the row.
 *
 * Role scoping:
 *   ARTIST — resolves their own artistId via userId → Artist lookup.
 *   ADMIN  — must supply artistId explicitly for link/unlink operations.
 */
import { Prisma } from '@prisma/client';

import { prisma }                    from '../../lib/prisma';
import { AppError }                  from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import { logger }                    from '../../utils/logger';
import type {
  ListCategoriesQuery,
  CreateCategoryBody,
  UpdateCategoryBody,
  ListServicesQuery,
  CreateServiceBody,
  UpdateServiceBody,
  LinkServiceBody,
} from './services.schema';

// ─── Actor type ───────────────────────────────────────────────────────────────

type ActorRole = 'ADMIN' | 'ARTIST';

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/**
 * Category detail select — returned by all category endpoints.
 * Includes a service count so the caller knows if the category is in use.
 */
const categorySelect = {
  id:          true,
  name:        true,
  description: true,
  sortOrder:   true,
  isActive:    true,
  createdAt:   true,
  updatedAt:   true,
  _count: {
    select: { services: true },
  },
} satisfies Prisma.ServiceCategorySelect;

/**
 * Service list item select — lightweight for paginated lists.
 * Does NOT include the full artist roster (too expensive for a list).
 */
const serviceListSelect = {
  id:                 true,
  name:               true,
  description:        true,
  durationMinutes:    true,
  priceFrom:          true,
  bufferMinutes:      true,
  rebookIntervalDays: true,
  isActive:           true,
  createdAt:          true,
  updatedAt:          true,
  category: {
    select: { id: true, name: true, sortOrder: true },
  },
  _count: {
    select: { artists: true },
  },
} satisfies Prisma.ServiceSelect;

/**
 * Service detail select — includes full artist roster for single-item responses.
 */
const serviceDetailSelect = {
  id:                 true,
  name:               true,
  description:        true,
  durationMinutes:    true,
  priceFrom:          true,
  bufferMinutes:      true,
  rebookIntervalDays: true,
  isActive:           true,
  createdAt:          true,
  updatedAt:          true,
  category: {
    select: { id: true, name: true, sortOrder: true },
  },
  _count: {
    select: { artists: true },
  },
  artists: {
    select: {
      artist: {
        select: {
          id:   true,
          slug: true,
          user: { select: { name: true } },
        },
      },
    },
  },
} satisfies Prisma.ServiceSelect;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Resolve the operating artistId from the request context.
 *
 * ARTIST: always uses their own linked artist profile (ignores body.artistId).
 * ADMIN:  must supply requestedArtistId; throws 400 if omitted.
 */
async function resolveArtistId(
  actorUserId: string,
  actorRole:   ActorRole,
  requestedArtistId?: string,
): Promise<string> {
  if (actorRole === 'ADMIN') {
    if (!requestedArtistId) {
      throw new AppError(
        400,
        'MISSING_ARTIST_ID',
        'artistId is required in the request body for ADMIN operations',
      );
    }
    return requestedArtistId;
  }

  // ARTIST: look up their own artist profile
  const artist = await prisma.artist.findUnique({
    where:  { userId: actorUserId },
    select: { id: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist profile not found for this user');
  }
  return artist.id;
}

// ─── Category functions ───────────────────────────────────────────────────────

/**
 * List all service categories, optionally filtered by isActive.
 * Ordered by sortOrder ASC, then name ASC.
 */
export async function listCategories(query: ListCategoriesQuery) {
  const where: Prisma.ServiceCategoryWhereInput = {};
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true';
  }

  return prisma.serviceCategory.findMany({
    where,
    select:  categorySelect,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Create a new service category (ADMIN only).
 */
export async function createCategory(body: CreateCategoryBody) {
  return prisma.serviceCategory.create({
    data: {
      name:        body.name,
      description: body.description ?? null,
      sortOrder:   body.sortOrder  ?? 0,
      isActive:    body.isActive   ?? true,
    },
    select: categorySelect,
  });
}

/**
 * Update a service category (ADMIN only).
 * Throws 404 if the category does not exist.
 */
export async function updateCategory(id: string, body: UpdateCategoryBody) {
  const existing = await prisma.serviceCategory.findUnique({
    where:  { id },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Service category not found');
  }

  return prisma.serviceCategory.update({
    where: { id },
    data: {
      ...(body.name        !== undefined && { name:        body.name }),
      ...(body.description !== undefined && { description: body.description ?? null }),
      ...(body.sortOrder   !== undefined && { sortOrder:   body.sortOrder }),
      ...(body.isActive    !== undefined && { isActive:    body.isActive }),
    },
    select: categorySelect,
  });
}

/**
 * Delete a service category (ADMIN only).
 *
 * Throws 404 if the category does not exist.
 * Throws 409 if the category still has services — move or delete them first.
 */
export async function deleteCategory(id: string) {
  const existing = await prisma.serviceCategory.findUnique({
    where:  { id },
    select: {
      id:    true,
      name:  true,
      _count: { select: { services: true } },
    },
  });
  if (!existing) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Service category not found');
  }
  if (existing._count.services > 0) {
    throw new AppError(
      409,
      'CATEGORY_HAS_SERVICES',
      `Cannot delete "${existing.name}" — it still has ${existing._count.services} service(s). ` +
        'Reassign or delete those services first.',
    );
  }

  await prisma.serviceCategory.delete({ where: { id } });
  logger.info('Service category deleted', { categoryId: id });
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Paginated list of services.
 *
 * Filters:
 *  - categoryId  exact match
 *  - artistId    returns only services that artist currently offers
 *  - isActive    boolean string coercion
 *  - search      case-insensitive substring match on name + description
 *
 * Ordered by category.sortOrder ASC, then service name ASC.
 */
export async function listServices(
  query: ListServicesQuery,
): Promise<PaginatedResult<unknown>> {
  const where: Prisma.ServiceWhereInput = {};

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true';
  }
  if (query.search) {
    where.OR = [
      { name:        { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.artistId) {
    where.artists = { some: { artistId: query.artistId } };
  }

  return paginate(
    prisma.service,
    {
      where,
      select:  serviceListSelect,
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Get a single service by ID.
 * Includes the full artist roster.
 * Throws 404 if the service does not exist.
 */
export async function getService(id: string) {
  const svc = await prisma.service.findUnique({
    where:  { id },
    select: serviceDetailSelect,
  });
  if (!svc) {
    throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  }
  return svc;
}

/**
 * Create a new service (ADMIN only).
 * Throws 404 if the supplied categoryId does not exist.
 */
export async function createService(body: CreateServiceBody) {
  const category = await prisma.serviceCategory.findUnique({
    where:  { id: body.categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Service category not found');
  }

  return prisma.service.create({
    data: {
      categoryId:         body.categoryId,
      name:               body.name,
      description:        body.description        ?? null,
      durationMinutes:    body.durationMinutes,
      priceFrom:          body.priceFrom           ?? null,
      bufferMinutes:      body.bufferMinutes       ?? 0,
      rebookIntervalDays: body.rebookIntervalDays  ?? null,
      isActive:           body.isActive            ?? true,
    },
    select: serviceDetailSelect,
  });
}

/**
 * Update a service (ADMIN only).
 *
 * Throws 404 if the service does not exist.
 * Throws 404 if the new categoryId does not exist.
 */
export async function updateService(id: string, body: UpdateServiceBody) {
  const existing = await prisma.service.findUnique({
    where:  { id },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  }

  // Validate the new categoryId if provided
  if (body.categoryId !== undefined) {
    const category = await prisma.serviceCategory.findUnique({
      where:  { id: body.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Service category not found');
    }
  }

  return prisma.service.update({
    where: { id },
    data: {
      ...(body.categoryId         !== undefined && { categoryId:         body.categoryId }),
      ...(body.name               !== undefined && { name:               body.name }),
      ...(body.description        !== undefined && { description:        body.description ?? null }),
      ...(body.durationMinutes    !== undefined && { durationMinutes:    body.durationMinutes }),
      ...(body.priceFrom          !== undefined && { priceFrom:          body.priceFrom  ?? null }),
      ...(body.bufferMinutes      !== undefined && { bufferMinutes:      body.bufferMinutes }),
      ...(body.rebookIntervalDays !== undefined && { rebookIntervalDays: body.rebookIntervalDays ?? null }),
      ...(body.isActive           !== undefined && { isActive:           body.isActive }),
    },
    select: serviceDetailSelect,
  });
}

/**
 * Deactivate a service (ADMIN only).
 *
 * Sets isActive=false (soft-delete) to preserve booking history.
 * Throws 404 if the service does not exist.
 * Throws 409 if the service has active bookings (PENDING / CONFIRMED / RESCHEDULED).
 */
export async function deleteService(id: string) {
  const existing = await prisma.service.findUnique({
    where:  { id },
    select: { id: true, name: true },
  });
  if (!existing) {
    throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  }

  // Check for active bookings through both direct serviceId and BookingService join
  const activeBookingCount = await prisma.booking.count({
    where: {
      status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
      OR: [
        { serviceId: id },
        { services:  { some: { serviceId: id } } },
      ],
    },
  });

  if (activeBookingCount > 0) {
    throw new AppError(
      409,
      'SERVICE_HAS_ACTIVE_BOOKINGS',
      `Cannot deactivate "${existing.name}" — it has ${activeBookingCount} active booking(s). ` +
        'Resolve all pending/confirmed bookings before deactivating this service.',
    );
  }

  await prisma.service.update({
    where: { id },
    data:  { isActive: false },
    select: { id: true },
  });

  logger.info('Service deactivated', { serviceId: id, name: existing.name });
}

// ─── Artist-service linking ───────────────────────────────────────────────────

/**
 * Link an artist to a service (announce they offer it).
 *
 * ARTIST: links their own profile. The body's artistId is ignored.
 * ADMIN:  body.artistId is required.
 *
 * Idempotent — linking an already-linked artist is a no-op (no error thrown).
 *
 * Throws 400 if the service is inactive (can't offer an inactive service).
 * Throws 404 if the service or artist is not found.
 */
export async function linkService(
  serviceId:   string,
  actorUserId: string,
  actorRole:   ActorRole,
  body:        LinkServiceBody,
) {
  const artistId = await resolveArtistId(actorUserId, actorRole, body.artistId);

  const [svc, artist] = await Promise.all([
    prisma.service.findUnique({
      where:  { id: serviceId },
      select: { id: true, isActive: true, name: true },
    }),
    prisma.artist.findUnique({
      where:  { id: artistId },
      select: { id: true },
    }),
  ]);

  if (!svc) {
    throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  }
  if (!svc.isActive) {
    throw new AppError(
      400,
      'SERVICE_INACTIVE',
      `Cannot link to "${svc.name}" — the service is inactive`,
    );
  }
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist not found');
  }

  // Upsert is idempotent — already linked = no error, no double row
  await prisma.artistService.upsert({
    where:  { artistId_serviceId: { artistId, serviceId } },
    create: { artistId, serviceId },
    update: {},
    select: { artistId: true },
  });

  logger.info('Service linked to artist', { artistId, serviceId });
}

/**
 * Unlink an artist from a service (they no longer offer it).
 *
 * ARTIST: unlinks their own profile.
 * ADMIN:  body.artistId is required.
 *
 * Throws 404 if the link does not exist.
 */
export async function unlinkService(
  serviceId:   string,
  actorUserId: string,
  actorRole:   ActorRole,
  body:        LinkServiceBody,
) {
  const artistId = await resolveArtistId(actorUserId, actorRole, body.artistId);

  const existing = await prisma.artistService.findUnique({
    where:  { artistId_serviceId: { artistId, serviceId } },
    select: { artistId: true },
  });
  if (!existing) {
    throw new AppError(
      404,
      'LINK_NOT_FOUND',
      'Artist is not linked to this service',
    );
  }

  await prisma.artistService.delete({
    where: { artistId_serviceId: { artistId, serviceId } },
  });

  logger.info('Service unlinked from artist', { artistId, serviceId });
}
