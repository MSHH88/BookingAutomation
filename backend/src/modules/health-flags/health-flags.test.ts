/**
 * Integration tests for /api/health-flags — Phase 3.1
 *
 * Coverage:
 *  ✓ GET    /api/health-flags/:customerId          — 200 (ADMIN), 404, 401
 *  ✓ POST   /api/health-flags/:customerId          — 201 (ADMIN), 404
 *  ✓ DELETE /api/health-flags/:customerId/:flagId   — 200 (ADMIN), 404, 403 (CUSTOMER)
 *
 * Total: 8 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    healthFlag: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
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

describe('/api/health-flags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterAll(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── GET /api/health-flags/:customerId ───────────────────────────────────────

  describe('GET /api/health-flags/:customerId', () => {
    it('200 — returns health flags for customer', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', tenantId: 'tenant-1',
      });
      (prisma.healthFlag.findMany as jest.Mock).mockResolvedValue([
        { id: 'hf-1', customerId: 'cust-1', tenantId: 'tenant-1', type: 'LATEX_ALLERGY', severity: 'HIGH', notes: null, createdAt: new Date() },
      ]);

      const res = await request(app)
        .get('/api/health-flags/cust-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('LATEX_ALLERGY');
    });

    it('404 — customer not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/health-flags/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/health-flags/cust-1');
      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/health-flags/:customerId ──────────────────────────────────────

  describe('POST /api/health-flags/:customerId', () => {
    it('201 — creates a health flag', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', tenantId: 'tenant-1',
      });
      const created = {
        id: 'hf-new', customerId: 'cust-1', tenantId: 'tenant-1',
        type: 'BLOOD_THINNERS', severity: 'HIGH', notes: 'Warfarin',
        createdAt: new Date(), updatedAt: new Date(),
      };
      (prisma.healthFlag.create as jest.Mock).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/health-flags/cust-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ type: 'BLOOD_THINNERS', severity: 'HIGH', notes: 'Warfarin' });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('BLOOD_THINNERS');
    });

    it('404 — customer not found on create', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/health-flags/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ type: 'LATEX_ALLERGY' });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/health-flags/:customerId/:flagId ────────────────────────────

  describe('DELETE /api/health-flags/:customerId/:flagId', () => {
    it('200 — deletes a health flag', async () => {
      (prisma.healthFlag.findUnique as jest.Mock).mockResolvedValue({
        id: 'hf-1', customerId: 'cust-1', tenantId: 'tenant-1',
      });
      (prisma.healthFlag.delete as jest.Mock).mockResolvedValue({ id: 'hf-1' });

      const res = await request(app)
        .delete('/api/health-flags/cust-1/hf-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ id: 'hf-1' });
    });

    it('404 — flag not found', async () => {
      (prisma.healthFlag.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/health-flags/cust-1/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });

    it('403 — CUSTOMER role cannot delete', async () => {
      const res = await request(app)
        .delete('/api/health-flags/cust-1/hf-1')
        .set('Authorization', `Bearer ${makeToken('CUSTOMER')}`);

      expect(res.status).toBe(403);
    });
  });
});
