/**
 * Integration tests for /api/customer-stats — Phase 3.4
 *
 * Coverage:
 *  ✓ GET /api/customer-stats/:customerId — 200 (ADMIN), 404, 401, 403 (ARTIST)
 *  ✓ GET /api/customer-stats             — 200 (ADMIN), 401, 403 (CUSTOMER)
 *
 * Total: 7 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
    },
    artist: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../lib/redis', () => ({
  getRedis: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  })),
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

describe('/api/customer-stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterAll(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── GET /api/customer-stats/:customerId ────────────────────────────────

  describe('GET /api/customer-stats/:customerId', () => {
    it('200 — returns stats for customer', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', tenantId: 'tenant-1',
      });

      (prisma.booking.findMany as jest.Mock)
        .mockResolvedValueOnce([])   // completed bookings
        .mockResolvedValueOnce([]);  // all booking ids

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/customer-stats/cust-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalSpend');
      expect(res.body.data).toHaveProperty('visitCount');
      expect(res.body.data).toHaveProperty('averageSpend');
    });

    it('404 — customer not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/customer-stats/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/customer-stats/cust-1');
      expect(res.status).toBe(401);
    });

    it('403 — ARTIST cannot access', async () => {
      const res = await request(app)
        .get('/api/customer-stats/cust-1')
        .set('Authorization', `Bearer ${makeToken('ARTIST')}`);

      expect(res.status).toBe(403);
    });
  });

  // ── GET /api/customer-stats ────────────────────────────────────────────

  describe('GET /api/customer-stats', () => {
    it('200 — returns paginated customers with stats', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'c-1', name: 'Alice', email: 'alice@test.com', createdAt: new Date('2025-01-01') },
      ]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      (prisma.booking.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/customer-stats')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Alice');
      expect(res.body.data[0].stats).toHaveProperty('totalSpend');
      expect(res.body.meta).toHaveProperty('total', 1);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/customer-stats');
      expect(res.status).toBe(401);
    });

    it('403 — CUSTOMER cannot access', async () => {
      const res = await request(app)
        .get('/api/customer-stats')
        .set('Authorization', `Bearer ${makeToken('CUSTOMER')}`);

      expect(res.status).toBe(403);
    });
  });
});
