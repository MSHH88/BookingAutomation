/**
 * Integration tests for /api/pos — Phase 4.4
 *
 * Coverage:
 *  ✓ POST /api/pos/checkout         — 201 (ADMIN), 400, 401, 404
 *  ✓ GET  /api/pos/transactions     — 200 (ADMIN), 401
 *  ✓ GET  /api/pos/summary          — 200 (ADMIN), 401
 *
 * Total: 8 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    giftCard: {
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    artist: {
      findUnique: jest.fn(),
    },
    booking: {
      create: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    payment: {
      create:   jest.fn(),
      findMany: jest.fn(),
      count:    jest.fn(),
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

jest.mock('../../lib/redis', () => ({
  getRedis: jest.fn(() => ({
    get:   jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    incr:  jest.fn().mockResolvedValue(1),
  })),
  isRedisHealthy: jest.fn(() => null),
  pingRedis:      jest.fn().mockResolvedValue(undefined),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
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

describe('/api/pos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterAll(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── POST /api/pos/checkout ────────────────────────────────────────────────

  describe('POST /api/pos/checkout', () => {
    it('201 — creates booking and payment (ADMIN)', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue({ id: 'artist-1', tenantId: 'tenant-1' });
      (prisma.booking.create as jest.Mock).mockResolvedValue({
        id:          'book-1',
        tenantId:    'tenant-1',
        artistId:    'artist-1',
        status:      'COMPLETED',
        source:      'POS',
        totalAmount: 45,
        createdAt:   new Date(),
      });
      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id:       'pay-1',
        amount:   45,
        status:   'SUCCEEDED',
        method:   'CARD',
      });

      const res = await request(app)
        .post('/api/pos/checkout')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({
          artistId:     'artist-1',
          customerName: 'Walk-in Customer',
          amount:       45,
          method:       'CARD',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.booking.id).toBe('book-1');
      expect(res.body.data.payment.id).toBe('pay-1');
    });

    it('400 — validation error when amount is missing', async () => {
      const res = await request(app)
        .post('/api/pos/checkout')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ artistId: 'artist-1', customerName: 'Walk-in' });

      expect(res.status).toBe(400);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app)
        .post('/api/pos/checkout')
        .send({ artistId: 'artist-1', customerName: 'Walk-in', amount: 45 });

      expect(res.status).toBe(401);
    });

    it('404 — artist not found', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/pos/checkout')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ artistId: 'bad-artist', customerName: 'Walk-in', amount: 45 });

      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/pos/transactions ─────────────────────────────────────────────

  describe('GET /api/pos/transactions', () => {
    it('200 — returns paginated transactions (ADMIN)', async () => {
      (prisma.payment.findMany as jest.Mock).mockResolvedValue([
        { id: 'pay-1', amount: 45, status: 'SUCCEEDED', method: 'CARD', booking: {} },
      ]);
      (prisma.payment.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/pos/transactions')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.payments).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/pos/transactions');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/pos/summary ──────────────────────────────────────────────────

  describe('GET /api/pos/summary', () => {
    it('200 — returns daily summary (ADMIN)', async () => {
      (prisma.payment.findMany as jest.Mock).mockResolvedValue([
        { amount: 45, tipAmount: 5, method: 'CARD' },
        { amount: 30, tipAmount: null, method: 'CASH' },
      ]);

      const res = await request(app)
        .get('/api/pos/summary?date=2024-06-01')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalRevenue).toBe(75);
      expect(res.body.data.totalTips).toBe(5);
      expect(res.body.data.transactionCount).toBe(2);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/pos/summary');
      expect(res.status).toBe(401);
    });
  });
});
