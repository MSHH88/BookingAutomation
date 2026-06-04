/**
 * Integration tests for /api/services — Phase 6.3
 *
 * Verifies the existing CRM services module (Step 1.13 / Phase 6.3) is
 * fully wired and all critical endpoints are reachable.
 *
 * Coverage:
 *  ✓ GET  /api/services                 — 200 list (public)
 *  ✓ GET  /api/services/:id             — 200 single, 404 not found
 *  ✓ POST /api/services                 — 201 (ADMIN), 400 validation, 401
 *  ✓ PATCH /api/services/:id            — 200 (ADMIN), 404
 *  ✓ DELETE /api/services/:id           — 200 soft-delete (ADMIN)
 *  ✓ GET  /api/services/categories      — 200 list (public)
 *  ✓ POST /api/services/categories      — 201 (ADMIN), 401
 *
 * Total: 10 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    serviceCategory: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
      count:      jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
    booking: {
      count: jest.fn().mockResolvedValue(0),
    },
    artistService: {
      findMany:   jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
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

function makeCategory(overrides: Record<string, unknown> = {}) {
  return {
    id:          'cat-1',
    tenantId:    'tenant-1',
    name:        'Haircuts',
    description: null,
    sortOrder:   0,
    isActive:    true,
    createdAt:   new Date(),
    updatedAt:   new Date(),
    ...overrides,
  };
}

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    id:                 'svc-1',
    tenantId:           'tenant-1',
    categoryId:         'cat-1',
    name:               'Full Cut',
    description:        null,
    durationMinutes:    60,
    priceFrom:          null,
    bufferMinutes:      0,
    rebookIntervalDays: null,
    isActive:           true,
    createdAt:          new Date(),
    updatedAt:          new Date(),
    category:           makeCategory(),
    artistServices:     [],
    ...overrides,
  };
}

// Use a business type that has SERVICE_MENU_ENABLED = true
beforeAll(() => { process.env['BUSINESS_TYPE'] = 'hair_salon'; });
afterAll(()  => { process.env['BUSINESS_TYPE'] = originalBizType; });

// ── GET /api/services ────────────────────────────────────────────────────────

describe('GET /api/services', () => {
  it('returns 200 with list (public)', async () => {
    (prisma.service.findMany as jest.Mock).mockResolvedValue([makeService()]);
    (prisma.service.count   as jest.Mock).mockResolvedValue(1);

    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── GET /api/services/categories ─────────────────────────────────────────────

describe('GET /api/services/categories', () => {
  it('returns 200 (public)', async () => {
    (prisma.serviceCategory.findMany as jest.Mock).mockResolvedValue([makeCategory()]);

    const res = await request(app).get('/api/services/categories');
    expect(res.status).toBe(200);
  });
});

// ── POST /api/services/categories ────────────────────────────────────────────

describe('POST /api/services/categories', () => {
  it('returns 201 for ADMIN', async () => {
    (prisma.serviceCategory.create as jest.Mock).mockResolvedValue(makeCategory());

    const res = await request(app)
      .post('/api/services/categories')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ name: 'Haircuts' });

    expect(res.status).toBe(201);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/services/categories')
      .send({ name: 'Test' });

    expect(res.status).toBe(401);
  });
});

// ── GET /api/services/:id ─────────────────────────────────────────────────────

describe('GET /api/services/:id', () => {
  it('returns 200 with service (public)', async () => {
    (prisma.service.findUnique as jest.Mock).mockResolvedValue(makeService());

    const res = await request(app).get('/api/services/svc-1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('svc-1');
  });

  it('returns 404 when not found', async () => {
    (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/services/missing');
    expect(res.status).toBe(404);
  });
});

// ── POST /api/services ────────────────────────────────────────────────────────

describe('POST /api/services', () => {
  const validBody = {
    categoryId:      'cat-1',
    name:            'Full Cut',
    durationMinutes: 60,
  };

  it('returns 201 for ADMIN', async () => {
    (prisma.serviceCategory.findUnique as jest.Mock).mockResolvedValue(makeCategory());
    (prisma.service.create as jest.Mock).mockResolvedValue(makeService());

    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send(validBody);

    expect(res.status).toBe(201);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ name: 'Missing category' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/services').send(validBody);
    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/services/:id ───────────────────────────────────────────────────

describe('PATCH /api/services/:id', () => {
  it('returns 200 on update (ADMIN)', async () => {
    (prisma.service.findUnique as jest.Mock).mockResolvedValue(makeService());
    (prisma.service.update as jest.Mock).mockResolvedValue(
      makeService({ name: 'Updated' }),
    );

    const res = await request(app)
      .patch('/api/services/svc-1')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
  });

  it('returns 404 when service not found', async () => {
    (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/services/missing')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/services/:id ──────────────────────────────────────────────────

describe('DELETE /api/services/:id', () => {
  it('returns 204 on soft-delete (ADMIN)', async () => {
    (prisma.service.findUnique as jest.Mock).mockResolvedValue(makeService());
    (prisma.service.update as jest.Mock).mockResolvedValue(
      makeService({ isActive: false }),
    );

    const res = await request(app)
      .delete('/api/services/svc-1')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

    expect(res.status).toBe(204);
  });
});
