/**
 * CRM alerts router — Phase 2.5
 *
 * | Method | Path                        | Auth        | Description                   |
 * |--------|-----------------------------|-------------|-------------------------------|
 * | GET    | /api/alerts/booking/:id     | ARTIST/ADMIN| Alerts for a specific booking |
 * | GET    | /api/alerts/customer/:id    | ARTIST/ADMIN| Alerts for a customer         |
 * | GET    | /api/alerts/dashboard       | ADMIN       | Global dashboard alerts       |
 *
 * All routes require authentication. No feature flag gate — alerts are always on.
 */
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate }    from '../../middleware/validate';
import * as ctrl from './alerts.controller';
import {
  getBookingAlertsSchema,
  getCustomerAlertsSchema,
  getDashboardAlertsSchema,
} from './alerts.schema';

const router = Router();

router.use(requireAuth);

// ── Booking alerts (ARTIST sees own bookings, ADMIN sees all) ─────────────────

router.get(
  '/booking/:id',
  requireRole('ARTIST'),
  validate(getBookingAlertsSchema),
  ctrl.getBookingAlerts,
);

// ── Customer alerts ───────────────────────────────────────────────────────────

router.get(
  '/customer/:id',
  requireRole('ARTIST'),
  validate(getCustomerAlertsSchema),
  ctrl.getCustomerAlerts,
);

// ── Dashboard alerts (ADMIN only) ─────────────────────────────────────────────

router.get(
  '/dashboard',
  requireRole('ADMIN'),
  validate(getDashboardAlertsSchema),
  ctrl.getDashboardAlerts,
);

export { router as alertsRoutes };
