/**
 * POS router — Phase 4.4
 *
 * | Method | Path                   | Auth  | Description                      |
 * |--------|------------------------|-------|----------------------------------|
 * | POST   | /api/pos/checkout      | ADMIN | Walk-in checkout (booking+payment)|
 * | GET    | /api/pos/transactions  | ADMIN | List POS transactions             |
 * | GET    | /api/pos/summary       | ADMIN | Daily revenue summary             |
 *
 * Feature-gated by POS_ENABLED.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './pos.controller';
import {
  posCheckoutSchema,
  posListTransactionsSchema,
  posSummarySchema,
} from './pos.schema';

const router = Router();

// Feature gate + auth — all routes require POS_ENABLED + ADMIN
router.use(requireFeature('POS_ENABLED'), requireAuth, requireRole('ADMIN'));

router.post(
  '/checkout',
  validate(posCheckoutSchema),
  ctrl.checkout,
);

router.get(
  '/transactions',
  validate(posListTransactionsSchema),
  ctrl.listTransactions,
);

router.get(
  '/summary',
  validate(posSummarySchema),
  ctrl.getDailySummary,
);

export { router as posRoutes };
