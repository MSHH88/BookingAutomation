/**
 * Loyalty router — Phase 5.3
 *
 * | Method | Path                                | Auth  | Description                      |
 * |--------|-------------------------------------|-------|----------------------------------|
 * | GET    | /api/loyalty/me                     | Any   | Get own loyalty account          |
 * | GET    | /api/loyalty/customers/:customerId  | ADMIN | Get customer loyalty account      |
 * | POST   | /api/loyalty/redeem                 | ADMIN | Redeem points for a customer      |
 *
 * Feature-gated by LOYALTY_ENABLED.
 *
 * Note: /api/me/loyalty uses a separate sub-router (myLoyaltyRoutes) mounted
 * on the /api/me router in app.ts for convention consistency.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './loyalty.controller';
import {
  customerLoyaltyParamSchema,
  redeemPointsSchema,
} from './loyalty.schema';

const router = Router();

router.use(requireAuth, requireFeature('LOYALTY_ENABLED'));

// Customer's own account — any authenticated user
router.get('/me', ctrl.getMyLoyalty);

// Admin-only endpoints
router.get(
  '/customers/:customerId',
  requireRole('ADMIN'),
  validate(customerLoyaltyParamSchema),
  ctrl.getCustomerLoyalty,
);

router.post(
  '/redeem',
  requireRole('ADMIN'),
  validate(redeemPointsSchema),
  ctrl.redeemPoints,
);

export { router as loyaltyRoutes };
