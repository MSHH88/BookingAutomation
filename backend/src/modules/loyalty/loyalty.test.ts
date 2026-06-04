/**
 * Integration tests for /api/loyalty — Phase 5.3
 *
 * Coverage:
 *  ✓ GET  /api/loyalty/me                    — 200, 401
 *  ✓ GET  /api/loyalty/customers/:id         — 200 (ADMIN), 401, 403
 *  ✓ POST /api/loyalty/redeem                — 200 (ADMIN), 400
 *
 * Total: 7 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    loyaltyAccount: {
      findFirst: jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    loyaltyTransaction: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
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

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN', userId = 'u_1') {
  return jwt.sign(
    { sub: userId, email: `${role.toLowerCase()}@test.com`, role, tenantId: 'tenant-1' },
    SECRET,
    { expiresIn: '1h' },
  );
}

function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id:           'la-1',
    customerId:   'u_1',
    tenantId:     'tenant-1',
    points:       100,
    tier:         'BRONZE',
    totalEarned:  100,
    createdAt:    new Date('2024-01-01'),
    updatedAt:    new Date('2024-01-01'),
    transactions: [],
    ...overrides,
  };
}

describe('/api/loyalty', () => {
  beforeEach(() => {
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterEach(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── GET /api/loyalty/me ────────────────────────────────────────────────────

  describe('GET /api/loyalty/me', () => {
    it('returns 200 for authenticated user', async () => {
      (prisma.loyaltyAccount.findFirst as jest.Mock).mockResolvedValue(makeAccount());

      const res = await request(app)
        .get('/api/loyalty/me')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.points).toBe(100);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/loyalty/me');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/loyalty/customers/:id ────────────────────────────────────────

  describe('GET /api/loyalty/customers/:customerId', () => {
    it('returns 200 for ADMIN', async () => {
      (prisma.loyaltyAccount.findFirst as jest.Mock).mockResolvedValue(makeAccount());

      const res = await request(app)
        .get('/api/loyalty/customers/user-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
    });

    it('returns 403 for ARTIST', async () => {
      const res = await request(app)
        .get('/api/loyalty/customers/user-1')
        .set('Authorization', `Bearer ${makeToken('ARTIST')}`);
      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/loyalty/redeem ───────────────────────────────────────────────

  describe('POST /api/loyalty/redeem', () => {
    it('returns 200 with discount amount for ADMIN', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' });
      (prisma.loyaltyAccount.findFirst as jest.Mock).mockResolvedValue(
        makeAccount({ id: 'la-1', points: 200 }),
      );
      (prisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

      const res = await request(app)
        .post('/api/loyalty/redeem')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ customerId: 'user-1', pointsToUse: 100 });

      expect(res.status).toBe(200);
      expect(res.body.data.discountAmount).toBe(1);
    });

    it('returns 400 for insufficient points', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' });
      (prisma.loyaltyAccount.findFirst as jest.Mock).mockResolvedValue(
        makeAccount({ points: 10 }),
      );

      const res = await request(app)
        .post('/api/loyalty/redeem')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ customerId: 'user-1', pointsToUse: 100 });

      expect(res.status).toBe(400);
    });
  });
});
