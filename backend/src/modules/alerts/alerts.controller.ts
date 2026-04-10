/**
 * CRM alerts controller — Phase 2.5
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';

import * as alertsService from './alerts.service';
import { success }        from '../../utils/apiResponse';
import type { GetDashboardAlertsQuery } from './alerts.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/alerts/booking/:id
 * Returns alerts for a specific booking.
 */
export async function getBookingAlerts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const tenantId = req.user!.tenantId!;
    const alerts   = await alertsService.getBookingAlerts(id, tenantId);
    res.json(success(alerts));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/alerts/customer/:id
 * Returns alerts for a specific customer.
 */
export async function getCustomerAlerts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const tenantId = req.user!.tenantId!;
    const alerts   = await alertsService.getCustomerAlerts(id, tenantId);
    res.json(success(alerts));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/alerts/dashboard
 * Returns global dashboard alerts.
 */
export async function getDashboardAlerts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const query    = req.query as unknown as GetDashboardAlertsQuery;
    const alerts   = await alertsService.getDashboardAlerts(tenantId, query);
    res.json(success(alerts));
  } catch (err) {
    next(err);
  }
}
