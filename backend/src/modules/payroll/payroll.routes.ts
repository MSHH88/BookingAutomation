/**
 * Payroll router — Phase 4.6
 *
 * | Method | Path                     | Auth   | Description                    |
 * |--------|--------------------------|--------|--------------------------------|
 * | POST   | /api/payroll/generate    | ADMIN  | Generate payroll report(s)     |
 * | GET    | /api/payroll/reports     | ADMIN  | List payroll reports           |
 * | GET    | /api/payroll/reports/:id | ADMIN  | Get single payroll report      |
 * | GET    | /api/payroll/my-earnings | ARTIST | Artist self-service earnings   |
 *
 * Feature-gated by PAYROLL_ENABLED.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './payroll.controller';
import {
  generatePayrollSchema,
  listPayrollReportsSchema,
  myEarningsSchema,
} from './payroll.schema';

const router = Router();

router.use(requireAuth, requireFeature('PAYROLL_ENABLED'));

// ── Admin-only routes ─────────────────────────────────────────────────────────
router.post(
  '/generate',
  requireRole('ADMIN'),
  validate(generatePayrollSchema),
  ctrl.generatePayroll,
);

router.get(
  '/reports',
  requireRole('ADMIN'),
  validate(listPayrollReportsSchema),
  ctrl.listReports,
);

router.get(
  '/reports/:id',
  requireRole('ADMIN'),
  ctrl.getReport,
);

// ── Artist self-service ───────────────────────────────────────────────────────
router.get(
  '/my-earnings',
  requireRole('ARTIST'),
  validate(myEarningsSchema),
  ctrl.getMyEarnings,
);

export { router as payrollRoutes };
