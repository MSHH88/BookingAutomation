/**
 * Artists router — Step 1.5 / Step 1.24 / Phase 6.2 / Phase 6.4
 *
 * | Method | Path                              | Auth            | Description                              |
 * |--------|-----------------------------------|-----------------|------------------------------------------|
 * | GET    | /api/artists                      | Public          | List all active artists                  |
 * | GET    | /api/artists/me/schedule          | ARTIST          | Own daily/weekly booking schedule        |
 * | GET    | /api/artists/:slug                | Public          | Single artist (portfolio + styles)       |
 * | POST   | /api/artists                      | ADMIN           | Create artist (User + Artist)            |
 * | PATCH  | /api/artists/:id                  | ADMIN or own    | Update profile / bio / images            |
 * | DELETE | /api/artists/:id                  | ADMIN           | Soft-delete                              |
 * | POST   | /api/artists/:id/styles           | ADMIN or own    | Replace style assignments                |
 * | GET    | /api/artists/:id/availability     | Public          | Get working hours                        |
 * | PUT    | /api/artists/:id/availability     | ADMIN or own    | Set / replace working hours              |
 * | PUT    | /api/artists/:id/services         | ADMIN           | Set which services an artist offers      |
 * | GET    | /api/artists/:id/media            | ADMIN           | List artist media                        |
 * | POST   | /api/artists/:id/media            | ADMIN           | Upload a new media item                  |
 * | DELETE | /api/artists/:id/media/:publicId  | ADMIN           | Remove a media item                      |
 * | PATCH  | /api/artists/:id/profile-photo    | ADMIN           | Set profile photo from existing media    |
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl      from './artists.controller';
import * as mediaCrl  from './artist-media.controller';
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

// ── /me/schedule must come BEFORE /:slug to avoid collision ──────────────────

/**
 * GET /api/artists/me/schedule
 *
 * ARTIST: Returns own daily or weekly booking schedule.
 * Query: ?date=YYYY-MM-DD (optional) — single day; omit for 7-day window.
 * Requires STAFF_APP_ENABLED flag.
 */
router.get(
  '/me/schedule',
  requireAuth,
  requireRole('ARTIST'),
  requireFeature('STAFF_APP_ENABLED'),
  ctrl.getMySchedule,
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

// ── Phase 6.4 — Artist Media routes ──────────────────────────────────────────

/**
 * GET /api/artists/:id/media
 * ADMIN: List all media for an artist.
 */
router.get(
  '/:id/media',
  requireAuth,
  requireRole('ADMIN'),
  mediaCrl.listMedia,
);

/**
 * POST /api/artists/:id/media
 * ADMIN: Upload a new image (multipart). Returns { url, publicId, type }.
 */
router.post(
  '/:id/media',
  requireAuth,
  requireRole('ADMIN'),
  mediaCrl.uploadMedia,
);

/**
 * DELETE /api/artists/:id/media/:publicId
 * ADMIN: Remove a media item by Cloudinary publicId.
 */
router.delete(
  '/:id/media/:publicId',
  requireAuth,
  requireRole('ADMIN'),
  mediaCrl.deleteMedia,
);

/**
 * PATCH /api/artists/:id/profile-photo
 * ADMIN: Set which uploaded image is the artist's profile photo.
 * Body: { cloudinaryPublicId: string }
 */
router.patch(
  '/:id/profile-photo',
  requireAuth,
  requireRole('ADMIN'),
  mediaCrl.setProfilePhoto,
);

export { router as artistRoutes };
