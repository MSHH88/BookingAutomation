/**
 * Admin Panel router — Step 1.26 (updated Phase 0: split ADMIN / SUPER_ADMIN access)
 *
 * All routes are mounted under /api/admin.
 *
 * Access model (Phase 0):
 *  - Studio Settings   : ADMIN or SUPER_ADMIN
 *  - Feature Flags     : SUPER_ADMIN only (business-type / module toggle is god-mode)
 *  - User Management   : ADMIN or SUPER_ADMIN
 *  - Artist Management : ADMIN or SUPER_ADMIN
 *
 * | Method | Path                              | Auth        | Description                                       |
 * |--------|-----------------------------------|-------------|---------------------------------------------------|
 * | GET    | /api/admin/settings               | ADMIN+      | Fetch current studio settings                     |
 * | PATCH  | /api/admin/settings               | ADMIN+      | Create / update studio settings                   |
 * | GET    | /api/admin/feature-flags          | SUPER_ADMIN | List all feature flags (ordered by key)           |
 * | PATCH  | /api/admin/feature-flags/:key     | SUPER_ADMIN | Toggle / set a single feature flag                |
 * | GET    | /api/admin/users                  | ADMIN+      | Paginated user list (filterable)                  |
 * | PATCH  | /api/admin/users/:id              | ADMIN+      | Update user role / active state / name            |
 * | POST   | /api/admin/users/:id/send-reset-link | SUPER_ADMIN | Send password reset link to user (BUG 24)       |
 * | GET    | /api/admin/artists                | ADMIN+      | Paginated artist list (filterable)                |
 * | PATCH  | /api/admin/artists/:id            | ADMIN+      | Update artist active state / commission           |
 */
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate }    from '../../middleware/validate';
import * as ctrl from './admin.controller';
import {
  updateSettingsSchema,
  updateFeatureFlagSchema,
  listUsersSchema,
  updateUserSchema,
  listArtistsAdminSchema,
  updateArtistAdminSchema,
} from './admin.schema';

const router = Router();

// ── All /api/admin routes require authentication ───────────────────────────────
router.use(requireAuth);

// ─── Studio Settings (ADMIN or SUPER_ADMIN) ───────────────────────────────────

router.get('/settings',   requireRole('ADMIN'), ctrl.getSettings);

router.patch(
  '/settings',
  requireRole('ADMIN'),
  validate(updateSettingsSchema),
  ctrl.patchSettings,
);

// ─── Feature Flags (SUPER_ADMIN only — god-mode control centre) ───────────────

/**
 * GET /api/admin/feature-flags
 * Returns all feature flags sorted alphabetically.
 */
router.get('/feature-flags', requireRole('SUPER_ADMIN'), ctrl.getFeatureFlags);

/**
 * PATCH /api/admin/feature-flags/:key
 * Enables or disables the flag identified by `key`.
 */
router.patch(
  '/feature-flags/:key',
  requireRole('SUPER_ADMIN'),
  validate(updateFeatureFlagSchema),
  ctrl.patchFeatureFlag,
);

// ─── User Management (ADMIN or SUPER_ADMIN) ───────────────────────────────────

router.get(
  '/users',
  requireRole('ADMIN'),
  validate(listUsersSchema),
  ctrl.getUsers,
);

router.patch(
  '/users/:id',
  requireRole('ADMIN'),
  validate(updateUserSchema),
  ctrl.patchUser,
);

/**
 * POST /api/admin/users/:id/send-reset-link
 * BUG 24: SUPER_ADMIN-only — trigger a password-reset email on behalf of a user.
 */
router.post(
  '/users/:id/send-reset-link',
  requireRole('SUPER_ADMIN'),
  ctrl.postSendResetLink,
);

// ─── Artist Management (ADMIN or SUPER_ADMIN) ─────────────────────────────────

router.get(
  '/artists',
  requireRole('ADMIN'),
  validate(listArtistsAdminSchema),
  ctrl.getArtists,
);

router.patch(
  '/artists/:id',
  requireRole('ADMIN'),
  validate(updateArtistAdminSchema),
  ctrl.patchArtist,
);

export { router as adminRoutes };
