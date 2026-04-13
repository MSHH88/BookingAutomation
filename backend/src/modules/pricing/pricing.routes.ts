/**
 * Pricing router — Phase 8.1
 *
 * | Method | Path                              | Auth  | Feature Flag           | Description                         |
 * |--------|-----------------------------------|-------|------------------------|-------------------------------------|
 * | GET    | /api/pricing-rules                | ADMIN | DYNAMIC_PRICING_ENABLED| List all pricing rules              |
 * | POST   | /api/pricing-rules                | ADMIN | DYNAMIC_PRICING_ENABLED| Create a new pricing rule           |
 * | PATCH  | /api/pricing-rules/:id            | ADMIN | DYNAMIC_PRICING_ENABLED| Update an existing rule             |
 * | DELETE | /api/pricing-rules/:id            | ADMIN | DYNAMIC_PRICING_ENABLED| Delete a rule                       |
 * | GET    | /api/pricing-rules/calculate      | ADMIN | DYNAMIC_PRICING_ENABLED| Calculate price for a slot          |
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl          from './pricing.controller';
import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
  pricingRuleIdSchema,
  listPricingRulesSchema,
  calculatePriceSchema,
} from './pricing.schema';

const router = Router();

// All routes require ADMIN + feature flag
router.use(requireAuth, requireRole('ADMIN'), requireFeature('DYNAMIC_PRICING_ENABLED'));

/**
 * GET /api/pricing-rules/calculate
 * Must be registered BEFORE /:id to avoid "calculate" being treated as an id.
 */
router.get(
  '/calculate',
  validate(calculatePriceSchema),
  ctrl.calculatePriceHandler,
);

/**
 * GET /api/pricing-rules
 * List all pricing rules for this tenant.
 */
router.get(
  '/',
  validate(listPricingRulesSchema),
  ctrl.listRules,
);

/**
 * POST /api/pricing-rules
 * Create a new pricing rule.
 */
router.post(
  '/',
  validate(createPricingRuleSchema),
  ctrl.createRule,
);

/**
 * PATCH /api/pricing-rules/:id
 * Update an existing pricing rule.
 */
router.patch(
  '/:id',
  validate(updatePricingRuleSchema),
  ctrl.updateRule,
);

/**
 * DELETE /api/pricing-rules/:id
 * Delete a pricing rule.
 */
router.delete(
  '/:id',
  validate(pricingRuleIdSchema),
  ctrl.deleteRule,
);

export { router as pricingRoutes };
