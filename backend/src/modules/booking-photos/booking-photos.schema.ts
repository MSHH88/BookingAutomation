/**
 * Booking photos schemas — Phase 3.3
 *
 * Zod validation schemas for the Booking Photos API.
 *
 * Endpoints:
 *   POST   /api/booking-photos/:bookingId            — upload a photo (JSON with url)
 *   GET    /api/booking-photos/:bookingId             — list photos for a booking
 *   DELETE /api/booking-photos/:photoId               — delete a specific photo
 *   GET    /api/booking-photos/portfolio/:artistId    — public artist portfolio
 */
import { z } from 'zod';

// ─── Photo types ──────────────────────────────────────────────────────────────

export const PHOTO_TYPES = ['BEFORE', 'AFTER'] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

// ─── POST /api/booking-photos/:bookingId ──────────────────────────────────────

export const createBookingPhotoSchema = z.object({
  params: z.object({
    bookingId: z.string().min(1, 'bookingId is required'),
  }),
  body: z.object({
    url:         z.string().url('url must be a valid URL'),
    type:        z.enum(PHOTO_TYPES),
    description: z.string().max(500).optional(),
  }),
});

export type CreateBookingPhotoBody = z.infer<typeof createBookingPhotoSchema>['body'];

// ─── GET /api/booking-photos/:bookingId ───────────────────────────────────────

export const listBookingPhotosSchema = z.object({
  params: z.object({
    bookingId: z.string().min(1, 'bookingId is required'),
  }),
});

// ─── DELETE /api/booking-photos/:photoId ──────────────────────────────────────

export const deleteBookingPhotoSchema = z.object({
  params: z.object({
    photoId: z.string().min(1, 'photoId is required'),
  }),
});

// ─── GET /api/booking-photos/portfolio/:artistId ──────────────────────────────

export const getArtistPortfolioSchema = z.object({
  params: z.object({
    artistId: z.string().min(1, 'artistId is required'),
  }),
});
