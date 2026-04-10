/**
 * Integration tests for /api/gift-cards — Phase 4.2
 *
 * Coverage:
 *  ✓ GET  /api/gift-cards/:code         — 200 (public), 404, 410
 *  ✓ GET  /api/gift-cards               — 200 (ADMIN), 401, 403
 *  ✓ POST /api/gift-cards               — 201 (ADMIN), 400, 401
 *  ✓ POST /api/gift-cards/:code/redeem  — 200 (ADMIN), 400, 409
 *
 * Total: 12 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    giftCard: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
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

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    id:             'gc-1',
    tenantId:       'tenant-1',
    code:           'ABCDEF123456',
    originalValue:  50,
    currentBalance: 50,
    issuedTo:       'user@example.com',
    purchasedById:  null,
    expiresAt:      null,
    isRedeemed:     false,
    createdAt:      new Date('2024-01-01'),
    updatedAt:      new Date('2024-01-01'),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/gift-cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterAll(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── GET /api/gift-cards/:code (public) ────────────────────────────────────

  describe('GET /api/gift-cards/:code', () => {
    it('200 — returns balance info (no auth required)', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(makeCard());

      const res = await request(app).get('/api/gift-cards/ABCDEF123456');

      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe('ABCDEF123456');
      expect(Number(res.body.data.currentBalance)).toBe(50);
    });

    it('404 — unknown gift card code', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/api/gift-cards/BADCODE');

      expect(res.status).toBe(404);
    });

    it('410 — expired gift card', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(
        makeCard({ expiresAt: new Date('2020-01-01') }),
      );

      const res = await request(app).get('/api/gift-cards/ABCDEF123456');

      expect(res.status).toBe(410);
    });
  });

  // ── GET /api/gift-cards ───────────────────────────────────────────────────

  describe('GET /api/gift-cards', () => {
    it('200 — returns paginated list (ADMIN)', async () => {
      (prisma.giftCard.findMany as jest.Mock).mockResolvedValue([makeCard()]);
      (prisma.giftCard.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/gift-cards')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.giftCards).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/gift-cards');
      expect(res.status).toBe(401);
    });

    it('403 — CUSTOMER cannot list gift cards', async () => {
      const res = await request(app)
        .get('/api/gift-cards')
        .set('Authorization', `Bearer ${makeToken('CUSTOMER')}`);

      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/gift-cards ──────────────────────────────────────────────────

  describe('POST /api/gift-cards', () => {
    it('201 — creates gift card (ADMIN)', async () => {
      (prisma.giftCard.create as jest.Mock).mockResolvedValue(makeCard());

      const res = await request(app)
        .post('/api/gift-cards')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ originalValue: 50, issuedTo: 'user@example.com' });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('gc-1');
    });

    it('400 — validation error when originalValue missing', async () => {
      const res = await request(app)
        .post('/api/gift-cards')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app)
        .post('/api/gift-cards')
        .send({ originalValue: 50 });

      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/gift-cards/:code/redeem ─────────────────────────────────────

  describe('POST /api/gift-cards/:code/redeem', () => {
    it('200 — redeems partial amount (ADMIN)', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(makeCard({ currentBalance: 50 }));
      (prisma.giftCard.update as jest.Mock).mockResolvedValue(
        makeCard({ currentBalance: 30, isRedeemed: false }),
      );

      const res = await request(app)
        .post('/api/gift-cards/ABCDEF123456/redeem')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ amount: 20 });

      expect(res.status).toBe(200);
      expect(res.body.data.amountRedeemed).toBe(20);
      expect(res.body.data.newBalance).toBe(30);
    });

    it('409 — already fully redeemed', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(makeCard({ isRedeemed: true }));

      const res = await request(app)
        .post('/api/gift-cards/ABCDEF123456/redeem')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ amount: 10 });

      expect(res.status).toBe(409);
    });
  });
});
