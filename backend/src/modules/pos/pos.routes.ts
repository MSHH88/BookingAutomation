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
  terminalPaymentIntentSchema,
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

// ── Terminal routes (require STRIPE_TERMINAL_ENABLED) ─────────────────────────
const terminalRouter = Router();
terminalRouter.use(requireFeature('STRIPE_TERMINAL_ENABLED'));

terminalRouter.get(
  '/connection-token',
  ctrl.terminalConnectionToken,
);

terminalRouter.post(
  '/payment-intent',
  validate(terminalPaymentIntentSchema),
  ctrl.terminalPaymentIntent,
);

router.use('/terminal', terminalRouter);

export { router as posRoutes };
