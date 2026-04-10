/**
 * Gift Cards router — Phase 4.2
 *
 * | Method | Path                          | Auth   | Description                    |
 * |--------|-------------------------------|--------|--------------------------------|
 * | GET    | /api/gift-cards/:code         | Public | Check balance by code          |
 * | GET    | /api/gift-cards               | ADMIN  | List all gift cards            |
 * | POST   | /api/gift-cards               | ADMIN  | Create/sell a new gift card    |
 * | POST   | /api/gift-cards/:code/redeem  | ADMIN  | Redeem (deduct balance)        |
 *
 * Feature-gated by GIFT_CARDS_ENABLED.
 * Public balance check is placed before requireAuth.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './gift-cards.controller';
import {
  createGiftCardSchema,
  listGiftCardsSchema,
  getGiftCardSchema,
  redeemGiftCardSchema,
} from './gift-cards.schema';

const router = Router();

// Feature gate — all routes require GIFT_CARDS_ENABLED
router.use(requireFeature('GIFT_CARDS_ENABLED'));

// ── Public endpoint (no auth required) ───────────────────────────────────────

router.get(
  '/:code',
  validate(getGiftCardSchema),
  ctrl.getGiftCardByCode,
);

// ── Authenticated admin endpoints ─────────────────────────────────────────────

router.use(requireAuth, requireRole('ADMIN'));

router.get(
  '/',
  validate(listGiftCardsSchema),
  ctrl.listGiftCards,
);

router.post(
  '/',
  validate(createGiftCardSchema),
  ctrl.createGiftCard,
);

router.post(
  '/:code/redeem',
  validate(redeemGiftCardSchema),
  ctrl.redeemGiftCard,
);

export { router as giftCardsRoutes };
