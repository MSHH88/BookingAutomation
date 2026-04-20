/**
 * Availability controller — Step 1.12
 *
 * HTTP concerns only: parse request, delegate to service, send response.
 * All business logic and database access lives in availability.service.ts.
 *
 * Role extraction (req.user.id / req.user.role) is handled by requireAuth +
 * requireRole at the router level.
 */
import { Request, Response, NextFunction } from 'express';

import * as availabilityService from './availability.service';
import { success, paginated } from '../../utils/apiResponse';
import { extractTenantId } from '../../utils/extractTenantId';
import type {
  ListScheduleQuery,
  UpsertScheduleBody,
  ListBlocksQuery,
  CreateBlockBody,
  GetSlotsQuery,
} from './availability.schema';

// ─── Weekly schedule handlers ──────────────────────────────────────────────────

/**
 * GET /api/availability
 *
 * Returns the weekly recurring schedule for an artist.
 * ARTIST actors automatically scope to their own profile.
 * ADMIN actors must supply ?artistId=<id>.
 */
export async function listSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query     = req.query as ListScheduleQuery;
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const tenantId  = extractTenantId(req);

    const data = await availabilityService.listSchedule(query, actorId, actorRole, tenantId);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/availability
 *
 * Full-replace upsert of an artist's weekly schedule.
 * Accepts an array of up to 7 day entries (one per day-of-week).
 *
 * ARTIST actors use their own profile; ADMIN actors supply body.artistId.
 */
export async function upsertSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body      = req.body as UpsertScheduleBody;
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const tenantId  = extractTenantId(req);

    const data = await availabilityService.upsertSchedule(body, actorId, actorRole, tenantId);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

// ─── Availability block handlers ───────────────────────────────────────────────

/**
 * GET /api/availability/blocks
 *
 * Returns a paginated list of availability blocks for an artist.
 * Supports ?from=YYYY-MM-DD&to=YYYY-MM-DD date range filtering.
 */
export async function listBlocks(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query     = req.query as ListBlocksQuery;
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const tenantId  = extractTenantId(req);

    const result = await availabilityService.listBlocks(query, actorId, actorRole, tenantId);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/availability/blocks
 *
 * Creates an availability block (holiday, closure, vacation, etc.).
 * ARTIST actors create blocks for themselves; ADMIN must supply body.artistId.
 */
export async function createBlock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body      = req.body as CreateBlockBody;
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const tenantId  = extractTenantId(req);

    const data = await availabilityService.createBlock(body, actorId, actorRole, tenantId);
    res.status(201).json(success(data));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/availability/blocks/:id
 *
 * Deletes an availability block.
 * ARTIST actors can only delete their own blocks; ADMIN can delete any.
 */
export async function deleteBlock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }    = req.params as { id: string };
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const tenantId  = extractTenantId(req);

    await availabilityService.deleteBlock(id, actorId, actorRole, tenantId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Slot computation handler ──────────────────────────────────────────────────

/**
 * GET /api/availability/slots
 *
 * PUBLIC endpoint. Returns available booking slots for a given artist and date.
 * Used by the booking widget to present time options to the customer.
 *
 * Required query params: ?artistId=<id>&date=YYYY-MM-DD
 * Optional query param:  &serviceId=<id>  (uses service.durationMinutes)
 */
export async function getAvailableSlots(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as GetSlotsQuery;
    const data  = await availabilityService.getAvailableSlots(query);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
