/**
 * Locations service — Phase 9.1
 *
 * CRUD operations for Location records.
 * All queries are scoped to the calling tenant.
 *
 * Tests: locations.test.ts
 */

import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { logger }   from '../../utils/logger';
import type {
  CreateLocationBody,
  UpdateLocationBody,
} from './locations.schema';

// ─── list ─────────────────────────────────────────────────────────────────────

export async function listLocations(
  tenantId: string | null,
  isActive?: boolean,
) {
  return prisma.location.findMany({
    where: {
      tenantId,
      ...(isActive !== undefined ? { isActive } : {}),
    },
    orderBy: { name: 'asc' },
  });
}

// ─── getById ──────────────────────────────────────────────────────────────────

export async function getLocationById(
  tenantId: string | null,
  id: string,
) {
  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) {
    throw new AppError(404, 'LOCATION_NOT_FOUND', `Location ${id} not found`);
  }
  if (location.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Location does not belong to this tenant');
  }
  return location;
}

// ─── create ───────────────────────────────────────────────────────────────────

export async function createLocation(
  tenantId: string | null,
  body: CreateLocationBody,
) {
  const location = await prisma.location.create({
    data: {
      tenantId,
      name:     body.name,
      address:  body.address  ?? null,
      city:     body.city     ?? null,
      postcode: body.postcode ?? null,
      country:  body.country  ?? null,
      phone:    body.phone    ?? null,
      timezone: body.timezone,
      isActive: body.isActive,
    },
  });

  logger.info('Location created', { locationId: location.id, tenantId });
  return location;
}

// ─── update ───────────────────────────────────────────────────────────────────

export async function updateLocation(
  tenantId: string | null,
  id: string,
  body: UpdateLocationBody,
) {
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'LOCATION_NOT_FOUND', `Location ${id} not found`);
  }
  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Location does not belong to this tenant');
  }

  const location = await prisma.location.update({
    where: { id },
    data: {
      ...(body.name     !== undefined ? { name:     body.name     } : {}),
      ...(body.address  !== undefined ? { address:  body.address  } : {}),
      ...(body.city     !== undefined ? { city:     body.city     } : {}),
      ...(body.postcode !== undefined ? { postcode: body.postcode } : {}),
      ...(body.country  !== undefined ? { country:  body.country  } : {}),
      ...(body.phone    !== undefined ? { phone:    body.phone    } : {}),
      ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });

  logger.info('Location updated', { locationId: id, tenantId });
  return location;
}

// ─── delete ───────────────────────────────────────────────────────────────────

export async function deleteLocation(
  tenantId: string | null,
  id: string,
) {
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'LOCATION_NOT_FOUND', `Location ${id} not found`);
  }
  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Location does not belong to this tenant');
  }

  await prisma.location.delete({ where: { id } });
  logger.info('Location deleted', { locationId: id, tenantId });
}
