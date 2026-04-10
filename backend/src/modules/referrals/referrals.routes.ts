/**
 * Referral tracking router — Phase 3.5
 *
 * | Method | Path                              | Auth        | Description                        |
 * |--------|-----------------------------------|-------------|------------------------------------|
 * | GET    | /api/referrals/lookup/:code        | Public      | Look up referrer by code           |
 * | GET    | /api/referrals                     | ADMIN       | List all referrals (paginated)     |
 * | GET    | /api/referrals/:id                 | ADMIN       | Get referral details               |
 * | POST   | /api/referrals/generate-code       | CUSTOMER+   | Generate/get referral code         |
 * | POST   | /api/referrals/link                | ADMIN       | Link referee to referrer           |
 * | POST   | /api/referrals/:id/process-reward  | ADMIN       | Process reward for referral        |
 *
 * Feature-gated by REFERRALS_ENABLED.
 * Note: lookup endpoint is PUBLIC (no auth required) — placed before requireAuth.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './referrals.controller';
import {
  listReferralsSchema,
  getReferralSchema,
  lookupReferralCodeSchema,
  linkReferralSchema,
  processRewardSchema,
} from './referrals.schema';

const router = Router();

// Feature gate — all routes require REFERRALS_ENABLED
router.use(requireFeature('REFERRALS_ENABLED'));

// ── Public endpoint (no auth) ─────────────────────────────────────────────────

router.get(
  '/lookup/:code',
  validate(lookupReferralCodeSchema),
  ctrl.lookupReferralCode,
);

// ── Authenticated endpoints ───────────────────────────────────────────────────

router.use(requireAuth);

// Generate code — any authenticated user (CUSTOMER+)
router.post(
  '/generate-code',
  requireRole('CUSTOMER'),
  ctrl.generateReferralCode,
);

// Admin-only endpoints
router.get(
  '/',
  requireRole('ADMIN'),
  validate(listReferralsSchema),
  ctrl.listReferrals,
);

router.get(
  '/:id',
  requireRole('ADMIN'),
  validate(getReferralSchema),
  ctrl.getReferralById,
);

router.post(
  '/link',
  requireRole('ADMIN'),
  validate(linkReferralSchema),
  ctrl.linkReferral,
);

router.post(
  '/:id/process-reward',
  requireRole('ADMIN'),
  validate(processRewardSchema),
  ctrl.processReward,
);

export { router as referralRoutes };
