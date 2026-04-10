/**
 * Customer LTV / Stats router — Phase 3.4
 *
 * | Method | Path                              | Auth  | Description                      |
 * |--------|-----------------------------------|-------|----------------------------------|
 * | GET    | /api/customer-stats/:customerId   | ADMIN | Stats for a single customer      |
 * | GET    | /api/customer-stats               | ADMIN | Paginated customers with stats   |
 *
 * All routes require authentication. No feature flag gate — customer stats
 * are always available to ADMIN.
 */
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate }    from '../../middleware/validate';
import * as ctrl from './customer-stats.controller';
import {
  getCustomerStatsSchema,
  listCustomersWithStatsSchema,
} from './customer-stats.schema';

const router = Router();

router.use(requireAuth);

// ── Single customer stats (ADMIN only) ────────────────────────────────────────

router.get(
  '/:customerId',
  requireRole('ADMIN'),
  validate(getCustomerStatsSchema),
  ctrl.getCustomerStats,
);

// ── Paginated customers list with stats (ADMIN only) ──────────────────────────

router.get(
  '/',
  requireRole('ADMIN'),
  validate(listCustomersWithStatsSchema),
  ctrl.listCustomersWithStats,
);

export { router as customerStatsRoutes };
