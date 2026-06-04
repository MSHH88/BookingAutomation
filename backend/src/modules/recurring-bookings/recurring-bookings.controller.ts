/**
 * Recurring Bookings controller — Phase 1, Step 1.8
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic and DB access lives in recurring-bookings.service.ts.
 */
import { Request, Response, NextFunction } from 'express';

import * as recurringService from './recurring-bookings.service';
import { success, paginated } from '../../utils/apiResponse';
import { extractTenantId } from '../../utils/extractTenantId';
import { AppError } from '../../errors/AppError';
import type {
  ListRecurringQuery,
  CreateRecurringBody,
  UpdateRecurringBody,
} from './recurring-bookings.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/recurring-bookings
 * ADMIN only. Paginated list of recurring bookings for the tenant.
 */
export async function listRecurringBookings(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    if (!tenantId) throw new AppError(403, 'FORBIDDEN', 'Tenant context required');
    const query    = req.query as unknown as ListRecurringQuery;
    const result   = await recurringService.listRecurringBookings(tenantId, query);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/recurring-bookings/:id
 * ADMIN only. Single recurring booking detail.
 */
export async function getRecurringBooking(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    if (!tenantId) throw new AppError(403, 'FORBIDDEN', 'Tenant context required');
    const { id }   = req.params as { id: string };
    const record   = await recurringService.getRecurringBooking(tenantId, id);
    res.json(success(record));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/recurring-bookings
 * ADMIN only. Create a new recurring booking.
 */
export async function createRecurringBooking(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    if (!tenantId) throw new AppError(403, 'FORBIDDEN', 'Tenant context required');
    const body     = req.body as CreateRecurringBody;
    const record   = await recurringService.createRecurringBooking(tenantId, body);
    res.status(201).json(success(record));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/recurring-bookings/:id
 * ADMIN only. Update a recurring booking.
 */
export async function updateRecurringBooking(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    if (!tenantId) throw new AppError(403, 'FORBIDDEN', 'Tenant context required');
    const { id }   = req.params as { id: string };
    const body     = req.body as UpdateRecurringBody;
    const record   = await recurringService.updateRecurringBooking(tenantId, id, body);
    res.json(success(record));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/recurring-bookings/:id
 * ADMIN only. Deactivate (soft delete) a recurring booking.
 */
export async function deactivateRecurringBooking(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    if (!tenantId) throw new AppError(403, 'FORBIDDEN', 'Tenant context required');
    const { id }   = req.params as { id: string };
    const record   = await recurringService.deactivateRecurringBooking(tenantId, id);
    res.json(success(record));
  } catch (err) {
    next(err);
  }
}
