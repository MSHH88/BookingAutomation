/**
 * Customer Portal controller — Step 1.25
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic and DB access lives in customers.service.ts.
 *
 * Authentication and role enforcement are handled at the router level;
 * controllers pass req.user.id / req.user.email to service functions.
 */
import { Request, Response, NextFunction } from 'express';

import * as customersService from './customers.service';
import { success, paginated } from '../../utils/apiResponse';
import type {
  ListMyBookingsQuery,
  CancelMyBookingBody,
  RescheduleMyBookingBody,
  ListMyLeadsQuery,
  UpdateMyProfileBody,
} from './customers.schema';

// ─── Bookings ─────────────────────────────────────────────────────────────────

/**
 * GET /api/me/bookings
 * Returns the authenticated customer's own bookings (paginated).
 */
export async function listMyBookings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query      = req.query as ListMyBookingsQuery;
    const customerId = req.user!.id;
    const result     = await customersService.listMyBookings(query, customerId);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/me/bookings/:id
 * Returns full detail for a single booking owned by the authenticated customer.
 */
export async function getMyBookingById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }     = req.params as { id: string };
    const customerId = req.user!.id;
    const booking    = await customersService.getMyBookingById(id, customerId);
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/me/bookings/:id/cancel
 * Cancels the customer's own upcoming booking.
 *
 * Respects the configured cancellation window and triggers the cancellation
 * fee stub when CANCELLATION_FEE_ENABLED is on and the booking is inside
 * the window.
 */
export async function cancelMyBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }     = req.params as { id: string };
    const body       = req.body as CancelMyBookingBody;
    const customerId = req.user!.id;
    const booking    = await customersService.cancelMyBooking(id, body, customerId);
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/me/bookings/:id/reschedule
 * Submits a reschedule request for the customer's own booking.
 *
 * The booking is NOT auto-confirmed after this request — staff must review
 * and re-confirm the new time slot.  A notification email is sent to the
 * studio admin (log stub in Phase 1).
 */
export async function requestReschedule(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }     = req.params as { id: string };
    const body       = req.body as RescheduleMyBookingBody;
    const customerId = req.user!.id;
    const booking    = await customersService.requestReschedule(id, body, customerId);
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

// ─── Leads ────────────────────────────────────────────────────────────────────

/**
 * GET /api/me/leads
 * Returns the authenticated customer's own inquiry leads (paginated).
 */
export async function listMyLeads(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query         = req.query as ListMyLeadsQuery;
    const customerEmail = req.user!.email;
    const result        = await customersService.listMyLeads(query, customerEmail);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * PATCH /api/me/profile
 * Updates the authenticated customer's own profile (name, phone, marketingConsent).
 */
export async function updateMyProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body   = req.body as UpdateMyProfileBody;
    const userId = req.user!.id;
    const profile = await customersService.updateMyProfile(body, userId);
    res.json(success(profile));
  } catch (err) {
    next(err);
  }
}
