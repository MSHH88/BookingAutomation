/**
 * Customer Portal router — Step 1.25
 *
 * All routes are mounted under /api/me and require a valid JWT with at least
 * the CUSTOMER role.  No feature flag gates this module — it is enabled for
 * every business type because all deployments have customers who need
 * self-service access to their own data.
 *
 * | Method | Path                              | Auth     | Description                                      |
 * |--------|-----------------------------------|----------|--------------------------------------------------|
 * | GET    | /api/me/bookings                  | CUSTOMER | Paginated list of own bookings                   |
 * | GET    | /api/me/bookings/:id              | CUSTOMER | Single booking detail (own only)                 |
 * | POST   | /api/me/bookings/:id/cancel       | CUSTOMER | Cancel own upcoming booking                      |
 * | POST   | /api/me/bookings/:id/reschedule   | CUSTOMER | Request reschedule (staff notified, not auto-OK) |
 * | GET    | /api/me/leads                     | CUSTOMER | Paginated list of own inquiry leads              |
 * | PATCH  | /api/me/profile                   | CUSTOMER | Update own name / phone / marketingConsent       |
 *
 * IMPORTANT — route order:
 *   Action sub-routes (/cancel, /reschedule) MUST be registered BEFORE /:id so
 *   they are not accidentally matched as the `id` parameter value.
 */
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate }    from '../../middleware/validate';
import * as ctrl from './customers.controller';
import {
  listMyBookingsSchema,
  getMyBookingSchema,
  cancelMyBookingSchema,
  rescheduleMyBookingSchema,
  listMyLeadsSchema,
  updateMyProfileSchema,
} from './customers.schema';

const router = Router();

// ── All /api/me routes require authentication ─────────────────────────────────
router.use(requireAuth);
router.use(requireRole('CUSTOMER'));

// ─── Bookings ─────────────────────────────────────────────────────────────────

/**
 * GET /api/me/bookings
 * Paginated list of own bookings. Filterable by status, from, to.
 */
router.get(
  '/bookings',
  validate(listMyBookingsSchema),
  ctrl.listMyBookings,
);

/**
 * POST /api/me/bookings/:id/cancel
 * Cancel own upcoming booking. Respects cancellation window.
 * Must be registered BEFORE /bookings/:id to avoid param collision.
 */
router.post(
  '/bookings/:id/cancel',
  validate(cancelMyBookingSchema),
  ctrl.cancelMyBooking,
);

/**
 * POST /api/me/bookings/:id/reschedule
 * Submit a reschedule request. Staff must re-confirm the new time.
 * Must be registered BEFORE /bookings/:id to avoid param collision.
 */
router.post(
  '/bookings/:id/reschedule',
  validate(rescheduleMyBookingSchema),
  ctrl.requestReschedule,
);

/**
 * GET /api/me/bookings/:id
 * Full detail of a single booking (own only).
 * Must be registered AFTER action sub-routes.
 */
router.get(
  '/bookings/:id',
  validate(getMyBookingSchema),
  ctrl.getMyBookingById,
);

// ─── Leads ────────────────────────────────────────────────────────────────────

/**
 * GET /api/me/leads
 * Paginated list of own inquiry leads (matched by authenticated user email).
 */
router.get(
  '/leads',
  validate(listMyLeadsSchema),
  ctrl.listMyLeads,
);

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * PATCH /api/me/profile
 * Update own name, phone, and/or marketingConsent.
 */
router.patch(
  '/profile',
  validate(updateMyProfileSchema),
  ctrl.updateMyProfile,
);

export { router as customerRoutes };
