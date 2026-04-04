/**
 * Quotes controller — Step 1.8
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic and DB access lives in quotes.service.ts.
 *
 * Role enforcement is handled at the router level; controllers simply pass
 * `req.user.id` and `req.user.role` to service functions that need them.
 */
import { Request, Response, NextFunction } from 'express';

import * as quotesService from './quotes.service';
import { success, paginated } from '../../utils/apiResponse';
import type {
  CreateQuoteBody,
  ListQuotesQuery,
  UpdateQuoteBody,
  AcceptQuoteBody,
} from './quotes.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/quotes
 * ARTIST or ADMIN. Creates a DRAFT quote for a lead.
 *
 * ADMIN must supply `artistId` in the body.
 * ARTIST's `artistId` is resolved automatically from their profile.
 */
export async function createQuote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body      = req.body as CreateQuoteBody;
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const quote     = await quotesService.createQuote(body, actorId, actorRole);
    res.status(201).json(success(quote));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/quotes
 * ADMIN/ARTIST. Returns a paginated list of quotes.
 *
 * ARTISTs are automatically scoped to their own quotes.
 * ADMINs see all quotes, optionally filtered by query params.
 */
export async function listQuotes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query     = req.query as ListQuotesQuery;
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const result    = await quotesService.listQuotes(query, actorId, actorRole);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/quotes/:id
 * ADMIN/ARTIST. Returns full quote detail.
 *
 * ARTISTs can only retrieve their own quotes; ADMIN can retrieve any quote.
 */
export async function getQuoteById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }    = req.params as { id: string };
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const quote     = await quotesService.getQuoteById(id, actorId, actorRole);
    res.json(success(quote));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/quotes/:id
 * ARTIST or ADMIN. Edits a DRAFT quote (price, hours, notes, validUntil).
 *
 * Only DRAFT quotes may be modified. ARTISTs can only edit their own quotes.
 */
export async function updateQuote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }    = req.params as { id: string };
    const body      = req.body as UpdateQuoteBody;
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const quote     = await quotesService.updateQuote(id, body, actorId, actorRole);
    res.json(success(quote));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/quotes/:id/send
 * ARTIST or ADMIN. Sends a DRAFT quote to the customer.
 *
 * Transitions: DRAFT → SENT
 * Side-effects: updates lead.status → QUOTED, queues email stub.
 * ARTISTs can only send their own quotes.
 */
export async function sendQuote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }    = req.params as { id: string };
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const quote     = await quotesService.sendQuote(id, actorId, actorRole);
    res.json(success(quote));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/quotes/:id/accept
 * ADMIN only. Accepts a SENT quote and creates a Booking atomically.
 *
 * Requires `startAt` and `endAt` in the body — these schedule the booking.
 * Expired quotes return 409 QUOTE_EXPIRED.
 */
export async function acceptQuote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const body   = req.body as AcceptQuoteBody;
    const quote  = await quotesService.acceptQuote(id, body);
    res.json(success(quote));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/quotes/:id/reject
 * ADMIN only. Rejects a SENT quote.
 *
 * Lead status remains QUOTED — studio may issue a revised quote.
 */
export async function rejectQuote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const quote  = await quotesService.rejectQuote(id);
    res.json(success(quote));
  } catch (err) {
    next(err);
  }
}
