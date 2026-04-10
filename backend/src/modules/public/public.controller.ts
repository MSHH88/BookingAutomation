/**
 * Public booking widget controller — Phase 2.3
 *
 * HTTP concerns only: parse request, call service, send response.
 * All endpoints are public (no JWT required).
 */
import { Request, Response, NextFunction } from 'express';

import * as publicService from './public.service';
import { success }        from '../../utils/apiResponse';
import type {
  GetBusinessArtistsQuery,
  GetBusinessSlotsQuery,
  CreatePublicBookingBody,
} from './public.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/public/businesses/:slug
 * Returns public studio info.
 */
export async function getBusinessInfo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { slug } = req.params as { slug: string };
    const info = await publicService.getBusinessInfo(slug);
    res.json(success(info));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/public/businesses/:slug/services
 * Returns available services for a business.
 */
export async function getBusinessServices(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { slug } = req.params as { slug: string };
    const services = await publicService.getBusinessServices(slug);
    res.json(success(services));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/public/businesses/:slug/artists
 * Returns artists for a business, optionally filtered by serviceId.
 */
export async function getBusinessArtists(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { slug } = req.params as { slug: string };
    const query    = req.query as unknown as GetBusinessArtistsQuery;
    const artists  = await publicService.getBusinessArtists(slug, query);
    res.json(success(artists));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/public/businesses/:slug/slots
 * Returns available time slots.
 */
export async function getBusinessSlots(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { slug } = req.params as { slug: string };
    const query    = req.query as unknown as GetBusinessSlotsQuery;
    const slots    = await publicService.getBusinessSlots(slug, query);
    res.json(success(slots));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/public/businesses/:slug/bookings
 * Creates an anonymous booking.
 */
export async function createPublicBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { slug } = req.params as { slug: string };
    const body     = req.body as CreatePublicBookingBody;
    const booking  = await publicService.createPublicBooking(slug, body);
    res.status(201).json(success(booking));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/public/bookings/:token
 * Lookup booking by public token.
 */
export async function getBookingByToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token } = req.params as { token: string };
    const booking   = await publicService.getBookingByToken(token);
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}
