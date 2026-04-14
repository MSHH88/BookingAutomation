/**
 * Booking photos controller — Phase 3.3
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';
import { extractTenantId } from '../../utils/extractTenantId';

import * as bookingPhotosService from './booking-photos.service';
import { success }               from '../../utils/apiResponse';
import type { CreateBookingPhotoBody } from './booking-photos.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/booking-photos/:bookingId
 * Upload a photo record for a booking.
 */
export async function createBookingPhoto(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { bookingId } = req.params as { bookingId: string };
    const tenantId      = extractTenantId(req);
    const uploadedBy    = req.user!.id;
    const body          = req.body as CreateBookingPhotoBody;
    const photo         = await bookingPhotosService.createBookingPhoto(bookingId, tenantId, body, uploadedBy);
    res.status(201).json(success(photo));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/booking-photos/:bookingId
 * List all photos for a booking.
 */
export async function listBookingPhotos(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { bookingId } = req.params as { bookingId: string };
    const tenantId      = extractTenantId(req);
    const photos        = await bookingPhotosService.listBookingPhotos(bookingId, tenantId);
    res.json(success(photos));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/booking-photos/:photoId
 * Delete a specific photo.
 */
export async function deleteBookingPhoto(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { photoId } = req.params as { photoId: string };
    const tenantId    = extractTenantId(req);
    const result      = await bookingPhotosService.deleteBookingPhoto(photoId, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/booking-photos/portfolio/:artistId
 * Public: get AFTER photos for artist portfolio.
 */
export async function getArtistPortfolio(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { artistId } = req.params as { artistId: string };
    const photos       = await bookingPhotosService.getArtistPortfolio(artistId);
    res.json(success(photos));
  } catch (err) {
    next(err);
  }
}
