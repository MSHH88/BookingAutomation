/**
 * Campaigns router — Phase 1, Step 1.9
 *
 * | Method | Path                       | Auth  | Feature Flag      | Description         |
 * |--------|----------------------------|-------|-------------------|---------------------|
 * | GET    | /api/campaigns             | ADMIN | CAMPAIGNS_ENABLED | List campaigns      |
 * | GET    | /api/campaigns/:id         | ADMIN | CAMPAIGNS_ENABLED | Get single          |
 * | GET    | /api/campaigns/:id/stats   | ADMIN | CAMPAIGNS_ENABLED | Delivery stats      |
 * | POST   | /api/campaigns             | ADMIN | CAMPAIGNS_ENABLED | Create campaign     |
 * | PATCH  | /api/campaigns/:id         | ADMIN | CAMPAIGNS_ENABLED | Edit/schedule/cancel|
 *
 * IMPORTANT — route order:
 *   /:id/stats MUST be registered BEFORE /:id to prevent matching as `id`.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './campaigns.controller';
import {
  listCampaignsSchema,
  getCampaignSchema,
  createCampaignSchema,
  updateCampaignSchema,
  getCampaignStatsSchema,
} from './campaigns.schema';

const router = Router();

// ── All routes require auth + ADMIN + feature flag ────────────────────────────
router.use(requireAuth);
router.use(requireRole('ADMIN'));
router.use(requireFeature('CAMPAIGNS_ENABLED'));

// ─── List ─────────────────────────────────────────────────────────────────────
router.get(
  '/',
  validate(listCampaignsSchema),
  ctrl.listCampaigns,
);

// ─── Create ───────────────────────────────────────────────────────────────────
router.post(
  '/',
  validate(createCampaignSchema),
  ctrl.createCampaign,
);

// ─── Stats (MUST be before /:id) ──────────────────────────────────────────────
router.get(
  '/:id/stats',
  validate(getCampaignStatsSchema),
  ctrl.getCampaignStats,
);

// ─── Detail ───────────────────────────────────────────────────────────────────
router.get(
  '/:id',
  validate(getCampaignSchema),
  ctrl.getCampaign,
);

// ─── Update ───────────────────────────────────────────────────────────────────
router.patch(
  '/:id',
  validate(updateCampaignSchema),
  ctrl.updateCampaign,
);

export { router as campaignRoutes };
