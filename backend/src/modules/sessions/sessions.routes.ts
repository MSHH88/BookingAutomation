/**
 * Sessions router — Phase 9.2
 *
 * | Method | Path                                | Auth  | Feature Flag          | Description                          |
 * |--------|-------------------------------------|-------|-----------------------|--------------------------------------|
 * | GET    | /api/sessions                       | ADMIN | GROUP_BOOKING_ENABLED | List available sessions              |
 * | POST   | /api/sessions                       | ADMIN | GROUP_BOOKING_ENABLED | Create a new session                 |
 * | GET    | /api/sessions/:id                   | ADMIN | GROUP_BOOKING_ENABLED | Get a single session with bookings   |
 * | PATCH  | /api/sessions/:id                   | ADMIN | GROUP_BOOKING_ENABLED | Update a session                     |
 * | DELETE | /api/sessions/:id                   | ADMIN | GROUP_BOOKING_ENABLED | Delete a session                     |
 * | POST   | /api/sessions/:id/book              | ADMIN | GROUP_BOOKING_ENABLED | Book a customer into the session     |
 * | GET    | /api/sessions/:id/bookings          | ADMIN | GROUP_BOOKING_ENABLED | List all bookings for a session      |
 * | DELETE | /api/sessions/:id/bookings/:bookingId | ADMIN | GROUP_BOOKING_ENABLED | Cancel a session booking             |
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl          from './sessions.controller';
import {
  createSessionSchema,
  updateSessionSchema,
  sessionIdSchema,
  listSessionsSchema,
  bookSessionSchema,
  cancelSessionBookingSchema,
} from './sessions.schema';

const router = Router();

// All routes require ADMIN + feature flag
router.use(requireAuth, requireRole('ADMIN'), requireFeature('GROUP_BOOKING_ENABLED'));

/**
 * GET /api/sessions
 * List available sessions for this tenant.
 */
router.get(
  '/',
  validate(listSessionsSchema),
  ctrl.listSessionsHandler,
);

/**
 * POST /api/sessions
 * Create a new group session.
 */
router.post(
  '/',
  validate(createSessionSchema),
  ctrl.createSessionHandler,
);

/**
 * GET /api/sessions/:id
 * Get a single session with its attendees.
 */
router.get(
  '/:id',
  validate(sessionIdSchema),
  ctrl.getSessionHandler,
);

/**
 * PATCH /api/sessions/:id
 * Update a session (time, capacity, status, etc.).
 */
router.patch(
  '/:id',
  validate(updateSessionSchema),
  ctrl.updateSessionHandler,
);

/**
 * DELETE /api/sessions/:id
 * Delete a session.
 */
router.delete(
  '/:id',
  validate(sessionIdSchema),
  ctrl.deleteSessionHandler,
);

/**
 * POST /api/sessions/:id/book
 * Book a customer spot — atomically decrements capacity.
 */
router.post(
  '/:id/book',
  validate(bookSessionSchema),
  ctrl.bookSpotHandler,
);

/**
 * GET /api/sessions/:id/bookings
 * List all bookings for a session.
 */
router.get(
  '/:id/bookings',
  validate(sessionIdSchema),
  ctrl.listBookingsHandler,
);

/**
 * DELETE /api/sessions/:id/bookings/:bookingId
 * Cancel a session booking — atomically increments available spots.
 */
router.delete(
  '/:id/bookings/:bookingId',
  validate(cancelSessionBookingSchema),
  ctrl.cancelBookingHandler,
);

export { router as sessionRoutes };
