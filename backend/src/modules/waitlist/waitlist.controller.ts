/**
 * Waitlist controller — Step 1.16
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic and DB access lives in waitlist.service.ts.
 *
 * Role enforcement is handled at the router level (requireAuth + requireRole).
 * The public POST / endpoint bypasses auth — see waitlist.routes.ts.
 */
import { Request, Response, NextFunction } from 'express';

import * as waitlistService           from './waitlist.service';
import { success, paginated }         from '../../utils/apiResponse';
import type {
  JoinWaitlistBody,
  ListWaitlistQuery,
  UpdateWaitlistStatusBody,
  NotifyWaitlistEntryBody,
} from './waitlist.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/waitlist
 * PUBLIC (no authentication required). Customers join the waitlist.
 *
 * Returns 201 Created with the full waitlist entry detail.
 * Returns 409 if the same email already has an active entry for this artist.
 */
export async function joinWaitlist(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body  = req.body as JoinWaitlistBody;
    const entry = await waitlistService.joinWaitlist(body, req.ip ?? undefined);
    res.status(201).json(success(entry));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/waitlist
 * ADMIN only. Returns a paginated list of waitlist entries.
 *
 * Optional query params:
 *   status   — filter by WaitlistStatus
 *   artistId — filter by artist
 *   email    — filter by customer email
 *   page     — page number (default 1)
 *   limit    — records per page (default 20, max 100)
 */
export async function listWaitlist(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query  = req.query as unknown as ListWaitlistQuery;
    const result = await waitlistService.listWaitlist(query);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/waitlist/:id
 * ADMIN only. Returns full detail for a single waitlist entry.
 *
 * Returns 404 if the entry does not exist.
 */
export async function getWaitlistEntryById(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const entry  = await waitlistService.getWaitlistEntryById(id);
    res.json(success(entry));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/waitlist/:id/status
 * ADMIN only. Manually transition a waitlist entry to a new status.
 *
 * Valid transitions are enforced in the service layer.
 * Returns 409 WAITLIST_INVALID_TRANSITION for disallowed moves.
 */
export async function updateWaitlistStatus(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const body   = req.body as UpdateWaitlistStatusBody;
    const entry  = await waitlistService.updateWaitlistStatus(id, body);
    res.json(success(entry));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/waitlist/:id/notify
 * ADMIN only. Send a slot-available notification email to the customer.
 *
 * Sets notifiedAt, expiresAt, and transitions status to NOTIFIED.
 * Email send is best-effort — if the template is missing, the DB is still
 * updated and the error is logged.
 *
 * Returns 409 WAITLIST_CANNOT_NOTIFY if the entry is in a terminal status.
 */
export async function notifyWaitlistEntry(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const body   = req.body as NotifyWaitlistEntryBody;
    const entry  = await waitlistService.notifyWaitlistEntry(id, body);
    res.json(success(entry));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/waitlist/:id
 * ADMIN only. Hard-deletes a waitlist entry.
 *
 * Returns { id } on success. Returns 404 if the entry does not exist.
 */
export async function deleteWaitlistEntry(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const result = await waitlistService.deleteWaitlistEntry(id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
