/**
 * Artists service — all business logic for artist management.
 *
 * Responsibilities:
 *  - List and fetch artist profiles (public + admin views)
 *  - Create artist (User + Artist in a transaction)
 *  - Update artist profile fields
 *  - Soft-delete (isActive = false)
 *  - Assign / replace tattoo-style tags
 *  - Set / replace weekly availability windows
 */
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { paginate } from '../../utils/paginate';
import type {
  CreateArtistBody,
  UpdateArtistBody,
  AssignStylesBody,
  SetAvailabilityBody,
  SetArtistServicesBody,
  ListArtistsQuery,
} from './artists.schema';

// Prisma interactive-transaction client type (excludes top-level transaction methods)
type PrismaTx = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List all artists.
 *
 * - Public callers get only `isActive = true` artists.
 * - Admin callers can optionally pass `isActive = false` to list inactive ones.
 */
export async function listArtists(query: ListArtistsQuery, isAdmin = false) {
  const where: Record<string, unknown> = {};

  if (!isAdmin) {
    // Public: always filter to active only
    where['isActive'] = true;
  } else if (query.isActive !== undefined) {
    where['isActive'] = query.isActive === 'true';
  }

  return paginate<ArtistListItem>(
    prisma.artist,
    {
      where,
      select: artistPublicSelect,
      orderBy: { user: { name: 'asc' } },
    },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Get a single artist by slug with full portfolio and style tags.
 * Returns the artist regardless of `isActive` for admin callers; public
 * callers only get active artists.
 */
export async function getArtistBySlug(slug: string, isAdmin = false) {
  const artist = await prisma.artist.findUnique({
    where: { slug },
    select: artistDetailSelect,
  });

  if (!artist) {
    throw new AppError(404, 'NOT_FOUND', 'Artist not found');
  }

  if (!isAdmin && !artist.isActive) {
    throw new AppError(404, 'NOT_FOUND', 'Artist not found');
  }

  return artist;
}

/**
 * Get a single artist by internal ID (for admin / PATCH / DELETE).
 */
export async function getArtistById(id: string) {
  const artist = await prisma.artist.findUnique({
    where: { id },
    select: artistDetailSelect,
  });

  if (!artist) {
    throw new AppError(404, 'NOT_FOUND', 'Artist not found');
  }

  return artist;
}

/**
 * Create a new artist.
 * Creates the User and Artist records in a single transaction.
 */
export async function createArtist(input: CreateArtistBody) {
  // Check for duplicate email
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existingUser) {
    throw new AppError(409, 'CONFLICT', 'An account with this email already exists');
  }

  // Check for duplicate slug
  const existingArtist = await prisma.artist.findUnique({
    where: { slug: input.slug },
  });
  if (existingArtist) {
    throw new AppError(409, 'CONFLICT', 'An artist with this slug already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const artist = await prisma.$transaction(async (tx: PrismaTx) => {
    const user = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name.trim(),
        phone: input.phone ?? null,
        passwordHash,
        role: 'ARTIST',
      },
    });

    return tx.artist.create({
      data: {
        userId: user.id,
        slug: input.slug,
        bio: input.bio ?? null,
        profileImageUrl: input.profileImageUrl ?? null,
        portfolioImages: input.portfolioImages ?? [],
        bufferMinutes: input.bufferMinutes ?? 30,
        slotDuration: input.slotDuration ?? 90,
        commissionRate: input.commissionRate != null ? input.commissionRate : null,
        commissionType: input.commissionType ?? null,
      },
      select: artistDetailSelect,
    });
  });

  return artist;
}

/**
 * Update an artist profile.
 * An ARTIST may only update their own profile; ADMIN can update any.
 */
export async function updateArtist(
  id: string,
  input: UpdateArtistBody,
  requestingUserId: string,
  isAdmin: boolean,
) {
  const artist = await prisma.artist.findUnique({ where: { id } });
  if (!artist) throw new AppError(404, 'NOT_FOUND', 'Artist not found');

  // Ownership check — artists can only edit their own profile
  if (!isAdmin && artist.userId !== requestingUserId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only update your own profile');
  }

  const updated = await prisma.artist.update({
    where: { id },
    data: {
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.profileImageUrl !== undefined ? { profileImageUrl: input.profileImageUrl } : {}),
      ...(input.portfolioImages !== undefined ? { portfolioImages: input.portfolioImages } : {}),
      ...(input.bufferMinutes !== undefined ? { bufferMinutes: input.bufferMinutes } : {}),
      ...(input.slotDuration !== undefined ? { slotDuration: input.slotDuration } : {}),
      ...(input.commissionRate !== undefined ? { commissionRate: input.commissionRate } : {}),
      ...(input.commissionType !== undefined ? { commissionType: input.commissionType } : {}),
      ...(input.isActive !== undefined && isAdmin ? { isActive: input.isActive } : {}),
      // Update the linked user's name if provided
      ...(input.name !== undefined
        ? { user: { update: { name: input.name.trim() } } }
        : {}),
    },
    select: artistDetailSelect,
  });

  return updated;
}

/**
 * Soft-delete an artist (isActive = false).
 * Only ADMIN can delete.
 */
export async function deleteArtist(id: string) {
  const artist = await prisma.artist.findUnique({ where: { id } });
  if (!artist) throw new AppError(404, 'NOT_FOUND', 'Artist not found');

  await prisma.artist.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * Assign / replace style tags for an artist.
 * Deletes all existing ArtistStyle rows and inserts the new set atomically.
 */
export async function assignStyles(
  artistId: string,
  input: AssignStylesBody,
  requestingUserId: string,
  isAdmin: boolean,
) {
  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) throw new AppError(404, 'NOT_FOUND', 'Artist not found');

  if (!isAdmin && artist.userId !== requestingUserId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only update your own styles');
  }

  // Validate all styleIds exist
  if (input.styleIds.length > 0) {
    const styles = await prisma.tattooStyle.findMany({
      where: { id: { in: input.styleIds } },
      select: { id: true },
    });
    if (styles.length !== input.styleIds.length) {
      throw new AppError(400, 'INVALID_STYLE_IDS', 'One or more style IDs are invalid');
    }
  }

  await prisma.$transaction([
    prisma.artistStyle.deleteMany({ where: { artistId } }),
    ...(input.styleIds.length > 0
      ? [
          prisma.artistStyle.createMany({
            data: input.styleIds.map((styleId: string) => ({ artistId, styleId })),
          }),
        ]
      : []),
  ]);
}

/**
 * Get weekly availability for a single artist.
 */
export async function getAvailability(artistId: string) {
  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) throw new AppError(404, 'NOT_FOUND', 'Artist not found');

  return prisma.artistAvailability.findMany({
    where: { artistId, isActive: true },
    orderBy: { dayOfWeek: 'asc' },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      breakStart: true,
      breakEnd: true,
      isActive: true,
    },
  });
}

/**
 * Replace all availability windows for an artist.
 * Runs in a transaction: delete all existing, then insert the new set.
 */
export async function setAvailability(
  artistId: string,
  input: SetAvailabilityBody,
  requestingUserId: string,
  isAdmin: boolean,
) {
  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) throw new AppError(404, 'NOT_FOUND', 'Artist not found');

  if (!isAdmin && artist.userId !== requestingUserId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only update your own availability');
  }

  await prisma.$transaction([
    prisma.artistAvailability.deleteMany({ where: { artistId } }),
    ...(input.availability.length > 0
      ? [
          prisma.artistAvailability.createMany({
            data: input.availability.map((d: SetAvailabilityBody['availability'][number]) => ({
              artistId,
              dayOfWeek: d.dayOfWeek,
              startTime: d.startTime,
              endTime: d.endTime,
              breakStart: d.breakStart ?? null,
              breakEnd: d.breakEnd ?? null,
              isActive: d.isActive ?? true,
            })),
          }),
        ]
      : []),
  ]);

  return getAvailability(artistId);
}

/**
 * Atomically replace the complete list of services an artist offers.
 *
 * - ADMIN only (enforced at route level; this function does NOT check ownership).
 * - Validates all serviceIds exist and are active before making any changes.
 * - Deletes all existing ArtistService rows for the artist, then inserts the new set.
 * - Supports per-artist price overrides via `customPrice` (null = use Service.priceFrom).
 * - Passing an empty array removes all service assignments.
 *
 * Returns the updated list of ArtistService records for the artist.
 */
export async function setArtistServices(
  artistId: string,
  input: SetArtistServicesBody,
) {
  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { id: true },
  });
  if (!artist) throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist not found');

  // Validate all serviceIds exist and are active
  if (input.services.length > 0) {
    const serviceIds = input.services.map((s) => s.serviceId);
    const found = await prisma.service.findMany({
      where:  { id: { in: serviceIds }, isActive: true },
      select: { id: true },
    });
    if (found.length !== serviceIds.length) {
      const foundIds = new Set(found.map((s) => s.id));
      const bad = serviceIds.filter((id) => !foundIds.has(id));
      throw new AppError(
        400,
        'INVALID_SERVICE_IDS',
        `One or more service IDs are invalid or inactive: ${bad.join(', ')}`,
      );
    }
  }

  // Replace atomically: delete all existing rows, then insert the new set
  await prisma.$transaction(async (tx) => {
    await tx.artistService.deleteMany({ where: { artistId } });
    if (input.services.length > 0) {
      await tx.artistService.createMany({
        data: input.services.map((s) => ({
          artistId,
          serviceId:   s.serviceId,
          customPrice: s.customPrice ?? null,
        })),
      });
    }
  });

  // Return the updated roster so the caller gets fresh data
  return prisma.artistService.findMany({
    where:   { artistId },
    orderBy: { service: { name: 'asc' } },
    select:  {
      serviceId:   true,
      customPrice: true,
      service: {
        select: {
          id:             true,
          name:           true,
          durationMinutes: true,
          priceFrom:      true,
          isActive:       true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  });
}

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/** Lean public listing — no internal data. */
const artistPublicSelect = {
  id: true,
  slug: true,
  bio: true,
  profileImageUrl: true,
  portfolioImages: true,
  bufferMinutes: true,
  slotDuration: true,
  isActive: true,
  user: {
    select: { id: true, name: true, email: true },
  },
  styles: {
    select: {
      style: { select: { id: true, name: true } },
    },
  },
} as const;

/** Full detail — for single-artist view and admin operations. */
const artistDetailSelect = {
  ...artistPublicSelect,
  commissionRate: true,
  commissionType: true,
  availability: {
    where: { isActive: true },
    orderBy: { dayOfWeek: 'asc' as const },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      breakStart: true,
      breakEnd: true,
      isActive: true,
    },
  },
} as const;

// ─── Inferred return types (for controller typing) ────────────────────────────

/** Type for a single item returned by the public artist list. */
export type ArtistListItem = Prisma.ArtistGetPayload<{ select: typeof artistPublicSelect }>;

/** Type for the full artist detail response (single artist / admin ops). */
export type ArtistDetail = Prisma.ArtistGetPayload<{ select: typeof artistDetailSelect }>;

/** @deprecated Use ArtistDetail instead. Kept for backwards compatibility. */
export type ArtistPublic = ArtistDetail;
