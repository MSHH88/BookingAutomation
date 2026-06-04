/**
 * Leads router — Step 1.7 (updated Phase 0: requireLeadAccess)
 *
 * | Method | Path                    | Auth             | Feature Flag           | Description                             |
 * |--------|-------------------------|------------------|------------------------|-----------------------------------------|
 * | POST   | /api/leads              | Public           | LEAD_CAPTURE_ENABLED   | Submit inquiry (all business types)     |
 * | GET    | /api/leads              | Lead access only | –                      | List all leads with filters + pagination|
 * | GET    | /api/leads/export       | Lead access only | –                      | Download all leads as CSV               |
 * | GET    | /api/leads/:id          | Lead access only | –                      | Full lead detail (god mode)             |
 * | PATCH  | /api/leads/:id/status   | Lead access only | –                      | Update lead status                      |
 * | PATCH  | /api/leads/:id/score    | Lead access only | –                      | Update lead CRM score                   |
 *
 * "Lead access" = SUPER_ADMIN always, or ADMIN with canViewLeads=true.
 *
 * IMPORTANT — route order:
 *   The literal `/export` route MUST be registered before `/:id` to prevent
 *   'export' being matched as an ID parameter.
 */
import { Router } from 'express';

import { requireAuth }        from '../../middleware/auth';
import { requireLeadAccess }  from '../../middleware/requireLeadAccess';
import { requireFeature }     from '../../middleware/requireFeature';
import { validate }           from '../../middleware/validate';
import * as ctrl from './leads.controller';
import {
  createLeadSchema,
  listLeadsSchema,
  exportLeadsSchema,
  getLeadByIdSchema,
  updateLeadStatusSchema,
  updateLeadScoreSchema,
} from './leads.schema';

const router = Router();

// ── Public route ─────────────────────────────────────────────────────────────

/**
 * POST /api/leads
 * Gated by LEAD_CAPTURE_ENABLED feature flag so restaurant deployments
 * (where it defaults to false) automatically get a 503 without any
 * controller changes.
 */
router.post(
  '/',
  requireFeature('LEAD_CAPTURE_ENABLED'),
  validate(createLeadSchema),
  ctrl.createLead,
);

// ── Lead-access-only routes ───────────────────────────────────────────────────
// Requires SUPER_ADMIN, or ADMIN with canViewLeads = true.

/**
 * GET /api/leads/export
 * MUST come before /:id — 'export' is a literal path segment, not an ID.
 */
router.get(
  '/export',
  requireAuth,
  requireLeadAccess,
  validate(exportLeadsSchema),
  ctrl.exportLeads,
);

router.get(
  '/',
  requireAuth,
  requireLeadAccess,
  validate(listLeadsSchema),
  ctrl.listLeads,
);

router.get(
  '/:id',
  requireAuth,
  requireLeadAccess,
  validate(getLeadByIdSchema),
  ctrl.getLeadById,
);

router.patch(
  '/:id/status',
  requireAuth,
  requireLeadAccess,
  validate(updateLeadStatusSchema),
  ctrl.updateLeadStatus,
);

router.patch(
  '/:id/score',
  requireAuth,
  requireLeadAccess,
  validate(updateLeadScoreSchema),
  ctrl.updateLeadScore,
);

export { router as leadRoutes };
