/**
 * Rota service — Phase 6.1
 *
 * Business logic for the Staff Rota / Shift Scheduling module.
 *
 * ── What this module does ───────────────────────────────────────────────────
 *
 *  listShifts(tenantId, artistId?)
 *    Returns all shifts for the tenant, optionally filtered by artistId.
 *
 *  createShift(tenantId, body)
 *    Creates a new recurring shift for an artist.
 *    Validates that the artist belongs to the same tenant.
 *
 *  getShift(id, tenantId)
 *    Returns a single shift by ID, including its overrides.
 *    Throws 404 if not found or tenant mismatch.
 *
 *  updateShift(id, tenantId, body)
 *    Partially updates a shift. Throws 404 if not found.
 *
 *  deleteShift(id, tenantId)
 *    Hard-deletes a shift and cascades to overrides.
 *    Throws 404 if not found.
 *
 *  createOverride(shiftId, tenantId, body)
 *    Creates or replaces a one-off override for a specific date.
 *    Use isOff=true to mark the day as off, or provide startTime/endTime
 *    to modify the hours for that day only.
 *
 *  getWeekRota(tenantId, from)
 *    Returns all artists' schedules for the 7-day week starting on `from`.
 *    Merges recurring shifts with date-specific overrides.
 *    Used to populate the rota grid in the CRM.
 */
import type { Prisma } from '@prisma/client';

import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { logger }   from '../../utils/logger';
import type {
  CreateShiftBody,
  UpdateShiftBody,
  CreateOverrideBody,
} from './rota.schema';

// ─── Prisma select shapes ─────────────────────────────────────────────────────

const shiftSelect = {
  id:             true,
  tenantId:       true,
  artistId:       true,
  dayOfWeek:      true,
  startTime:      true,
  endTime:        true,
  isRecurring:    true,
  effectiveFrom:  true,
  effectiveUntil: true,
  createdAt:      true,
  updatedAt:      true,
  overrides: {
    select: {
      id:        true,
      date:      true,
      startTime: true,
      endTime:   true,
      isOff:     true,
      createdAt: true,
    },
  },
  artist: {
    select: {
      id:   true,
      slug: true,
      user: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ShiftSelect;

// ─── listShifts ───────────────────────────────────────────────────────────────

export async function listShifts(tenantId: string | null, artistId?: string) {
  const where: Prisma.ShiftWhereInput = {
    tenantId,
    ...(artistId ? { artistId } : {}),
  };

  return prisma.shift.findMany({
    where,
    select: shiftSelect,
    orderBy: [{ artistId: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

// ─── createShift ──────────────────────────────────────────────────────────────

export async function createShift(tenantId: string | null, body: CreateShiftBody) {
  // Verify artist belongs to this tenant
  const artist = await prisma.artist.findUnique({
    where: { id: body.artistId },
    select: { id: true, tenantId: true },
  });

  if (!artist) {
    throw new AppError(404, 'NOT_FOUND', 'Artist not found');
  }

  if (artist.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Artist does not belong to this tenant');
  }

  const shift = await prisma.shift.create({
    data: {
      tenantId,
      artistId:      body.artistId,
      dayOfWeek:     body.dayOfWeek,
      startTime:     body.startTime,
      endTime:       body.endTime,
      isRecurring:   body.isRecurring ?? true,
      effectiveFrom: new Date(body.effectiveFrom),
      effectiveUntil: body.effectiveUntil ? new Date(body.effectiveUntil) : null,
    },
    select: shiftSelect,
  });

  logger.info('Shift created', { shiftId: shift.id, artistId: body.artistId });
  return shift;
}

// ─── getShift ─────────────────────────────────────────────────────────────────

export async function getShift(id: string, tenantId: string | null) {
  const shift = await prisma.shift.findUnique({
    where: { id },
    select: shiftSelect,
  });

  if (!shift || shift.tenantId !== tenantId) {
    throw new AppError(404, 'NOT_FOUND', 'Shift not found');
  }

  return shift;
}

// ─── updateShift ──────────────────────────────────────────────────────────────

export async function updateShift(id: string, tenantId: string | null, body: UpdateShiftBody) {
  const existing = await prisma.shift.findUnique({
    where: { id },
    select: { id: true, tenantId: true, startTime: true, endTime: true },
  });

  if (!existing || existing.tenantId !== tenantId) {
    throw new AppError(404, 'NOT_FOUND', 'Shift not found');
  }

  const data: Prisma.ShiftUpdateInput = {};

  if (body.dayOfWeek !== undefined)   data.dayOfWeek     = body.dayOfWeek;
  if (body.startTime !== undefined)   data.startTime     = body.startTime;
  if (body.endTime !== undefined)     data.endTime       = body.endTime;
  if (body.isRecurring !== undefined) data.isRecurring   = body.isRecurring;
  if (body.effectiveFrom !== undefined) data.effectiveFrom = new Date(body.effectiveFrom);
  if ('effectiveUntil' in body) {
    data.effectiveUntil = body.effectiveUntil ? new Date(body.effectiveUntil) : null;
  }

  return prisma.shift.update({
    where: { id },
    data,
    select: shiftSelect,
  });
}

// ─── deleteShift ──────────────────────────────────────────────────────────────

export async function deleteShift(id: string, tenantId: string | null) {
  const existing = await prisma.shift.findUnique({
    where: { id },
    select: { id: true, tenantId: true },
  });

  if (!existing || existing.tenantId !== tenantId) {
    throw new AppError(404, 'NOT_FOUND', 'Shift not found');
  }

  await prisma.shift.delete({ where: { id } });
  logger.info('Shift deleted', { shiftId: id });
}

// ─── createOverride ───────────────────────────────────────────────────────────

export async function createOverride(
  shiftId:  string,
  tenantId: string | null,
  body:     CreateOverrideBody,
) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { id: true, tenantId: true },
  });

  if (!shift || shift.tenantId !== tenantId) {
    throw new AppError(404, 'NOT_FOUND', 'Shift not found');
  }

  const date = new Date(body.date);

  // Upsert: one override per (shiftId, date) pair
  const override = await prisma.shiftOverride.upsert({
    where:  { shiftId_date: { shiftId, date } },
    create: {
      shiftId,
      date,
      isOff:     body.isOff ?? false,
      startTime: body.isOff ? null : (body.startTime ?? null),
      endTime:   body.isOff ? null : (body.endTime   ?? null),
    },
    update: {
      isOff:     body.isOff ?? false,
      startTime: body.isOff ? null : (body.startTime ?? null),
      endTime:   body.isOff ? null : (body.endTime   ?? null),
    },
    select: {
      id:        true,
      shiftId:   true,
      date:      true,
      startTime: true,
      endTime:   true,
      isOff:     true,
      createdAt: true,
    },
  });

  logger.info('Shift override created/updated', { shiftId, date: body.date });
  return override;
}

// ─── getWeekRota ──────────────────────────────────────────────────────────────

/**
 * Returns the rota grid for the 7-day week starting on `from` (inclusive).
 *
 * For each artist the response contains one entry per day of the week with:
 *  - the base shift for that day (if any)
 *  - any overrides on specific dates within the week
 *
 * The override takes precedence over the base shift for its date.
 */
export async function getWeekRota(tenantId: string | null, from: string) {
  const startDate = new Date(from);
  const endDate   = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  // Get all shifts for the tenant that are effective during the week
  const shifts = await prisma.shift.findMany({
    where: {
      tenantId,
      effectiveFrom: { lte: endDate },
      OR: [
        { effectiveUntil: null },
        { effectiveUntil: { gte: startDate } },
      ],
    },
    select: {
      id:             true,
      artistId:       true,
      dayOfWeek:      true,
      startTime:      true,
      endTime:        true,
      effectiveFrom:  true,
      effectiveUntil: true,
      artist: {
        select: {
          id:   true,
          slug: true,
          user: { select: { id: true, name: true } },
        },
      },
      overrides: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
        select: {
          id:        true,
          date:      true,
          startTime: true,
          endTime:   true,
          isOff:     true,
        },
      },
    },
    orderBy: [{ artistId: 'asc' }, { dayOfWeek: 'asc' }],
  });

  type Override = (typeof shifts)[0]['overrides'][0];
  type ArtistInfo = (typeof shifts)[0]['artist'];

  // Build rota grid: group by artistId, then by day of week (0-6)
  const grid: Record<string, {
    artist: ArtistInfo;
    days: Record<number, {
      shiftId:    string | null;
      startTime:  string | null;
      endTime:    string | null;
      override:   Override | null;
    }>;
  }> = {};

  // Compute dayOfWeek for each date in the window
  const weekDays: Record<number, Date> = {};
  for (let i = 0; i <= 6; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    weekDays[dow] = d;
  }

  for (const shift of shifts) {
    const { artistId, artist } = shift;

    if (!grid[artistId]) {
      grid[artistId] = { artist, days: {} };
    }

    // Find override for the specific date corresponding to this dayOfWeek
    const dayDate = weekDays[shift.dayOfWeek];
    const override: Override | null = dayDate
      ? shift.overrides.find((o) => {
          const od = new Date(o.date);
          return (
            od.getFullYear() === dayDate.getFullYear() &&
            od.getMonth()    === dayDate.getMonth()    &&
            od.getDate()     === dayDate.getDate()
          );
        }) ?? null
      : null;

    grid[artistId]!.days[shift.dayOfWeek] = {
      shiftId:   shift.id,
      startTime: override?.isOff ? null : (override?.startTime ?? shift.startTime),
      endTime:   override?.isOff ? null : (override?.endTime   ?? shift.endTime),
      override,
    };
  }

  return {
    weekStart: from,
    weekEnd:   endDate.toISOString().slice(0, 10),
    artists:   Object.values(grid),
  };
}
