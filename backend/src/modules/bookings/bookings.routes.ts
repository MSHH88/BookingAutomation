/**
 * Bookings router — Step 1.9
 *
 * | Method | Path                          | Auth         | Feature Flag     | Description                                           |
 * |--------|-------------------------------|--------------|------------------|-------------------------------------------------------|
 * | GET    | /api/bookings                 | ARTIST/ADMIN | BOOKING_ENABLED  | List bookings (ARTISTs: own; ADMIN: all)              |
 * | GET    | /api/bookings/:id             | ARTIST/ADMIN | BOOKING_ENABLED  | Booking detail (ARTISTs: own only)                    |
 * | PATCH  | /api/bookings/:id/confirm     | ARTIST/ADMIN | BOOKING_ENABLED  | Confirm PENDING → conflict check + email + calendar   |
 * | PATCH  | /api/bookings/:id/complete    | ARTIST/ADMIN | BOOKING_ENABLED  | Complete CONFIRMED → Invoice + review job             |
 * | PATCH  | /api/bookings/:id/cancel      | ARTIST/ADMIN | BOOKING_ENABLED  | Cancel PENDING/CONFIRMED → email + delete calendar    |
 * | PATCH  | /api/bookings/:id/reschedule  | ARTIST/ADMIN | BOOKING_ENABLED  | Reschedule CONFIRMED → conflict check + email         |
 *
 * All routes are gated by BOOKING_ENABLED (true for all business types by default).
 *
 * IMPORTANT — route order:
 *   Literal sub-routes (/confirm, /complete, /cancel, /reschedule) MUST be
 *   registered BEFORE /:id to prevent them being matched as the `id` parameter.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './bookings.controller';
import {
  listBookingsSchema,
  getBookingByIdSchema,
  confirmBookingSchema,
  completeBookingSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
} from './bookings.schema';

const router = Router();

// ── All booking routes require authentication and the BOOKING_ENABLED feature flag ──
router.use(requireAuth);
router.use(requireFeature('BOOKING_ENABLED'));

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/bookings
 * ARTIST sees own bookings only.
 * ADMIN sees all bookings, filterable by status, artistId, customerId, from, to.
 */
router.get(
  '/',
  requireRole('ARTIST'),
  validate(listBookingsSchema),
  ctrl.listBookings,
);

// ─── Action sub-routes (MUST be before /:id) ──────────────────────────────────

/**
 * PATCH /api/bookings/:id/confirm
 * PENDING → CONFIRMED. Runs conflict detection first.
 */
router.patch(
  '/:id/confirm',
  requireRole('ARTIST'),
  validate(confirmBookingSchema),
  ctrl.confirmBooking,
);

/**
 * PATCH /api/bookings/:id/complete
 * CONFIRMED → COMPLETED. Atomically creates Invoice.
 */
router.patch(
  '/:id/complete',
  requireRole('ARTIST'),
  validate(completeBookingSchema),
  ctrl.completeBooking,
);

/**
 * PATCH /api/bookings/:id/cancel
 * PENDING or CONFIRMED → CANCELLED. Requires cancelReason.
 */
router.patch(
  '/:id/cancel',
  requireRole('ARTIST'),
  validate(cancelBookingSchema),
  ctrl.cancelBooking,
);

/**
 * PATCH /api/bookings/:id/reschedule
 * CONFIRMED → RESCHEDULED. Requires new startAt/endAt. Runs conflict detection.
 */
router.patch(
  '/:id/reschedule',
  requireRole('ARTIST'),
  validate(rescheduleBookingSchema),
  ctrl.rescheduleBooking,
);

// ─── Detail (MUST be after action sub-routes) ─────────────────────────────────

/**
 * GET /api/bookings/:id
 * Full booking detail. ARTISTs can only view their own bookings.
 */
router.get(
  '/:id',
  requireRole('ARTIST'),
  validate(getBookingByIdSchema),
  ctrl.getBookingById,
);

export { router as bookingRoutes };
