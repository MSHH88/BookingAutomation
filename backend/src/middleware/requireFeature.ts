/**
 * requireFeature middleware factory.
 *
 * Gates any route behind a feature flag. Checks the DB (FeatureFlag table)
 * with a 60-second Redis cache. Falls back to static per-business-type
 * defaults when neither is available.
 *
 * Usage:
 *   router.post('/leads', requireFeature('LEAD_CAPTURE_ENABLED'), ctrl.create);
 *   router.get('/waitlist', requireFeature('WAITING_LIST_ENABLED'), ctrl.list);
 */
import { Request, Response, NextFunction } from 'express';

import { prisma } from '../lib/prisma';
import { getRedis } from '../lib/redis';
import { AppError } from '../errors/AppError';
import type { FeatureFlagKey } from '../config/businessType';
import { getDefaultFlags, BUSINESS_TYPES, activeBusinessType } from '../config/businessType';
import type { BusinessType } from '../config/businessType';

const CACHE_TTL_SECONDS = 60;

/**
 * Looks up a feature flag value, using Redis as a 60-second cache
 * and the DB (FeatureFlag table) as the source of truth.
 * Falls back to static defaults if the DB row does not exist.
 */
export async function isFeatureEnabled(flag: FeatureFlagKey): Promise<boolean> {
  const redis = getRedis();
  const cacheKey = `feature:${flag}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return cached === '1';
    }
  } catch {
    // Redis unavailable — fall through to DB
  }

  // DB lookup
  let enabled: boolean;
  try {
    const row = await prisma.featureFlag.findUnique({ where: { key: flag } });
    if (row !== null) {
      enabled = row.isEnabled;
    } else {
      // No DB row — fall back to static defaults
      const rawType = process.env['BUSINESS_TYPE'];
      const type: BusinessType = (BUSINESS_TYPES as readonly string[]).includes(rawType ?? '')
        ? (rawType as BusinessType)
        : activeBusinessType;
      enabled = getDefaultFlags(type)[flag] ?? false;
    }
  } catch {
    // DB unavailable — fall back to static defaults
    const rawType = process.env['BUSINESS_TYPE'];
    const type: BusinessType = (BUSINESS_TYPES as readonly string[]).includes(rawType ?? '')
      ? (rawType as BusinessType)
      : activeBusinessType;
    enabled = getDefaultFlags(type)[flag] ?? false;
  }

  // Cache the result
  try {
    await getRedis().setex(cacheKey, CACHE_TTL_SECONDS, enabled ? '1' : '0');
  } catch {
    // Cache write failure is non-fatal
  }

  return enabled;
}

/**
 * Returns an async Express middleware that rejects the request with 503 when
 * the named feature flag is disabled.
 */
export function requireFeature(flag: FeatureFlagKey) {
  return async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const enabled = await isFeatureEnabled(flag);
      if (!enabled) {
        next(new AppError(503, 'FEATURE_DISABLED', `Feature '${flag}' is not enabled`));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
