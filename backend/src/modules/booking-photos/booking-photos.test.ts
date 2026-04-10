/**
 * Integration tests for /api/booking-photos — Phase 3.3
 *
 * Coverage:
 *  ✓ POST   /api/booking-photos/:bookingId          — 201 (ADMIN), 404, 401
 *  ✓ GET    /api/booking-photos/:bookingId           — 200 (ADMIN), 404
 *  ✓ DELETE /api/booking-photos/:photoId             — 200 (ADMIN), 404
 *  ✓ GET    /api/booking-photos/portfolio/:artistId  — 200 (public, no auth)
 *  ✓ 403 — CUSTOMER cannot upload photos
 *
 * Total: 8 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
    },
    bookingPhoto: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      delete:     jest.fn(),
    },
  },
}));

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
import jwt     from 'jsonwebtoken';

import { app }    from '../../app';
import { prisma } from '../../lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN', userId = 'u_1') {
  return jwt.sign(
    { sub: userId, email: `${role.toLowerCase()}@test.com`, role, tenantId: 'tenant-1' },
    SECRET,
    { expiresIn: '1h' },
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/booking-photos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterAll(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── POST /api/booking-photos/:bookingId ─────────────────────────────────

  describe('POST /api/booking-photos/:bookingId', () => {
    it('201 — creates a photo record', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-1',
      });
      const created = {
        id: 'p-1', bookingId: 'b-1', tenantId: 'tenant-1',
        url: 'https://cdn.example.com/photo.jpg', type: 'AFTER',
        description: null, uploadedBy: 'u_1', uploadedAt: new Date().toISOString(),
      };
      (prisma.bookingPhoto.create as jest.Mock).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/booking-photos/b-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ url: 'https://cdn.example.com/photo.jpg', type: 'AFTER' });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('p-1');
    });

    it('404 — booking not found', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/booking-photos/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ url: 'https://cdn.example.com/photo.jpg', type: 'BEFORE' });

      expect(res.status).toBe(404);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app)
        .post('/api/booking-photos/b-1')
        .send({ url: 'https://cdn.example.com/photo.jpg', type: 'BEFORE' });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/booking-photos/:bookingId ──────────────────────────────────

  describe('GET /api/booking-photos/:bookingId', () => {
    it('200 — returns photos for booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-1',
      });
      const photos = [
        { id: 'p-1', url: 'https://cdn.example.com/1.jpg', type: 'BEFORE' },
        { id: 'p-2', url: 'https://cdn.example.com/2.jpg', type: 'AFTER' },
      ];
      (prisma.bookingPhoto.findMany as jest.Mock).mockResolvedValue(photos);

      const res = await request(app)
        .get('/api/booking-photos/b-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('404 — booking not found', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/booking-photos/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/booking-photos/:photoId ─────────────────────────────────

  describe('DELETE /api/booking-photos/:photoId', () => {
    it('200 — deletes photo', async () => {
      (prisma.bookingPhoto.findUnique as jest.Mock).mockResolvedValue({
        id: 'p-1', tenantId: 'tenant-1',
      });
      (prisma.bookingPhoto.delete as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .delete('/api/booking-photos/p-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });

    it('404 — photo not found', async () => {
      (prisma.bookingPhoto.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/booking-photos/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/booking-photos/portfolio/:artistId (public) ────────────────

  describe('GET /api/booking-photos/portfolio/:artistId', () => {
    it('200 — returns portfolio without auth', async () => {
      const photos = [
        { id: 'p-1', uploadedBy: 'artist-1', type: 'AFTER', url: 'https://cdn.example.com/1.jpg' },
      ];
      (prisma.bookingPhoto.findMany as jest.Mock).mockResolvedValue(photos);

      const res = await request(app)
        .get('/api/booking-photos/portfolio/artist-1');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('AFTER');
    });
  });

  // ── Role checks ─────────────────────────────────────────────────────────

  describe('Role enforcement', () => {
    it('403 — CUSTOMER cannot upload photos', async () => {
      const res = await request(app)
        .post('/api/booking-photos/b-1')
        .set('Authorization', `Bearer ${makeToken('CUSTOMER')}`)
        .send({ url: 'https://cdn.example.com/photo.jpg', type: 'BEFORE' });

      expect(res.status).toBe(403);
    });
  });
});
