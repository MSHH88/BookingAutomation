/**
 * Waitlist router — Step 1.16
 *
 * | Method | Path                        | Auth   | Feature Flag          | Description                            |
 * |--------|-----------------------------|--------|-----------------------|----------------------------------------|
 * | POST   | /api/waitlist               | PUBLIC | WAITING_LIST_ENABLED  | Join the waitlist                      |
 * | GET    | /api/waitlist               | ADMIN  | WAITING_LIST_ENABLED  | List all entries (paginated, filtered) |
 * | PATCH  | /api/waitlist/:id/status    | ADMIN  | WAITING_LIST_ENABLED  | Manually transition entry status       |
 * | POST   | /api/waitlist/:id/notify    | ADMIN  | WAITING_LIST_ENABLED  | Send slot-available email              |
 * | GET    | /api/waitlist/:id           | ADMIN  | WAITING_LIST_ENABLED  | Get full entry detail                  |
 * | DELETE | /api/waitlist/:id           | ADMIN  | WAITING_LIST_ENABLED  | Hard-delete a waitlist entry           |
 *
 * Notes:
 *   - The public POST / endpoint uses requireFeature but does NOT require
 *     authentication — customers join without logging in.
 *   - requireAuth + requireRole('ADMIN') are applied only to admin routes.
 *   - Sub-action routes (/:id/status, /:id/notify) MUST be registered before
 *     the plain /:id route to prevent Express treating "status" or "notify"
 *     as an id parameter.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './waitlist.controller';
import {
  joinWaitlistSchema,
  listWaitlistSchema,
  getWaitlistEntrySchema,
  updateWaitlistStatusSchema,
  notifyWaitlistEntrySchema,
  deleteWaitlistEntrySchema,
} from './waitlist.schema';

const router = Router();

// ── Feature flag gate — all waitlist routes require WAITING_LIST_ENABLED ──────
router.use(requireFeature('WAITING_LIST_ENABLED'));

// ─── Public endpoint ──────────────────────────────────────────────────────────

/**
 * POST /api/waitlist
 * Public — no auth required. Customers add themselves to the waitlist.
 */
router.post(
  '/',
  validate(joinWaitlistSchema),
  ctrl.joinWaitlist,
);

// ─── Admin-only endpoints (auth + ADMIN role enforced for all below) ──────────
router.use(requireAuth);
router.use(requireRole('ADMIN'));

/**
 * GET /api/waitlist
 * ADMIN. Paginated list with optional status / artistId / email filters.
 */
router.get(
  '/',
  validate(listWaitlistSchema),
  ctrl.listWaitlist,
);

// ─── Sub-action routes (MUST be before /:id plain routes) ─────────────────────

/**
 * PATCH /api/waitlist/:id/status
 * ADMIN. Manually transition an entry to a new status.
 */
router.patch(
  '/:id/status',
  validate(updateWaitlistStatusSchema),
  ctrl.updateWaitlistStatus,
);

/**
 * POST /api/waitlist/:id/notify
 * ADMIN. Send a slot-available email notification to the customer.
 */
router.post(
  '/:id/notify',
  validate(notifyWaitlistEntrySchema),
  ctrl.notifyWaitlistEntry,
);

// ─── Detail and delete routes (MUST be after sub-actions) ─────────────────────

/**
 * GET /api/waitlist/:id
 * ADMIN. Full detail for a single waitlist entry.
 */
router.get(
  '/:id',
  validate(getWaitlistEntrySchema),
  ctrl.getWaitlistEntryById,
);

/**
 * DELETE /api/waitlist/:id
 * ADMIN. Hard-delete a waitlist entry.
 */
router.delete(
  '/:id',
  validate(deleteWaitlistEntrySchema),
  ctrl.deleteWaitlistEntry,
);

export { router as waitlistRoutes };
