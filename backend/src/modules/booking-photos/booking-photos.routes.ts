/**
 * Booking photos router — Phase 3.3
 *
 * | Method | Path                                    | Auth         | Description                    |
 * |--------|-----------------------------------------|--------------|--------------------------------|
 * | GET    | /api/booking-photos/portfolio/:artistId | Public       | AFTER photos for artist portfolio |
 * | POST   | /api/booking-photos/:bookingId          | ARTIST/ADMIN | Upload a photo record          |
 * | GET    | /api/booking-photos/:bookingId          | ARTIST/ADMIN | List photos for a booking      |
 * | DELETE | /api/booking-photos/:photoId            | ARTIST/ADMIN | Delete a specific photo        |
 *
 * The portfolio endpoint is public (no auth). All other routes require
 * authentication and the BOOKING_PHOTOS_ENABLED feature flag.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './booking-photos.controller';
import {
  createBookingPhotoSchema,
  listBookingPhotosSchema,
  deleteBookingPhotoSchema,
  getArtistPortfolioSchema,
} from './booking-photos.schema';

const router = Router();

// ── Public: artist portfolio (no auth) ────────────────────────────────────────

router.get(
  '/portfolio/:artistId',
  validate(getArtistPortfolioSchema),
  ctrl.getArtistPortfolio,
);

// ── Authenticated routes ──────────────────────────────────────────────────────

router.use(requireAuth);
router.use(requireFeature('BOOKING_PHOTOS_ENABLED'));

// ── Upload photo ──────────────────────────────────────────────────────────────

router.post(
  '/:bookingId',
  requireRole('ARTIST'),
  validate(createBookingPhotoSchema),
  ctrl.createBookingPhoto,
);

// ── List photos for booking ───────────────────────────────────────────────────

router.get(
  '/:bookingId',
  requireRole('ARTIST'),
  validate(listBookingPhotosSchema),
  ctrl.listBookingPhotos,
);

// ── Delete photo ──────────────────────────────────────────────────────────────

router.delete(
  '/:photoId',
  requireRole('ARTIST'),
  validate(deleteBookingPhotoSchema),
  ctrl.deleteBookingPhoto,
);

export { router as bookingPhotosRoutes };
