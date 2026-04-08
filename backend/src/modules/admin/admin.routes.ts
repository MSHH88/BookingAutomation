/**
 * Admin Panel router — Step 1.26
 *
 * All routes are mounted under /api/admin and require a valid JWT with the
 * ADMIN role (enforced via requireAuth + requireRole('ADMIN')).
 *
 * No feature flag gates this module — admin management is always available
 * regardless of business type, because every deployment needs a way to
 * configure its studio settings and feature flags.
 *
 * | Method | Path                              | Auth  | Description                                       |
 * |--------|-----------------------------------|-------|---------------------------------------------------|
 * | GET    | /api/admin/settings               | ADMIN | Fetch current studio settings                     |
 * | PATCH  | /api/admin/settings               | ADMIN | Create / update studio settings                   |
 * | GET    | /api/admin/feature-flags          | ADMIN | List all feature flags (ordered by key)           |
 * | PATCH  | /api/admin/feature-flags/:key     | ADMIN | Toggle / set a single feature flag                |
 * | GET    | /api/admin/users                  | ADMIN | Paginated user list (filterable)                  |
 * | PATCH  | /api/admin/users/:id              | ADMIN | Update user role / active state / name            |
 * | GET    | /api/admin/artists                | ADMIN | Paginated artist list (filterable)                |
 * | PATCH  | /api/admin/artists/:id            | ADMIN | Update artist active state / commission           |
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

// ── All /api/admin routes require authentication + ADMIN role ─────────────────
router.use(requireAuth);
router.use(requireRole('ADMIN'));

// ─── Studio Settings ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/settings
 * Returns the current studio settings object, or { data: null } if not yet
 * configured.
 */
router.get('/settings', ctrl.getSettings);

/**
 * PATCH /api/admin/settings
 * Creates or updates the studio settings row.  studioName is required if
 * no settings row exists yet.
 */
router.patch(
  '/settings',
  validate(updateSettingsSchema),
  ctrl.patchSettings,
);

// ─── Feature Flags ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/feature-flags
 * Returns all feature flags sorted alphabetically.
 */
router.get('/feature-flags', ctrl.getFeatureFlags);

/**
 * PATCH /api/admin/feature-flags/:key
 * Enables or disables the flag identified by `key`.
 */
router.patch(
  '/feature-flags/:key',
  validate(updateFeatureFlagSchema),
  ctrl.patchFeatureFlag,
);

// ─── User Management ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Paginated list of all users.  Supports ?role=, ?isActive=, ?search=
 * query parameters.
 */
router.get(
  '/users',
  validate(listUsersSchema),
  ctrl.getUsers,
);

/**
 * PATCH /api/admin/users/:id
 * Update a user's role, isActive, or name.
 */
router.patch(
  '/users/:id',
  validate(updateUserSchema),
  ctrl.patchUser,
);

// ─── Artist Management ────────────────────────────────────────────────────────

/**
 * GET /api/admin/artists
 * Paginated list of all artists with user profile.  Supports ?isActive=
 * query parameter.
 */
router.get(
  '/artists',
  validate(listArtistsAdminSchema),
  ctrl.getArtists,
);

/**
 * PATCH /api/admin/artists/:id
 * Update an artist's isActive or commission configuration.
 */
router.patch(
  '/artists/:id',
  validate(updateArtistAdminSchema),
  ctrl.patchArtist,
);

export { router as adminRoutes };
