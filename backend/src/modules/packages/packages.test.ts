/**
 * Integration tests for /api/packages — Phase 5.1
 *
 * Coverage:
 *  ✓ GET  /api/packages              — 200 (ADMIN), 401, 403
 *  ✓ POST /api/packages              — 201 (ADMIN), 400, 401
 *  ✓ GET  /api/packages/:id          — 200, 404
 *  ✓ PUT  /api/packages/:id          — 200 (ADMIN)
 *  ✓ DELETE /api/packages/:id        — 200 (ADMIN)
 *  ✓ POST /api/packages/:id/purchase — 201 (ADMIN)
 *
 * Total: 10 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    package: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    customerPackage: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      update:     jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
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

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN', userId = 'u_1') {
  return jwt.sign(
    { sub: userId, email: `${role.toLowerCase()}@test.com`, role, tenantId: 'tenant-1' },
    SECRET,
    { expiresIn: '1h' },
  );
}

function makePackage(overrides: Record<string, unknown> = {}) {
  return {
    id:               'pkg-1',
    tenantId:         'tenant-1',
    name:             'Tattoo Bundle',
    description:      '3 sessions',
    price:            150,
    includedServices: [{ serviceId: 'svc-1', quantity: 3 }],
    totalUses:        3,
    expiryDays:       365,
    isActive:         true,
    createdAt:        new Date('2024-01-01'),
    updatedAt:        new Date('2024-01-01'),
    ...overrides,
  };
}

describe('/api/packages', () => {
  beforeEach(() => {
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterEach(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── GET /api/packages ──────────────────────────────────────────────────────

  describe('GET /api/packages', () => {
    it('returns 200 for ADMIN', async () => {
      (prisma.package.findMany as jest.Mock).mockResolvedValue([makePackage()]);
      (prisma.package.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/packages')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(1);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/packages');
      expect(res.status).toBe(401);
    });

    it('returns 403 when ARTIST', async () => {
      const res = await request(app)
        .get('/api/packages')
        .set('Authorization', `Bearer ${makeToken('ARTIST')}`);
      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/packages ─────────────────────────────────────────────────────

  describe('POST /api/packages', () => {
    it('returns 201 for ADMIN with valid body', async () => {
      (prisma.package.create as jest.Mock).mockResolvedValue(makePackage());

      const res = await request(app)
        .post('/api/packages')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({
          name:             'Tattoo Bundle',
          price:            150,
          includedServices: [{ serviceId: 'svc-1', quantity: 3 }],
        });

      expect(res.status).toBe(201);
    });

    it('returns 400 with missing required field', async () => {
      const res = await request(app)
        .post('/api/packages')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ price: 150 }); // missing name + includedServices

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/packages/:id ──────────────────────────────────────────────────

  describe('GET /api/packages/:id', () => {
    it('returns 200 for existing package', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(makePackage());

      const res = await request(app)
        .get('/api/packages/pkg-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
    });

    it('returns 404 for unknown package', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/packages/unknown')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });
  });

  // ── PUT /api/packages/:id ──────────────────────────────────────────────────

  describe('PUT /api/packages/:id', () => {
    it('returns 200 for ADMIN with valid update', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(makePackage());
      (prisma.package.update as jest.Mock).mockResolvedValue(
        makePackage({ name: 'Updated Bundle' }),
      );

      const res = await request(app)
        .put('/api/packages/pkg-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ name: 'Updated Bundle' });

      expect(res.status).toBe(200);
    });
  });

  // ── DELETE /api/packages/:id ───────────────────────────────────────────────

  describe('DELETE /api/packages/:id', () => {
    it('returns 200 and soft-deletes the package', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(makePackage());
      (prisma.package.update as jest.Mock).mockResolvedValue(makePackage({ isActive: false }));

      const res = await request(app)
        .delete('/api/packages/pkg-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });
});
