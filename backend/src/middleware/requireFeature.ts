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

import { getDefaultFlags } from '../config/businessType';
import type { FeatureFlagKey } from '../config/businessType';
import { AppError } from '../errors/AppError';

/**
 * Returns a middleware that rejects the request with 503 when the named
 * feature flag is disabled for this deployment.
 */
export function requireFeature(flag: FeatureFlagKey) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    const flags = getDefaultFlags();

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
