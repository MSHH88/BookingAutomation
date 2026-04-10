/**
 * Public booking widget router — Phase 2.3
 *
 * All routes are PUBLIC (no JWT required). Protected by:
 *   - Global rate limiter (100 req/15min per IP from app.ts)
 *   - Additional strict rate limiter on POST (booking creation)
 *   - CAPTCHA middleware on POST (when CAPTCHA_ENABLED=true)
 *   - Feature flag: PUBLIC_BOOKING_ENABLED
 *
 * | Method | Path                                    | Description                       |
 * |--------|-----------------------------------------|-----------------------------------|
 * | GET    | /api/public/businesses/:slug             | Public studio info                |
 * | GET    | /api/public/businesses/:slug/services    | Available services                |
 * | GET    | /api/public/businesses/:slug/artists     | Artists (optional serviceId)      |
 * | GET    | /api/public/businesses/:slug/slots       | Available time slots              |
 * | POST   | /api/public/businesses/:slug/bookings    | Create anonymous booking          |
 * | GET    | /api/public/bookings/:token              | Lookup booking by token           |
 */
import { Router } from 'express';
import rateLimit  from 'express-rate-limit';

import { requireFeature } from '../../middleware/requireFeature';
import { requireCaptcha } from '../../middleware/captcha';
import { validate }       from '../../middleware/validate';
import * as ctrl from './public.controller';
import {
  getBusinessSchema,
  getBusinessServicesSchema,
  getBusinessArtistsSchema,
  getBusinessSlotsSchema,
  createPublicBookingSchema,
  getBookingByTokenSchema,
} from './public.schema';

const router = Router();

// ── Feature gate ──────────────────────────────────────────────────────────────
router.use(requireFeature('PUBLIC_BOOKING_ENABLED'));

// ── Stricter rate limiter for booking creation ────────────────────────────────
const bookingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      5,               // max 5 booking attempts per IP per 15 min
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message: { success: false, data: null, meta: null, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many booking attempts — please try again later.', details: null } },
});

// ─── Business info routes ─────────────────────────────────────────────────────

router.get(
  '/businesses/:slug',
  validate(getBusinessSchema),
  ctrl.getBusinessInfo,
);

router.get(
  '/businesses/:slug/services',
  validate(getBusinessServicesSchema),
  ctrl.getBusinessServices,
);

router.get(
  '/businesses/:slug/artists',
  validate(getBusinessArtistsSchema),
  ctrl.getBusinessArtists,
);

router.get(
  '/businesses/:slug/slots',
  validate(getBusinessSlotsSchema),
  ctrl.getBusinessSlots,
);

// ─── Booking creation (stricter rate limit + CAPTCHA) ─────────────────────────

router.post(
  '/businesses/:slug/bookings',
  bookingRateLimiter,
  requireCaptcha,
  validate(createPublicBookingSchema),
  ctrl.createPublicBooking,
);

// ─── Booking lookup by public token ───────────────────────────────────────────

router.get(
  '/bookings/:token',
  validate(getBookingByTokenSchema),
  ctrl.getBookingByToken,
);

export { router as publicRoutes };
