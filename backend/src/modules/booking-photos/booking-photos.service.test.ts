/**
 * Booking photos service — unit tests — Phase 3.3
 *
 * Tests:
 *  1. createBookingPhoto — creates photo for valid booking
 *  2. createBookingPhoto — throws 404 when booking not found
 *  3. createBookingPhoto — throws 403 when tenant mismatch
 *  4. listBookingPhotos — returns photos for valid booking
 *  5. listBookingPhotos — throws 404 when booking not found
 *  6. listBookingPhotos — throws 403 when tenant mismatch
 *  7. deleteBookingPhoto — deletes photo successfully
 *  8. deleteBookingPhoto — throws 404 when photo not found
 *  9. deleteBookingPhoto — throws 403 when tenant mismatch
 * 10. getArtistPortfolio — returns AFTER photos for artist
 * 11. getArtistPortfolio — returns empty array when no photos
 * 12. createBookingPhoto — stores description when provided
 *
 * Total: 12 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
    },
    bookingPhoto: {
      create:   jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete:   jest.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';
import {
  createBookingPhoto,
  listBookingPhotos,
  deleteBookingPhoto,
  getArtistPortfolio,
} from './booking-photos.service';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('booking-photos.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createBookingPhoto ─────────────────────────────────────────────────────

  describe('createBookingPhoto', () => {
    it('should create a photo for a valid booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-1',
      });
      const created = {
        id: 'p-1', bookingId: 'b-1', tenantId: 'tenant-1',
        url: 'https://cdn.example.com/photo.jpg', type: 'AFTER',
        description: null, uploadedBy: 'artist-1', uploadedAt: new Date(),
      };
      (prisma.bookingPhoto.create as jest.Mock).mockResolvedValue(created);

      const result = await createBookingPhoto('b-1', 'tenant-1', {
        url: 'https://cdn.example.com/photo.jpg', type: 'AFTER',
      }, 'artist-1');

      expect(result).toEqual(created);
      expect(prisma.bookingPhoto.create).toHaveBeenCalledWith({
        data: {
          bookingId: 'b-1', tenantId: 'tenant-1',
          url: 'https://cdn.example.com/photo.jpg', type: 'AFTER',
          description: null, uploadedBy: 'artist-1',
        },
      });
    });

    it('should throw 404 when booking not found', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        createBookingPhoto('bad-id', 'tenant-1', {
          url: 'https://cdn.example.com/photo.jpg', type: 'BEFORE',
        }, 'artist-1'),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'BOOKING_NOT_FOUND',
      });
    });

    it('should throw 403 when tenant mismatch', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-other',
      });

      await expect(
        createBookingPhoto('b-1', 'tenant-1', {
          url: 'https://cdn.example.com/photo.jpg', type: 'BEFORE',
        }, 'artist-1'),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('should throw 403 when booking has null tenantId', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: null,
      });

      await expect(
        createBookingPhoto('b-1', 'tenant-1', {
          url: 'https://cdn.example.com/photo.jpg', type: 'BEFORE',
        }, 'artist-1'),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('should store description when provided', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-1',
      });
      const created = {
        id: 'p-1', bookingId: 'b-1', tenantId: 'tenant-1',
        url: 'https://cdn.example.com/photo.jpg', type: 'BEFORE',
        description: 'Before session', uploadedBy: 'artist-1', uploadedAt: new Date(),
      };
      (prisma.bookingPhoto.create as jest.Mock).mockResolvedValue(created);

      const result = await createBookingPhoto('b-1', 'tenant-1', {
        url: 'https://cdn.example.com/photo.jpg', type: 'BEFORE',
        description: 'Before session',
      }, 'artist-1');

      expect(result.description).toBe('Before session');
      expect(prisma.bookingPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ description: 'Before session' }),
      });
    });
  });

  // ── listBookingPhotos ──────────────────────────────────────────────────────

  describe('listBookingPhotos', () => {
    it('should return photos for a valid booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-1',
      });
      const photos = [
        { id: 'p-1', bookingId: 'b-1', url: 'https://cdn.example.com/1.jpg', type: 'BEFORE' },
        { id: 'p-2', bookingId: 'b-1', url: 'https://cdn.example.com/2.jpg', type: 'AFTER' },
      ];
      (prisma.bookingPhoto.findMany as jest.Mock).mockResolvedValue(photos);

      const result = await listBookingPhotos('b-1', 'tenant-1');

      expect(result).toEqual(photos);
      expect(prisma.bookingPhoto.findMany).toHaveBeenCalledWith({
        where:   { bookingId: 'b-1' },
        orderBy: { uploadedAt: 'desc' },
      });
    });

    it('should throw 404 when booking not found', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(listBookingPhotos('bad-id', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'BOOKING_NOT_FOUND',
      });
    });

    it('should throw 403 when tenant mismatch', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-other',
      });

      await expect(listBookingPhotos('b-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  // ── deleteBookingPhoto ─────────────────────────────────────────────────────

  describe('deleteBookingPhoto', () => {
    it('should delete a photo successfully', async () => {
      (prisma.bookingPhoto.findUnique as jest.Mock).mockResolvedValue({
        id: 'p-1', tenantId: 'tenant-1',
      });
      (prisma.bookingPhoto.delete as jest.Mock).mockResolvedValue({});

      const result = await deleteBookingPhoto('p-1', 'tenant-1');

      expect(result).toEqual({ deleted: true });
      expect(prisma.bookingPhoto.delete).toHaveBeenCalledWith({ where: { id: 'p-1' } });
    });

    it('should throw 404 when photo not found', async () => {
      (prisma.bookingPhoto.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteBookingPhoto('bad-id', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'PHOTO_NOT_FOUND',
      });
    });

    it('should throw 403 when tenant mismatch', async () => {
      (prisma.bookingPhoto.findUnique as jest.Mock).mockResolvedValue({
        id: 'p-1', tenantId: 'tenant-other',
      });

      await expect(deleteBookingPhoto('p-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  // ── getArtistPortfolio ─────────────────────────────────────────────────────

  describe('getArtistPortfolio', () => {
    it('should return AFTER photos for artist', async () => {
      const photos = [
        { id: 'p-1', uploadedBy: 'artist-1', type: 'AFTER', url: 'https://cdn.example.com/1.jpg' },
        { id: 'p-2', uploadedBy: 'artist-1', type: 'AFTER', url: 'https://cdn.example.com/2.jpg' },
      ];
      (prisma.bookingPhoto.findMany as jest.Mock).mockResolvedValue(photos);

      const result = await getArtistPortfolio('artist-1');

      expect(result).toEqual(photos);
      expect(prisma.bookingPhoto.findMany).toHaveBeenCalledWith({
        where:   { uploadedBy: 'artist-1', type: 'AFTER' },
        orderBy: { uploadedAt: 'desc' },
      });
    });

    it('should return empty array when no photos', async () => {
      (prisma.bookingPhoto.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getArtistPortfolio('artist-no-photos');

      expect(result).toEqual([]);
    });
  });
});
