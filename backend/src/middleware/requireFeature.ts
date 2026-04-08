/**
 * requireFeature middleware factory.
 *
 * Gates any route behind a feature flag. If the flag is OFF for the current
 * deployment's `BUSINESS_TYPE`, the request is rejected with 503.
 *
 * In Phase 1 the flags are resolved from the per-type defaults in
 * `businessType.ts`. Phase 2 will replace this with a DB lookup so each
 * studio can have per-tenant overrides stored in `StudioSettings`.
 *
 * Usage:
 *   router.post('/leads', requireFeature('LEAD_CAPTURE_ENABLED'), ctrl.create);
 *   router.get('/waitlist', requireFeature('WAITING_LIST_ENABLED'), ctrl.list);
 */
import { Request, Response, NextFunction } from 'express';

import { getDefaultFlags, BUSINESS_TYPES, activeBusinessType } from '../config/businessType';
import type { FeatureFlagKey, BusinessType } from '../config/businessType';
import { AppError } from '../errors/AppError';

/**
 * Returns a middleware that rejects the request with 503 when the named
 * feature flag is disabled for this deployment.
 *
 * Reads `BUSINESS_TYPE` at request time so integration tests can override
 * the env var between requests without restarting the process.
 */
export function requireFeature(flag: FeatureFlagKey) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // Read BUSINESS_TYPE at request time (not at module-load time) so that
    // test suites can temporarily override process.env['BUSINESS_TYPE'].
    const rawType = process.env['BUSINESS_TYPE'];
    const type: BusinessType = (BUSINESS_TYPES as readonly string[]).includes(rawType ?? '')
      ? (rawType as BusinessType)
      : activeBusinessType;
    const flags = getDefaultFlags(type);

    if (!flags[flag]) {
      next(
        new AppError(
          503,
          'FEATURE_DISABLED',
          `Feature '${flag}' is not enabled for this business type`,
        ),
      );
      return;
    }

    next();
  };
}
