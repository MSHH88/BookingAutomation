/**
 * Public booking widget service — unit tests — Phase 2.3
 *
 * Tests for the public booking service functions:
 *
 *  1. getBusinessInfo — returns studio info for valid slug
 *  2. getBusinessInfo — throws 404 for invalid slug
 *  3. getBusinessServices — returns active services
 *  4. getBusinessArtists — returns artists, optionally filtered
 *  5. getBusinessSlots — returns available slots
 *  6. getBusinessSlots — returns empty when artist not available
 *  7. createPublicBooking — creates booking with PENDING status
 *  8. createPublicBooking — creates booking with AWAITING_DEPOSIT when deposit required
 *  9. createPublicBooking — creates customer if not found
 * 10. createPublicBooking — throws 404 for invalid artist
 * 11. getBookingByToken — returns booking for valid token
 * 12. getBookingByToken — throws 404 for invalid token
 *
 * Total: 12 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockTenant = {
  id:           'tenant-1',
  slug:         'test-studio',
  name:         'Test Studio',
  businessType: 'tattoo_studio',
  isActive:     true,
};

const mockSettings = {
  studioName:        'Test Studio',
  studioEmail:       'info@test.com',
  studioPhone:       '+44123456789',
  studioAddress:     '123 Test St',
  studioTimezone:    'Europe/London',
  currency:          'GBP',
  slotIntervalMinutes: 15,
  bookingPageUrl:    null,
};

const mockService = {
  id:              'service-1',
  name:            'Full Sleeve Tattoo',
  description:     'Complete sleeve piece',
  durationMinutes: 120,
  priceFrom:       250,
  category:        { id: 'cat-1', name: 'Tattoos' },
};

const mockArtist = {
  id:              'artist-1',
  slug:            'john-doe',
  bio:             'Expert tattoo artist',
  profileImageUrl: null,
  user:            { name: 'John Doe' },
  services:        [{ serviceId: 'service-1', customPrice: null }],
  slotDuration:    90,
  bufferMinutes:   30,
};

jest.mock('../../lib/prisma', () => {
  const bookingMock = {
    findMany:   jest.fn(),
    findFirst:  jest.fn(),
    create:     jest.fn(),
    findUnique: jest.fn(),
  };
  return {
    prisma: {
      tenant:              { findUnique: jest.fn() },
      studioSettings:      { findUnique: jest.fn() },
      service:             { findMany: jest.fn(), findFirst: jest.fn() },
      artist:              { findMany: jest.fn(), findFirst: jest.fn() },
      artistService:       { findFirst: jest.fn() },
      artistAvailability:  { findUnique: jest.fn() },
      booking:             bookingMock,
      availabilityBlock:   { findMany: jest.fn() },
      user:                { findFirst: jest.fn(), create: jest.fn() },
      $transaction: jest.fn().mockImplementation((fn: (tx: typeof bookingMock) => Promise<unknown>) =>
        fn({ booking: bookingMock } as any),
      ),
    },
  };
});

jest.mock('../../config/businessType', () => ({
  getDefaultFlags: jest.fn().mockReturnValue({
    DEPOSIT_REQUIRED: false,
    PUBLIC_BOOKING_ENABLED: true,
  }),
  BUSINESS_TYPES: ['tattoo_studio', 'hair_salon', 'barber', 'nail_salon', 'masseuse', 'restaurant'],
  activeBusinessType: 'tattoo_studio',
}));

jest.mock('../webhooks/webhooks.queue', () => ({
  enqueueWebhookEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../middleware/requireFeature', () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(false),
  requireFeature:   jest.fn(() => (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next()),
}));

import { prisma } from '../../lib/prisma';
import { isFeatureEnabled } from '../../middleware/requireFeature';
import {
  getBusinessInfo,
  getBusinessServices,
  getBusinessArtists,
  getBusinessSlots,
  createPublicBooking,
  getBookingByToken,
} from './public.service';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('public.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getBusinessInfo ────────────────────────────────────────────────────────

  describe('getBusinessInfo', () => {
    it('should return studio info for a valid slug', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.studioSettings.findUnique as jest.Mock).mockResolvedValue(mockSettings);

      const result = await getBusinessInfo('test-studio');

      expect(result.slug).toBe('test-studio');
      expect(result.name).toBe('Test Studio');
      expect(result.timezone).toBe('Europe/London');
    });

    it('should throw 404 for non-existent slug', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getBusinessInfo('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
        code: 'BUSINESS_NOT_FOUND',
      });
    });
  });

  // ── getBusinessServices ────────────────────────────────────────────────────

  describe('getBusinessServices', () => {
    it('should return active services', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockService]);

      const result = await getBusinessServices('test-studio');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Full Sleeve Tattoo');
    });
  });

  // ── getBusinessArtists ─────────────────────────────────────────────────────

  describe('getBusinessArtists', () => {
    it('should return active artists', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.artist.findMany as jest.Mock).mockResolvedValue([mockArtist]);

      const result = await getBusinessArtists('test-studio', {});

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('john-doe');
    });

    it('should filter artists by serviceId', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.artist.findMany as jest.Mock).mockResolvedValue([mockArtist]);

      const result = await getBusinessArtists('test-studio', { serviceId: 'service-1' });

      expect(result).toHaveLength(1);
      expect(prisma.artist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            services: { some: { serviceId: 'service-1' } },
          }),
        }),
      );
    });
  });

  // ── getBusinessSlots ───────────────────────────────────────────────────────

  describe('getBusinessSlots', () => {
    it('should return available slots', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.artist.findFirst as jest.Mock).mockResolvedValue({ id: 'artist-1', slotDuration: 90, bufferMinutes: 30 });
      (prisma.service.findFirst as jest.Mock).mockResolvedValue({ id: 'service-1', durationMinutes: 60, bufferMinutes: 0 });
      (prisma.artistAvailability.findUnique as jest.Mock).mockResolvedValue({
        startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00', isActive: true,
      });
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.availabilityBlock.findMany as jest.Mock).mockResolvedValue([]);

      // 2026-04-13 is a Monday (dayOfWeek=1)
      const result = await getBusinessSlots('test-studio', {
        date: '2026-04-13', serviceId: 'service-1', artistId: 'artist-1',
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Each slot should have startAt and endAt
      expect(result[0]).toHaveProperty('startAt');
      expect(result[0]).toHaveProperty('endAt');
    });

    it('should return empty when artist not available', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.artist.findFirst as jest.Mock).mockResolvedValue({ id: 'artist-1', slotDuration: 90, bufferMinutes: 30 });
      (prisma.service.findFirst as jest.Mock).mockResolvedValue({ id: 'service-1', durationMinutes: 60, bufferMinutes: 0 });
      (prisma.artistAvailability.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getBusinessSlots('test-studio', {
        date: '2026-04-13', serviceId: 'service-1', artistId: 'artist-1',
      });

      expect(result).toEqual([]);
    });
  });

  // ── createPublicBooking ────────────────────────────────────────────────────

  describe('createPublicBooking', () => {
    const validBody = {
      name:      'Jane Customer',
      email:     'jane@example.com',
      phone:     '+44999888777',
      artistId:  'artist-1',
      serviceId: 'service-1',
      startAt:   '2026-04-13T10:00:00Z',
      endAt:     '2026-04-13T12:00:00Z',
    };

    it('should create a booking with PENDING status', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.artist.findFirst as jest.Mock).mockResolvedValue({ id: 'artist-1' });
      (prisma.service.findFirst as jest.Mock).mockResolvedValue({ id: 'service-1', durationMinutes: 120, priceFrom: 250 });
      (prisma.artistService.findFirst as jest.Mock).mockResolvedValue({ id: 'as-1' });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'customer-1' });
      (isFeatureEnabled as jest.Mock).mockResolvedValue(false); // DEPOSIT_REQUIRED = false
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null); // no conflict
      (prisma.booking.create as jest.Mock).mockResolvedValue({
        id: 'booking-1', status: 'PENDING', publicToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', startAt: new Date(), endAt: new Date(),
        source: 'WIDGET', createdAt: new Date(),
        artist: { id: 'artist-1', slug: 'john-doe', user: { name: 'John Doe' } },
        service: { id: 'service-1', name: 'Full Sleeve', durationMinutes: 120, priceFrom: 250 },
      });

      const result = await createPublicBooking('test-studio', validBody);

      expect(result.status).toBe('PENDING');
      expect(result.depositRequired).toBe(false);
    });

    it('should create booking with AWAITING_DEPOSIT when deposit required', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.artist.findFirst as jest.Mock).mockResolvedValue({ id: 'artist-1' });
      (prisma.service.findFirst as jest.Mock).mockResolvedValue({ id: 'service-1', durationMinutes: 120, priceFrom: 250 });
      (prisma.artistService.findFirst as jest.Mock).mockResolvedValue({ id: 'as-1' });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'customer-1' });
      (isFeatureEnabled as jest.Mock).mockResolvedValue(true); // DEPOSIT_REQUIRED = true
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null); // no conflict
      (prisma.booking.create as jest.Mock).mockResolvedValue({
        id: 'booking-1', status: 'AWAITING_DEPOSIT', publicToken: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', startAt: new Date(), endAt: new Date(),
        source: 'WIDGET', createdAt: new Date(),
        artist: { id: 'artist-1', slug: 'john-doe', user: { name: 'John Doe' } },
        service: { id: 'service-1', name: 'Full Sleeve', durationMinutes: 120, priceFrom: 250 },
      });

      const result = await createPublicBooking('test-studio', validBody);

      expect(result.status).toBe('AWAITING_DEPOSIT');
      expect(result.depositRequired).toBe(true);
    });

    it('should create customer if not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.artist.findFirst as jest.Mock).mockResolvedValue({ id: 'artist-1' });
      (prisma.service.findFirst as jest.Mock).mockResolvedValue({ id: 'service-1', durationMinutes: 120, priceFrom: 250 });
      (prisma.artistService.findFirst as jest.Mock).mockResolvedValue({ id: 'as-1' });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null); // no existing customer
      (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'new-customer' });
      (isFeatureEnabled as jest.Mock).mockResolvedValue(false); // DEPOSIT_REQUIRED = false
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null); // no conflict
      (prisma.booking.create as jest.Mock).mockResolvedValue({
        id: 'booking-2', status: 'PENDING', publicToken: 'c3d4e5f6-a7b8-9012-cdef-123456789012', startAt: new Date(), endAt: new Date(),
        source: 'WIDGET', createdAt: new Date(),
        artist: { id: 'artist-1', slug: 'john-doe', user: { name: 'John Doe' } },
        service: { id: 'service-1', name: 'Full Sleeve', durationMinutes: 120, priceFrom: 250 },
      });

      await createPublicBooking('test-studio', validBody);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'jane@example.com',
            role: 'CUSTOMER',
          }),
        }),
      );
    });

    it('should throw 404 for invalid artist', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.artist.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(createPublicBooking('test-studio', validBody)).rejects.toMatchObject({
        statusCode: 404,
        code: 'ARTIST_NOT_FOUND',
      });
    });
  });

  // ── getBookingByToken ──────────────────────────────────────────────────────

  describe('getBookingByToken', () => {
    it('should return booking for valid token', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'booking-1', status: 'PENDING', startAt: new Date(), endAt: new Date(),
        publicToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', source: 'WIDGET', createdAt: new Date(),
      });

      const result = await getBookingByToken('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(result.id).toBe('booking-1');
    });

    it('should throw 400 for invalid token format', async () => {
      await expect(getBookingByToken('bad-token')).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_TOKEN',
      });
    });
  });
});
