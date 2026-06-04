/**
 * Recurring Bookings router — Phase 1, Step 1.8
 *
 * | Method | Path                          | Auth  | Feature Flag                | Description              |
 * |--------|-------------------------------|-------|-----------------------------|--------------------------|
 * | GET    | /api/recurring-bookings       | ADMIN | RECURRING_BOOKINGS_ENABLED  | List recurring bookings  |
 * | GET    | /api/recurring-bookings/:id   | ADMIN | RECURRING_BOOKINGS_ENABLED  | Get single               |
 * | POST   | /api/recurring-bookings       | ADMIN | RECURRING_BOOKINGS_ENABLED  | Create                   |
 * | PATCH  | /api/recurring-bookings/:id   | ADMIN | RECURRING_BOOKINGS_ENABLED  | Update                   |
 * | DELETE | /api/recurring-bookings/:id   | ADMIN | RECURRING_BOOKINGS_ENABLED  | Deactivate               |
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './recurring-bookings.controller';
import {
  listRecurringSchema,
  getRecurringSchema,
  createRecurringSchema,
  updateRecurringSchema,
  deleteRecurringSchema,
} from './recurring-bookings.schema';

const router = Router();

// ── All routes require auth + ADMIN + feature flag ────────────────────────────
router.use(requireAuth);
router.use(requireRole('ADMIN'));
router.use(requireFeature('RECURRING_BOOKINGS_ENABLED'));

// ─── List ─────────────────────────────────────────────────────────────────────
router.get(
  '/',
  validate(listRecurringSchema),
  ctrl.listRecurringBookings,
);

// ─── Detail ───────────────────────────────────────────────────────────────────
router.get(
  '/:id',
  validate(getRecurringSchema),
  ctrl.getRecurringBooking,
);

// ─── Create ───────────────────────────────────────────────────────────────────
router.post(
  '/',
  validate(createRecurringSchema),
  ctrl.createRecurringBooking,
);

// ─── Update ───────────────────────────────────────────────────────────────────
router.patch(
  '/:id',
  validate(updateRecurringSchema),
  ctrl.updateRecurringBooking,
);

// ─── Deactivate ───────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  validate(deleteRecurringSchema),
  ctrl.deactivateRecurringBooking,
);

export { router as recurringBookingRoutes };
