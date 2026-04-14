/**
 * Sessions controller — Phase 9.2
 *
 * HTTP handlers for group/class booking management.
 */
import { Request, Response, NextFunction } from 'express';
import * as svc from './sessions.service';
import { success, paginated } from '../../utils/apiResponse';
import type {
  CreateSessionBody,
  UpdateSessionBody,
  SessionIdParams,
  ListSessionsQuery,
  BookSessionBody,
  CancelSessionBookingParams,
} from './sessions.schema';

// ─── listSessions ─────────────────────────────────────────────────────────────

export async function listSessionsHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query    = req.query as unknown as ListSessionsQuery;
    const result   = await svc.listSessions(req.user!.tenantId ?? null, query);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

// ─── getSession ───────────────────────────────────────────────────────────────

export async function getSessionHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as SessionIdParams;
    const session = await svc.getSessionById(req.user!.tenantId ?? null, id);
    res.json(success(session));
  } catch (err) {
    next(err);
  }
}

// ─── createSession ────────────────────────────────────────────────────────────

export async function createSessionHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as unknown as CreateSessionBody;
    const session = await svc.createSession(req.user!.tenantId ?? null, body);
    res.status(201).json(success(session));
  } catch (err) {
    next(err);
  }
}

// ─── updateSession ────────────────────────────────────────────────────────────

export async function updateSessionHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as SessionIdParams;
    const body   = req.body  as unknown as UpdateSessionBody;
    const session = await svc.updateSession(req.user!.tenantId ?? null, id, body);
    res.json(success(session));
  } catch (err) {
    next(err);
  }
}

// ─── deleteSession ────────────────────────────────────────────────────────────

export async function deleteSessionHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as SessionIdParams;
    await svc.deleteSession(req.user!.tenantId ?? null, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── bookSpot ─────────────────────────────────────────────────────────────────

export async function bookSpotHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }       = req.params as unknown as SessionIdParams;
    const body         = req.body   as unknown as BookSessionBody;
    const booking = await svc.bookSessionSpot(
      req.user!.tenantId ?? null,
      id,
      body.customerId,
    );
    res.status(201).json(success(booking));
  } catch (err) {
    next(err);
  }
}

// ─── cancelBooking ────────────────────────────────────────────────────────────

export async function cancelBookingHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id, bookingId } = req.params as unknown as CancelSessionBookingParams;
    const booking = await svc.cancelSessionBooking(
      req.user!.tenantId ?? null,
      id,
      bookingId,
    );
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

// ─── listBookings ─────────────────────────────────────────────────────────────

export async function listBookingsHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }  = req.params as unknown as SessionIdParams;
    const page    = req.query['page'] ? Number(req.query['page']) : undefined;
    const limit   = req.query['limit'] ? Number(req.query['limit']) : undefined;
    const result  = await svc.listSessionBookings(req.user!.tenantId ?? null, id, page, limit);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}
