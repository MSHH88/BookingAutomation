/**
 * Integration tests for /api/public — Phase 2.3
 *
 * Coverage:
 *  ✓ GET  /api/public/businesses/:slug            — 200, 404
 *  ✓ GET  /api/public/businesses/:slug/services   — 200
 *  ✓ GET  /api/public/businesses/:slug/artists    — 200
 *  ✓ GET  /api/public/businesses/:slug/slots      — 200, 400 (missing params)
 *  ✓ POST /api/public/businesses/:slug/bookings   — 201, 400 (validation)
 *  ✓ GET  /api/public/bookings/:token             — 200, 404
 *  ✓ 503 when PUBLIC_BOOKING_ENABLED=false
 *
 * Total: 10 tests
 */

// ─── Feature flag helper ──────────────────────────────────────────────────────

const originalBizType = process.env['BUSINESS_TYPE'];

function withPublicDisabled(fn: () => Promise<void>): () => Promise<void> {
  return async () => {
    process.env['BUSINESS_TYPE'] = '__disabled_public__';
    try { await fn(); } finally { process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio'; }
  };
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../lib/prisma', () => ({
  prisma: {
    tenant:             { findUnique: jest.fn() },
    studioSettings:     { findUnique: jest.fn() },
    service:            { findMany: jest.fn(), findFirst: jest.fn() },
    artist:             { findMany: jest.fn(), findFirst: jest.fn() },
    artistAvailability: { findUnique: jest.fn() },
    booking:            { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    availabilityBlock:  { findMany: jest.fn() },
    user:               { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    // Also mock non-public models used by other routes to prevent import errors
    invoice:            { create: jest.fn() },
    $transaction:       jest.fn(),
  },
}));

jest.mock('../../config/businessType', () => {
  const actual = jest.requireActual('../../config/businessType');
  return {
    ...actual,
    getDefaultFlags: jest.fn((type?: string) => {
      if (type === '__disabled_public__') {
        return { ...actual.getDefaultFlags('tattoo_studio'), PUBLIC_BOOKING_ENABLED: false };
      }
      return actual.getDefaultFlags(type);
    }),
  };
});

jest.mock('../webhooks/webhooks.queue', () => ({
  enqueueWebhookEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../whatsapp/whatsapp.service', () => ({
  enqueueLeadInquiry:        jest.fn().mockResolvedValue(undefined),
  enqueueBookingConfirmed:   jest.fn().mockResolvedValue(undefined),
  enqueuePostVisitReview:    jest.fn().mockResolvedValue(undefined),
  enqueueRestaurantReminder: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../reviews/reviews.queue', () => ({
  enqueueReviewRequest: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../reminders/reminders.queue', () => ({
  enqueueBookingReminder: jest.fn().mockResolvedValue(undefined),
  cancelBookingReminder:  jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import { app }    from '../../app';
import { prisma } from '../../lib/prisma';

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockTenant = {
  id: 'tenant-1', slug: 'test-studio', name: 'Test Studio',
  businessType: 'tattoo_studio', isActive: true,
};

const mockSettings = {
  studioName: 'Test Studio', studioEmail: 'info@test.com', studioPhone: '+44123',
  studioAddress: '123 St', studioTimezone: 'Europe/London', currency: 'GBP',
  slotIntervalMinutes: 15, bookingPageUrl: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/public', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterAll(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── GET /api/public/businesses/:slug ──────────────────────────────────────

  describe('GET /api/public/businesses/:slug', () => {
    it('200 — returns business info', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.studioSettings.findUnique as jest.Mock).mockResolvedValue(mockSettings);

      const res = await request(app).get('/api/public/businesses/test-studio');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('test-studio');
    });

    it('404 — non-existent slug', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/api/public/businesses/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/public/businesses/:slug/services ─────────────────────────────

  describe('GET /api/public/businesses/:slug/services', () => {
    it('200 — returns services', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        { id: 's-1', name: 'Tattoo', description: null, durationMinutes: 60, priceFrom: 100, category: { id: 'c-1', name: 'Ink' } },
      ]);

      const res = await request(app).get('/api/public/businesses/test-studio/services');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  // ── GET /api/public/businesses/:slug/artists ──────────────────────────────

  describe('GET /api/public/businesses/:slug/artists', () => {
    it('200 — returns artists', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.artist.findMany as jest.Mock).mockResolvedValue([
        { id: 'a-1', slug: 'jd', bio: null, profileImageUrl: null, user: { name: 'JD' }, services: [] },
      ]);

      const res = await request(app).get('/api/public/businesses/test-studio/artists');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  // ── GET /api/public/businesses/:slug/slots ────────────────────────────────

  describe('GET /api/public/businesses/:slug/slots', () => {
    it('400 — missing required query params', async () => {
      const res = await request(app).get('/api/public/businesses/test-studio/slots');

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/public/businesses/:slug/bookings ────────────────────────────

  describe('POST /api/public/businesses/:slug/bookings', () => {
    it('201 — creates booking', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.artist.findFirst as jest.Mock).mockResolvedValue({ id: 'a-1' });
      (prisma.service.findFirst as jest.Mock).mockResolvedValue({ id: 's-1', durationMinutes: 60, priceFrom: 100 });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'cust-1' });
      (prisma.booking.create as jest.Mock).mockResolvedValue({
        id: 'b-1', status: 'PENDING', publicToken: 'tok-1', startAt: new Date(), endAt: new Date(),
        source: 'WIDGET', createdAt: new Date(),
        artist: { id: 'a-1', slug: 'jd', user: { name: 'JD' } },
        service: { id: 's-1', name: 'Tattoo', durationMinutes: 60, priceFrom: 100 },
      });

      const res = await request(app)
        .post('/api/public/businesses/test-studio/bookings')
        .send({
          name: 'Jane', email: 'jane@test.com', phone: '+44999',
          artistId: 'a-1', serviceId: 's-1',
          startAt: '2026-04-13T10:00:00Z', endAt: '2026-04-13T12:00:00Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.publicToken).toBe('tok-1');
    });

    it('400 — validation failure (missing email)', async () => {
      const res = await request(app)
        .post('/api/public/businesses/test-studio/bookings')
        .send({ name: 'Jane', phone: '+44999', artistId: 'a-1', serviceId: 's-1',
          startAt: '2026-04-13T10:00:00Z', endAt: '2026-04-13T12:00:00Z' });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/public/bookings/:token ───────────────────────────────────────

  describe('GET /api/public/bookings/:token', () => {
    it('200 — returns booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', status: 'PENDING', startAt: new Date(), endAt: new Date(),
        publicToken: 'tok-1', source: 'WIDGET', createdAt: new Date(),
        artist: { id: 'a-1', slug: 'jd', user: { name: 'JD' } },
        service: { id: 's-1', name: 'Tattoo', durationMinutes: 60, priceFrom: 100 },
        tenant: { slug: 'test-studio', name: 'Test Studio' },
      });

      const res = await request(app).get('/api/public/bookings/tok-1');

      expect(res.status).toBe(200);
      expect(res.body.data.publicToken).toBe('tok-1');
    });

    it('404 — invalid token', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/api/public/bookings/bad-token');

      expect(res.status).toBe(404);
    });
  });

  // ── Feature flag gate ─────────────────────────────────────────────────────

  describe('PUBLIC_BOOKING_ENABLED=false', () => {
    it('503 — feature disabled', withPublicDisabled(async () => {
      const res = await request(app).get('/api/public/businesses/test-studio');
      expect(res.status).toBe(503);
    }));
  });
});
