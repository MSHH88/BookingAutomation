/**
 * Memberships router — Phase 5.2
 *
 * | Method | Path                                     | Auth     | Description                    |
 * |--------|------------------------------------------|----------|--------------------------------|
 * | GET    | /api/memberships                         | ADMIN    | List membership plans          |
 * | POST   | /api/memberships                         | ADMIN    | Create membership plan         |
 * | GET    | /api/memberships/:id                     | ADMIN    | Get single plan                |
 * | PUT    | /api/memberships/:id                     | ADMIN    | Update plan                    |
 * | DELETE | /api/memberships/:id                     | ADMIN    | Soft-delete plan               |
 * | POST   | /api/memberships/:id/subscribe           | ADMIN    | Subscribe a customer           |
 * | DELETE | /api/memberships/subscriptions/:subId    | ADMIN    | Cancel subscription            |
 * | GET    | /api/me/memberships                      | Any auth | Customer's own memberships     |
 *
 * Feature-gated by MEMBERSHIPS_ENABLED.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './memberships.controller';
import {
  createMembershipSchema,
  updateMembershipSchema,
  listMembershipsSchema,
  membershipIdParamSchema,
  subscribeSchema,
  cancelSubscriptionSchema,
  listCustomerMembershipsSchema,
} from './memberships.schema';

const router = Router();

router.use(requireAuth, requireFeature('MEMBERSHIPS_ENABLED'));

// ── Plan management ────────────────────────────────────────────────────────────

router.get(
  '/',
  requireRole('ADMIN'),
  validate(listMembershipsSchema),
  ctrl.listMemberships,
);

router.post(
  '/',
  requireRole('ADMIN'),
  validate(createMembershipSchema),
  ctrl.createMembership,
);

// Cancel subscription — must come BEFORE /:id to avoid route clash
router.delete(
  '/subscriptions/:subId',
  requireRole('ADMIN'),
  validate(cancelSubscriptionSchema),
  ctrl.cancelSubscription,
);

router.get(
  '/:id',
  requireRole('ADMIN'),
  validate(membershipIdParamSchema),
  ctrl.getMembershipById,
);

router.put(
  '/:id',
  requireRole('ADMIN'),
  validate(updateMembershipSchema),
  ctrl.updateMembership,
);

router.delete(
  '/:id',
  requireRole('ADMIN'),
  validate(membershipIdParamSchema),
  ctrl.deleteMembership,
);

router.post(
  '/:id/subscribe',
  requireRole('ADMIN'),
  validate(subscribeSchema),
  ctrl.subscribeMember,
);

export { router as membershipsRoutes };

// ── Customer-scoped routes ────────────────────────────────────────────────────

const customerMembershipsRouter = Router({ mergeParams: true });

customerMembershipsRouter.use(requireAuth, requireFeature('MEMBERSHIPS_ENABLED'));

customerMembershipsRouter.get(
  '/',
  requireRole('ADMIN'),
  validate(listCustomerMembershipsSchema),
  ctrl.listCustomerMemberships,
);

export { customerMembershipsRouter as customerMembershipsRoutes };

// ── /api/me/memberships ───────────────────────────────────────────────────────

const myMembershipsRouter = Router();

myMembershipsRouter.use(requireAuth, requireFeature('MEMBERSHIPS_ENABLED'));

myMembershipsRouter.get(
  '/',
  ctrl.getMyMemberships,
);

export { myMembershipsRouter as myMembershipsRoutes };
