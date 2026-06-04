/**
 * Booking photos service — Phase 3.3
 *
 * Business logic for managing booking before/after photos.
 * Photos are uploaded to Cloudinary by the client; this service
 * stores the resulting URL and metadata.
 *
 * ─── What this module does ───────────────────────────────────────────────────
 *
 *   createBookingPhoto(bookingId, tenantId, data, uploadedBy)
 *     Creates a photo record after verifying the booking exists and tenant matches.
 *
 *   listBookingPhotos(bookingId, tenantId)
 *     Lists all photos for a booking after verifying tenant access.
 *
 *   deleteBookingPhoto(photoId, tenantId)
 *     Deletes a photo after verifying tenant ownership.
 *
 *   getArtistPortfolio(artistId)
 *     Public: returns all AFTER photos uploaded by a specific artist.
 */
import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import type { CreateBookingPhotoBody } from './booking-photos.schema';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * POST /api/booking-photos/:bookingId
 * Creates a photo record for a booking.
 */
export async function createBookingPhoto(
  bookingId:  string,
  tenantId:   string | null,
  data:       CreateBookingPhotoBody,
  uploadedBy: string,
) {
  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: { id: true, tenantId: true },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  if (booking.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this booking');
  }

  const photo = await prisma.bookingPhoto.create({
    data: {
      bookingId,
      tenantId,
      url:         data.url,
      type:        data.type,
      description: data.description ?? null,
      uploadedBy,
    },
  });

  return photo;
}

/**
 * GET /api/booking-photos/:bookingId
 * Lists all photos for a booking.
 */
export async function listBookingPhotos(bookingId: string, tenantId: string | null) {
  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: { id: true, tenantId: true },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  if (booking.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this booking');
  }

  const photos = await prisma.bookingPhoto.findMany({
    where:   { bookingId },
    orderBy: { uploadedAt: 'desc' },
  });

  return photos;
}

/**
 * DELETE /api/booking-photos/:photoId
 * Deletes a specific photo.
 */
export async function deleteBookingPhoto(photoId: string, tenantId: string | null) {
  const photo = await prisma.bookingPhoto.findUnique({
    where:  { id: photoId },
    select: { id: true, tenantId: true },
  });

  if (!photo) {
    throw new AppError(404, 'PHOTO_NOT_FOUND', 'Photo not found');
  }

  if (photo.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this photo');
  }

  await prisma.bookingPhoto.delete({ where: { id: photoId } });

  return { deleted: true };
}

/**
 * GET /api/booking-photos/portfolio/:artistId
 * Public: returns all AFTER photos for an artist's portfolio.
 */
export async function getArtistPortfolio(artistId: string) {
  const photos = await prisma.bookingPhoto.findMany({
    where:   { uploadedBy: artistId, type: 'AFTER' },
    orderBy: { uploadedAt: 'desc' },
  });

  return photos;
}
