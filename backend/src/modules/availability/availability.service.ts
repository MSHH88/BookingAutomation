/**
 * Availability service — Step 1.12
 *
 * Business logic for the Availability Management API.
 *
 * ── Weekly schedule (ArtistAvailability) ─────────────────────────────────────
 *
 *   listSchedule   — read artist's 0–7 day weekly recurring schedule
 *   upsertSchedule — atomic full-replace: deleteMany + createMany in one transaction
 *
 * ── Availability blocks (AvailabilityBlock) ───────────────────────────────────
 *
 *   listBlocks   — paginated list, optional date-range filter
 *   createBlock  — add a date-specific block (holiday, vacation, early close, etc.)
 *   deleteBlock  — remove a block (ARTIST: own only; ADMIN: any)
 *
 * ── Slot computation (PUBLIC — used by booking widget) ────────────────────────
 *
 *   getAvailableSlots — deterministic algorithm:
 *     1. Load artist (slotDuration, bufferMinutes)
 *     2. If serviceId provided, use service.durationMinutes
 *     3. Determine day-of-week from the requested date (UTC)
 *     4. Look up ArtistAvailability for that day-of-week
 *     5. Generate candidate slots from startTime → endTime
 *     6. Remove slots that overlap the artist's break window
 *     7. Remove slots that overlap any AvailabilityBlock on that date
 *     8. Remove slots that overlap any CONFIRMED / RESCHEDULED Booking
 *     9. Return remaining { startAt, endAt } pairs as ISO UTC strings
 *
 * Timezone note:
 *   startTime / endTime strings in ArtistAvailability are treated as UTC in
 *   Phase 1. Phase 2 will layer in per-studio timezone via StudioSettings.
 *
 * Role scoping:
 *   ARTIST — resolves own artistId via userId → Artist lookup.
 *   ADMIN  — uses artistId supplied in body / query.
 */
import { Prisma } from '@prisma/client';

import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import { logger }   from '../../utils/logger';
import type {
  ListScheduleQuery,
  UpsertScheduleBody,
  ListBlocksQuery,
  CreateBlockBody,
  GetSlotsQuery,
  ScheduleDay,
  AvailabilityBlockItem,
  AvailableSlot,
} from './availability.schema';

// ─── Actor type ────────────────────────────────────────────────────────────────

type ActorRole = 'ADMIN' | 'ARTIST';

// ─── Prisma select shapes ──────────────────────────────────────────────────────

const scheduleDaySelect = {
  id:         true,
  artistId:   true,
  dayOfWeek:  true,
  startTime:  true,
  endTime:    true,
  breakStart: true,
  breakEnd:   true,
  isActive:   true,
} satisfies Prisma.ArtistAvailabilitySelect;

const blockItemSelect = {
  id:        true,
  artistId:  true,
  startAt:   true,
  endAt:     true,
  reason:    true,
  createdAt: true,
} satisfies Prisma.AvailabilityBlockSelect;

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Resolve the artist profile id for an ARTIST actor.
 * Throws 404 if the user has no artist profile.
 */
async function resolveOwnArtistId(userId: string): Promise<string> {
  const artist = await prisma.artist.findUnique({
    where:  { userId },
    select: { id: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist profile not found for this user');
  }
  return artist.id;
}

/**
 * Determine which artistId to operate on.
 *
 *   ARTIST — resolves own profile; supplied artistId is ignored.
 *   ADMIN  — uses supplied artistId; throws 400 when not supplied.
 */
async function resolveTargetArtistId(
  supplied:  string | undefined,
  actorId:   string,
  actorRole: ActorRole,
): Promise<string> {
  if (actorRole === 'ARTIST') {
    return resolveOwnArtistId(actorId);
  }
  if (!supplied) {
    throw new AppError(400, 'MISSING_ARTIST_ID', 'artistId is required for ADMIN requests');
  }
  return supplied;
}

/**
 * Parse an "HH:MM" string to total minutes from midnight.
 */
function toMinutes(time: string): number {
  return parseInt(time.slice(0, 2), 10) * 60 + parseInt(time.slice(3, 5), 10);
}

/**
 * Return a new Date offset from a base Date by the given number of minutes.
 */
function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

/**
 * Check whether two half-open [start, end) intervals overlap.
 */
function overlaps(
  aStart: Date, aEnd: Date,
  bStart: Date, bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// ─── 1. Weekly schedule ────────────────────────────────────────────────────────

/**
 * List the weekly recurring schedule for an artist.
 * Results are ordered by dayOfWeek ascending (0 = Sunday … 6 = Saturday).
 */
export async function listSchedule(
  query:     ListScheduleQuery,
  actorId:   string,
  actorRole: ActorRole,
): Promise<ScheduleDay[]> {
  const artistId = await resolveTargetArtistId(query.artistId, actorId, actorRole);

  return prisma.artistAvailability.findMany({
    where:   { artistId },
    select:  scheduleDaySelect,
    orderBy: { dayOfWeek: 'asc' },
  });
}

/**
 * Full-replace upsert for an artist's weekly schedule.
 *
 * Deletes all existing rows for the artist and inserts the new set in a single
 * atomic Prisma transaction. Callers supply up to 7 entries (one per day).
 */
export async function upsertSchedule(
  body:      UpsertScheduleBody,
  actorId:   string,
  actorRole: ActorRole,
): Promise<ScheduleDay[]> {
  const artistId = await resolveTargetArtistId(body.artistId, actorId, actorRole);

  // Confirm the artist record exists before modifying the schedule.
  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { id: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist '${artistId}' not found`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.artistAvailability.deleteMany({ where: { artistId } });
    await tx.artistAvailability.createMany({
      data: body.schedule.map((entry) => ({
        artistId,
        dayOfWeek:  entry.dayOfWeek,
        startTime:  entry.startTime,
        endTime:    entry.endTime,
        breakStart: entry.breakStart ?? null,
        breakEnd:   entry.breakEnd   ?? null,
        isActive:   entry.isActive,
      })),
    });
  });

  logger.info('availability.schedule.upserted', { artistId, dayCount: body.schedule.length });

  return prisma.artistAvailability.findMany({
    where:   { artistId },
    select:  scheduleDaySelect,
    orderBy: { dayOfWeek: 'asc' },
  });
}

// ─── 2. Availability blocks ────────────────────────────────────────────────────

/**
 * List availability blocks for an artist, optionally filtered by a date range.
 *
 * The `from` / `to` query params filter on the block's `startAt` field.
 */
export async function listBlocks(
  query:     ListBlocksQuery,
  actorId:   string,
  actorRole: ActorRole,
): Promise<PaginatedResult<AvailabilityBlockItem>> {
  const artistId = await resolveTargetArtistId(query.artistId, actorId, actorRole);

  const where: Prisma.AvailabilityBlockWhereInput = { artistId };

  if (query.from || query.to) {
    const startAtFilter: Prisma.DateTimeFilter = {};
    if (query.from) {
      startAtFilter.gte = new Date(query.from);
    }
    if (query.to) {
      const to = new Date(query.to);
      to.setUTCHours(23, 59, 59, 999);
      startAtFilter.lte = to;
    }
    where.startAt = startAtFilter;
  }

  return paginate<AvailabilityBlockItem>(
    prisma.availabilityBlock,
    {
      where,
      select:  blockItemSelect,
      orderBy: { startAt: 'asc' },
    },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Create a new availability block (e.g. holiday, early close, vacation).
 */
export async function createBlock(
  body:      CreateBlockBody,
  actorId:   string,
  actorRole: ActorRole,
): Promise<AvailabilityBlockItem> {
  const artistId = await resolveTargetArtistId(body.artistId, actorId, actorRole);

  // Confirm the artist record exists.
  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { id: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist '${artistId}' not found`);
  }

  const block = await prisma.availabilityBlock.create({
    data: {
      artistId,
      startAt: new Date(body.startAt),
      endAt:   new Date(body.endAt),
      reason:  body.reason ?? null,
    },
    select: blockItemSelect,
  });

  logger.info('availability.block.created', { blockId: block.id, artistId });

  return block;
}

/**
 * Delete an availability block.
 *
 * ARTIST actors can only delete their own blocks.
 * ADMIN actors can delete any block.
 */
export async function deleteBlock(
  blockId:   string,
  actorId:   string,
  actorRole: ActorRole,
): Promise<void> {
  const block = await prisma.availabilityBlock.findUnique({
    where:  { id: blockId },
    select: { id: true, artistId: true, artist: { select: { userId: true } } },
  });

  if (!block) {
    throw new AppError(404, 'BLOCK_NOT_FOUND', 'Availability block not found');
  }

  if (actorRole === 'ARTIST' && block.artist.userId !== actorId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only delete your own availability blocks');
  }

  await prisma.availabilityBlock.delete({ where: { id: blockId } });

  logger.info('availability.block.deleted', { blockId, artistId: block.artistId });
}

// ─── 3. Available slot computation ────────────────────────────────────────────

/**
 * Compute available booking slots for an artist on a specific calendar date.
 *
 * This is the core scheduling engine used by the public booking widget.
 * It is stateless and purely deterministic: given the same inputs it always
 * produces the same output.
 *
 * Slot duration precedence:
 *   serviceId provided → service.durationMinutes
 *   otherwise          → artist.slotDuration
 */
export async function getAvailableSlots(
  query: GetSlotsQuery,
): Promise<AvailableSlot[]> {
  const { artistId, date, serviceId } = query;

  // ── 1. Load artist ─────────────────────────────────────────────────────────
  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { id: true, slotDuration: true, bufferMinutes: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist '${artistId}' not found`);
  }

  // ── 2. Resolve slot duration ───────────────────────────────────────────────
  let slotDurationMins = artist.slotDuration;

  if (serviceId) {
    const service = await prisma.service.findUnique({
      where:  { id: serviceId },
      select: { id: true, durationMinutes: true },
    });
    if (!service) {
      throw new AppError(404, 'SERVICE_NOT_FOUND', `Service '${serviceId}' not found`);
    }
    slotDurationMins = service.durationMinutes;
  }

  const bufferMins = artist.bufferMinutes;
  const stepMins   = slotDurationMins + bufferMins; // advance per slot

  // ── 3. Parse date (UTC midnight) and derive day-of-week ───────────────────
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const dayAnchor  = new Date(Date.UTC(y, m - 1, d)); // 00:00:00 UTC on that date
  const dayOfWeek  = dayAnchor.getUTCDay();            // 0 = Sunday … 6 = Saturday

  // ── 4. Load schedule for this day-of-week ─────────────────────────────────
  const schedule = await prisma.artistAvailability.findUnique({
    where:  { artistId_dayOfWeek: { artistId, dayOfWeek } },
    select: scheduleDaySelect,
  });

  if (!schedule || !schedule.isActive) {
    return [];
  }

  // ── 5. Generate candidate slots ────────────────────────────────────────────
  const startMins = toMinutes(schedule.startTime);
  const endMins   = toMinutes(schedule.endTime);

  const candidates: Array<{ startAt: Date; endAt: Date }> = [];
  let cur = startMins;

  while (cur + slotDurationMins <= endMins) {
    candidates.push({
      startAt: addMinutes(dayAnchor, cur),
      endAt:   addMinutes(dayAnchor, cur + slotDurationMins),
    });
    cur += stepMins;
  }

  if (candidates.length === 0) {
    return [];
  }

  // ── 6. Remove slots that overlap the artist's break window ─────────────────
  const breakStartMins = schedule.breakStart ? toMinutes(schedule.breakStart) : null;
  const breakEndMins   = schedule.breakEnd   ? toMinutes(schedule.breakEnd)   : null;

  const afterBreak =
    breakStartMins !== null && breakEndMins !== null
      ? candidates.filter((slot) => {
          const s = slot.startAt.getUTCHours() * 60 + slot.startAt.getUTCMinutes();
          const e = s + slotDurationMins;
          // Overlaps break if: slot starts before break ends AND slot ends after break starts
          return !(s < breakEndMins && e > breakStartMins);
        })
      : candidates;

  if (afterBreak.length === 0) {
    return [];
  }

  // ── 7 & 8. Load blocks + bookings, filter overlapping slots ───────────────
  const dayStart = dayAnchor;
  const dayEnd   = new Date(dayAnchor.getTime() + 24 * 60 * 60_000);

  const [blocks, bookings] = await Promise.all([
    prisma.availabilityBlock.findMany({
      where: {
        artistId,
        startAt: { lt: dayEnd },
        endAt:   { gt: dayStart },
      },
      select: { startAt: true, endAt: true },
    }),
    prisma.booking.findMany({
      where: {
        artistId,
        status:  { in: ['CONFIRMED', 'RESCHEDULED'] },
        startAt: { lt: dayEnd },
        endAt:   { gt: dayStart },
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  const available = afterBreak.filter((slot) => {
    const noBlockConflict   = blocks.every(
      (b) => !overlaps(slot.startAt, slot.endAt, b.startAt, b.endAt),
    );
    const noBookingConflict = bookings.every(
      (b) => !overlaps(slot.startAt, slot.endAt, b.startAt, b.endAt),
    );
    return noBlockConflict && noBookingConflict;
  });

  return available.map((slot) => ({
    startAt: slot.startAt.toISOString(),
    endAt:   slot.endAt.toISOString(),
  }));
}
