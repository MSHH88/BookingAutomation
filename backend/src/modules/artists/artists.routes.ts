/**
 * Artists router — Step 1.5 / Step 1.24
 *
 * | Method | Path                              | Auth            | Description                              |
 * |--------|-----------------------------------|-----------------|------------------------------------------|
 * | GET    | /api/artists                      | Public          | List all active artists                  |
 * | GET    | /api/artists/:slug                | Public          | Single artist (portfolio + styles)       |
 * | POST   | /api/artists                      | ADMIN           | Create artist (User + Artist)            |
 * | PATCH  | /api/artists/:id                  | ADMIN or own    | Update profile / bio / images            |
 * | DELETE | /api/artists/:id                  | ADMIN           | Soft-delete                              |
 * | POST   | /api/artists/:id/styles           | ADMIN or own    | Replace style assignments                |
 * | GET    | /api/artists/:id/availability     | Public          | Get working hours                        |
 * | PUT    | /api/artists/:id/availability     | ADMIN or own    | Set / replace working hours              |
 * | PUT    | /api/artists/:id/services         | ADMIN           | Set which services an artist offers      |
 */
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import * as ctrl from './artists.controller';
import {
  createArtistSchema,
  updateArtistSchema,
  assignStylesSchema,
  setAvailabilitySchema,
  setArtistServicesSchema,
  listArtistsSchema,
  getArtistBySlugSchema,
  deleteArtistSchema,
  getAvailabilitySchema,
} from './artists.schema';

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────

router.get(
  '/',
  validate(listArtistsSchema),
  ctrl.listArtists,
);

router.get(
  '/:slug',
  validate(getArtistBySlugSchema),
  ctrl.getArtistBySlug,
);

router.get(
  '/:id/availability',
  validate(getAvailabilitySchema),
  ctrl.getAvailability,
);

// ── Protected routes ──────────────────────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createArtistSchema),
  ctrl.createArtist,
);

router.patch(
  '/:id',
  requireAuth,
  validate(updateArtistSchema),
  ctrl.updateArtist,
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(deleteArtistSchema),
  ctrl.deleteArtist,
);

router.post(
  '/:id/styles',
  requireAuth,
  validate(assignStylesSchema),
  ctrl.assignStyles,
);

router.put(
  '/:id/availability',
  requireAuth,
  validate(setAvailabilitySchema),
  ctrl.setAvailability,
);

/**
 * PUT /api/artists/:id/services
 *
 * ADMIN only. Atomically replaces the full list of services this artist offers.
 * Body: { services: [{ serviceId, customPrice? }] }
 * Empty array removes all service assignments.
 */
router.put(
  '/:id/services',
  requireAuth,
  requireRole('ADMIN'),
  validate(setArtistServicesSchema),
  ctrl.setArtistServices,
);

export { router as artistRoutes };
