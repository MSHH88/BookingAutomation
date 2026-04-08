/**
 * Settings service — Step 1.29
 *
 * Business logic for the public Studio Settings API (/api/settings).
 *
 * Design decisions:
 *  - Two Prisma select shapes:
 *      publicSettingsSelect — safe, customer-facing subset (no financial details)
 *      fullSettingsSelect   — complete row returned to ADMIN after PATCH
 *  - Redis cache (TTL = 5 minutes) for the public GET endpoint, so a DB query
 *    is not executed on every email render, page load, or booking confirmation.
 *    Cache is invalidated whenever PATCH /api/settings succeeds.
 *  - Redis failures are non-fatal (fire-and-forget pattern): the service falls
 *    through to the database on a cache read failure, and logs-but-continues on
 *    a cache write or delete failure.  A Redis outage never surfaces as a 5xx.
 *  - `updateSettings` mirrors the admin service upsert logic so that both
 *    /api/admin/settings and /api/settings write to the same singleton row.
 *
 * Endpoints covered:
 *   getCachedSettings   — GET  /api/settings (public)
 *   updateSettings      — PATCH /api/settings (ADMIN)
 *
 * Total: 18 unit tests across 2 describes
 */
import { Prisma } from '@prisma/client';

import { prisma }    from '../../lib/prisma';
import { getRedis }  from '../../lib/redis';
import { AppError }  from '../../errors/AppError';
import { logger }    from '../../utils/logger';
import type { UpdateSettingsBody } from './settings.schema';

// ─── Cache configuration ──────────────────────────────────────────────────────

const CACHE_KEY = 'settings:public';
const CACHE_TTL = 300; // seconds (5 minutes)

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/**
 * Public subset of StudioSettings — safe to return to unauthenticated callers.
 * Excludes deposit amounts, commission rates, and other internal financial data.
 */
const publicSettingsSelect = {
  id:                     true,
  studioName:             true,
  studioEmail:            true,
  studioPhone:            true,
  studioAddress:          true,
  studioTimezone:         true,
  currency:               true,
  cancellationPolicyText: true,
  googleReviewUrl:        true,
  bookingPageUrl:         true,
  updatedAt:              true,
} satisfies Prisma.StudioSettingsSelect;

/** Full row returned to the admin after a successful PATCH. */
const fullSettingsSelect = {
  id:                     true,
  studioName:             true,
  studioEmail:            true,
  studioPhone:            true,
  studioAddress:          true,
  studioTimezone:         true,
  currency:               true,
  depositPercentage:      true,
  depositFixedAmount:     true,
  cancellationHours:      true,
  cancellationFeePercent: true,
  cancellationPolicyText: true,
  maxCoversPerSlot:       true,
  slotIntervalMinutes:    true,
  googleReviewUrl:        true,
  bookingPageUrl:         true,
  updatedAt:              true,
} satisfies Prisma.StudioSettingsSelect;

// ─── Exported types ───────────────────────────────────────────────────────────

export type PublicSettingsResult = Prisma.StudioSettingsGetPayload<{
  select: typeof publicSettingsSelect;
}>;

export type FullSettingsResult = Prisma.StudioSettingsGetPayload<{
  select: typeof fullSettingsSelect;
}>;

// ─── getCachedSettings ────────────────────────────────────────────────────────

/**
 * Returns the public-safe studio settings.
 *
 * Cache strategy:
 *  1. Attempt to read from Redis using CACHE_KEY.
 *  2. On a cache hit, parse and return the JSON-encoded value.
 *  3. On a miss (or Redis error), query the DB and store the result for
 *     CACHE_TTL seconds.
 *  4. Returns null when the studio settings row has not yet been seeded.
 */
export async function getCachedSettings(): Promise<PublicSettingsResult | null> {
  const redis = getRedis();

  // 1 — Try the cache
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached !== null) {
      return JSON.parse(cached) as PublicSettingsResult;
    }
  } catch (err) {
    logger.warn('[Settings] Redis GET failed, falling through to DB', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2 — Cache miss: fetch from DB
  const settings = await prisma.studioSettings.findFirst({
    select: publicSettingsSelect,
  });

  // 3 — Populate the cache (non-fatal on error)
  if (settings !== null) {
    try {
      await redis.set(CACHE_KEY, JSON.stringify(settings), 'EX', CACHE_TTL);
    } catch (err) {
      logger.warn('[Settings] Redis SET failed, continuing without cache', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return settings;
}

// ─── updateSettings ───────────────────────────────────────────────────────────

/**
 * Creates or updates the studio settings singleton row.
 *
 * - If a row exists it is updated with the supplied fields; absent fields are
 *   left unchanged.
 * - If no row exists yet (fresh deployment), a new row is created and
 *   `studioName` is required.
 * - On success the Redis cache entry is deleted so the next GET reflects the
 *   new values immediately.
 *
 * @throws AppError 400 — studioName required when creating for the first time.
 */
export async function updateSettings(
  body: UpdateSettingsBody,
): Promise<FullSettingsResult> {
  const existing = await prisma.studioSettings.findFirst({
    select: { id: true },
  });

  let result: FullSettingsResult;

  if (existing) {
    result = await prisma.studioSettings.update({
      where:  { id: existing.id },
      data:   body as Prisma.StudioSettingsUpdateInput,
      select: fullSettingsSelect,
    });
  } else {
    if (!body.studioName) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'studioName is required when creating studio settings for the first time',
      );
    }

    result = await prisma.studioSettings.create({
      data:   body as Prisma.StudioSettingsCreateInput,
      select: fullSettingsSelect,
    });
  }

  // Invalidate the public cache so GET /api/settings returns fresh data
  try {
    const redis = getRedis();
    await redis.del(CACHE_KEY);
  } catch (err) {
    logger.warn('[Settings] Redis DEL failed after update, cache may be stale', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return result;
}
