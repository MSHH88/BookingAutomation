/**
 * Leads router — Step 1.7
 *
 * | Method | Path                    | Auth       | Feature Flag           | Description                             |
 * |--------|-------------------------|------------|------------------------|-----------------------------------------|
 * | POST   | /api/leads              | Public     | LEAD_CAPTURE_ENABLED   | Submit inquiry (all business types)     |
 * | GET    | /api/leads              | ADMIN only | –                      | List all leads with filters + pagination|
 * | GET    | /api/leads/export       | ADMIN only | –                      | Download all leads as CSV               |
 * | GET    | /api/leads/:id          | ADMIN only | –                      | Full lead detail (god mode)             |
 * | PATCH  | /api/leads/:id/status   | ADMIN only | –                      | Update lead status                      |
 * | PATCH  | /api/leads/:id/score    | ADMIN only | –                      | Update lead CRM score                   |
 *
 * IMPORTANT — route order:
 *   The literal `/export` route MUST be registered before `/:id` to prevent
 *   'export' being matched as an ID parameter.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
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

// ── ADMIN-only routes ─────────────────────────────────────────────────────────

/**
 * GET /api/leads/export
 * MUST come before /:id — 'export' is a literal path segment, not an ID.
 */
router.get(
  '/export',
  requireAuth,
  requireRole('ADMIN'),
  validate(exportLeadsSchema),
  ctrl.exportLeads,
);

router.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(listLeadsSchema),
  ctrl.listLeads,
);

router.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(getLeadByIdSchema),
  ctrl.getLeadById,
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateLeadStatusSchema),
  ctrl.updateLeadStatus,
);

router.patch(
  '/:id/score',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateLeadScoreSchema),
  ctrl.updateLeadScore,
);

export { router as leadRoutes };
