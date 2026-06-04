/**
 * Health Flags router — Phase 3.1
 *
 * | Method | Path                                   | Auth         | Description                    |
 * |--------|----------------------------------------|--------------|--------------------------------|
 * | GET    | /api/health-flags/:customerId          | ARTIST/ADMIN | List health flags for customer |
 * | POST   | /api/health-flags/:customerId          | ARTIST/ADMIN | Create a health flag           |
 * | DELETE | /api/health-flags/:customerId/:flagId  | ARTIST/ADMIN | Delete a health flag           |
 *
 * All routes require authentication and the HEALTH_FLAGS_ENABLED feature flag.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './health-flags.controller';
import {
  listHealthFlagsSchema,
  createHealthFlagSchema,
  deleteHealthFlagSchema,
} from './health-flags.schema';

const router = Router();

router.use(requireAuth);
router.use(requireFeature('HEALTH_FLAGS_ENABLED'));

// ── List health flags for a customer ──────────────────────────────────────────

router.get(
  '/:customerId',
  requireRole('ARTIST'),
  validate(listHealthFlagsSchema),
  ctrl.listHealthFlags,
);

// ── Create a health flag ──────────────────────────────────────────────────────

router.post(
  '/:customerId',
  requireRole('ARTIST'),
  validate(createHealthFlagSchema),
  ctrl.createHealthFlag,
);

// ── Delete a health flag ──────────────────────────────────────────────────────

router.delete(
  '/:customerId/:flagId',
  requireRole('ARTIST'),
  validate(deleteHealthFlagSchema),
  ctrl.deleteHealthFlag,
);

export { router as healthFlagsRoutes };
