/**
 * Settings router — Step 1.29
 *
 * Mounts the studio settings endpoints under /api/settings.
 *
 * | Method | Path           | Auth            | Description                                             |
 * |--------|----------------|-----------------|---------------------------------------------------------|
 * | GET    | /api/settings  | Public          | Return public studio settings (cached, 5-min TTL)       |
 * | PATCH  | /api/settings  | ADMIN           | Update studio settings; invalidates the Redis cache     |
 *
 * Design rationale:
 *  - GET is intentionally public so that the booking page, email templates,
 *    and any server-side rendering can fetch studio metadata without a JWT.
 *  - PATCH requires the ADMIN role to prevent any authenticated user from
 *    changing business-critical settings.
 *  - No feature flag gates this module — settings management is always
 *    available, regardless of business type.
 */
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate }    from '../../middleware/validate';
import * as ctrl from './settings.controller';
import { updateSettingsSchema } from './settings.schema';

const router = Router();

// ─── GET /api/settings ────────────────────────────────────────────────────────

/**
 * Public endpoint — no authentication required.
 * Returns a safe subset of StudioSettings (no financial / commission data).
 * Response is served from Redis cache when warm (5-minute TTL).
 */
router.get('/', ctrl.getSettings);

// ─── PATCH /api/settings ──────────────────────────────────────────────────────

/**
 * ADMIN-only endpoint.
 * Creates or updates the StudioSettings singleton row.
 * Invalidates the Redis cache on success so GET immediately returns fresh data.
 *
 * Body validation enforces:
 *  - All fields are optional individually
 *  - At least one field must be supplied
 *  - Field-level format/range constraints (e.g. currency = 3-char ISO code)
 */
router.patch(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateSettingsSchema),
  ctrl.patchSettings,
);

export { router as settingsRoutes };
