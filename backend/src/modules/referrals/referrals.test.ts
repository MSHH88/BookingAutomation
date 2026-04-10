/**
 * Integration tests for /api/referrals — Phase 3.5
 *
 * Coverage:
 *  ✓ GET  /api/referrals/lookup/:code       — 200 (public), 404
 *  ✓ GET  /api/referrals                     — 200 (ADMIN), 401, 403
 *  ✓ GET  /api/referrals/:id                 — 200 (ADMIN), 404
 *  ✓ POST /api/referrals/generate-code       — 200 (CUSTOMER)
 *  ✓ POST /api/referrals/link                — 201 (ADMIN), 404
 *  ✓ POST /api/referrals/:id/process-reward  — 200 (ADMIN), 409
 *
 * Total: 12 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    referral: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      findFirst:  jest.fn(),
      count:      jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst:  jest.fn(),
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/referrals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterAll(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── GET /api/referrals/lookup/:code (PUBLIC) ────────────────────────────

  describe('GET /api/referrals/lookup/:code', () => {
    it('200 — returns referrer info (no auth required)', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'u-1', name: 'Jane Doe',
      });

      const res = await request(app).get('/api/referrals/lookup/REF-ABCD1234');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ referrerId: 'u-1', referrerName: 'Jane Doe' });
    });

    it('404 — unknown referral code', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/api/referrals/lookup/REF-BAD');

      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/referrals ─────────────────────────────────────────────────

  describe('GET /api/referrals', () => {
    it('200 — returns paginated referrals (ADMIN)', async () => {
      (prisma.referral.findMany as jest.Mock).mockResolvedValue([
        { id: 'ref-1', tenantId: 'tenant-1', referrerId: 'u-1', refereeId: 'u-2', referralCode: 'REF-ABCD1234', rewardIssued: false },
      ]);
      (prisma.referral.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/referrals')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.referrals).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/referrals');
      expect(res.status).toBe(401);
    });

    it('403 — CUSTOMER cannot list referrals', async () => {
      const res = await request(app)
        .get('/api/referrals')
        .set('Authorization', `Bearer ${makeToken('CUSTOMER')}`);

      expect(res.status).toBe(403);
    });
  });

  // ── GET /api/referrals/:id ────────────────────────────────────────────

  describe('GET /api/referrals/:id', () => {
    it('200 — returns referral details (ADMIN)', async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: 'ref-1', tenantId: 'tenant-1', referrerId: 'u-1', refereeId: 'u-2',
      });

      const res = await request(app)
        .get('/api/referrals/ref-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('ref-1');
    });

    it('404 — referral not found', async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/referrals/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/referrals/generate-code ─────────────────────────────────

  describe('POST /api/referrals/generate-code', () => {
    it('200 — generates referral code for CUSTOMER', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u_1', referralCode: null,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/referrals/generate-code')
        .set('Authorization', `Bearer ${makeToken('CUSTOMER', 'u_1')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.referralCode).toMatch(/^REF-[A-F0-9]{8}$/);
    });
  });

  // ── POST /api/referrals/link ──────────────────────────────────────────

  describe('POST /api/referrals/link', () => {
    it('201 — links referee to referrer (ADMIN)', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'u-1' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-2' });
      (prisma.referral.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.referral.create as jest.Mock).mockResolvedValue({
        id: 'ref-1', tenantId: 'tenant-1', referrerId: 'u-1', refereeId: 'u-2',
        referralCode: 'REF-ABCD1234', rewardIssued: false,
      });

      const res = await request(app)
        .post('/api/referrals/link')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ referrerCode: 'REF-ABCD1234', refereeId: 'u-2' });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('ref-1');
    });

    it('404 — unknown referrer code', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/referrals/link')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ referrerCode: 'REF-BAD', refereeId: 'u-2' });

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/referrals/:id/process-reward ────────────────────────────

  describe('POST /api/referrals/:id/process-reward', () => {
    it('200 — processes reward (ADMIN)', async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: 'ref-1', tenantId: 'tenant-1', referrerId: 'u-1', rewardIssued: false,
      });
      (prisma.referral.update as jest.Mock).mockResolvedValue({
        id: 'ref-1', rewardIssued: true, rewardAmount: 25,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/referrals/ref-1/process-reward')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ rewardAmount: 25 });

      expect(res.status).toBe(200);
      expect(res.body.data.rewardIssued).toBe(true);
    });

    it('409 — reward already issued', async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: 'ref-1', tenantId: 'tenant-1', referrerId: 'u-1', rewardIssued: true,
      });

      const res = await request(app)
        .post('/api/referrals/ref-1/process-reward')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ rewardAmount: 25 });

      expect(res.status).toBe(409);
    });
  });
});
