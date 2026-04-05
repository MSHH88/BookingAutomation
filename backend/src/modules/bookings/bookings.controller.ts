/**
 * Bookings controller — Step 1.9
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic and DB access lives in bookings.service.ts.
 *
 * Role enforcement is handled at the router level; controllers pass
 * `req.user.id` and `req.user.role` to service functions that need them.
 */
import { Request, Response, NextFunction } from 'express';

import * as bookingsService from './bookings.service';
import { success, paginated } from '../../utils/apiResponse';
import type {
  ListBookingsQuery,
  CompleteBookingBody,
  CancelBookingBody,
  RescheduleBookingBody,
} from './bookings.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/bookings
 * ADMIN/ARTIST. Returns a paginated list of bookings.
 *
 * ARTISTs are automatically scoped to their own bookings.
 * ADMINs see all bookings, optionally filtered by query params.
 */
export async function listBookings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query     = req.query as ListBookingsQuery;
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const result    = await bookingsService.listBookings(query, actorId, actorRole);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bookings/:id
 * ADMIN/ARTIST. Returns full booking detail.
 *
 * ARTISTs can only retrieve their own bookings; ADMIN can retrieve any booking.
 */
export async function getBookingById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }    = req.params as { id: string };
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const booking   = await bookingsService.getBookingById(id, actorId, actorRole);
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookings/:id/confirm
 * ARTIST or ADMIN. Confirms a PENDING booking.
 *
 * Runs scheduling conflict detection before confirming.
 * Triggers booking-confirmed email + calendar event (log stubs in Phase 1).
 */
export async function confirmBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }    = req.params as { id: string };
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const booking   = await bookingsService.confirmBooking(id, actorId, actorRole);
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookings/:id/complete
 * ARTIST or ADMIN. Marks a CONFIRMED booking as COMPLETED.
 *
 * Atomically creates an Invoice record.
 * Enqueues review-request email (36h delay) and WhatsApp message 2 (2h delay).
 */
export async function completeBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }    = req.params as { id: string };
    const body      = req.body as CompleteBookingBody;
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const booking   = await bookingsService.completeBooking(id, body, actorId, actorRole);
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookings/:id/cancel
 * ARTIST or ADMIN. Cancels a PENDING or CONFIRMED booking.
 *
 * Requires cancelReason in the request body.
 * Triggers booking-cancelled email + calendar event deletion (log stubs in Phase 1).
 */
export async function cancelBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }    = req.params as { id: string };
    const body      = req.body as CancelBookingBody;
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const booking   = await bookingsService.cancelBooking(id, body, actorId, actorRole);
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookings/:id/reschedule
 * ARTIST or ADMIN. Reschedules a CONFIRMED booking to a new time slot.
 *
 * Runs scheduling conflict detection on the new time slot.
 * Triggers booking-rescheduled email + calendar event update (log stubs in Phase 1).
 */
export async function rescheduleBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }    = req.params as { id: string };
    const body      = req.body as RescheduleBookingBody;
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const booking   = await bookingsService.rescheduleBooking(id, body, actorId, actorRole);
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}
