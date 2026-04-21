/**
 * Integration tests for /api/recurring-bookings — Phase 1, Step 1.8
 *
 * Coverage:
 *  ✓ GET    /api/recurring-bookings       — 200 ADMIN, 401 unauth
 *  ✓ GET    /api/recurring-bookings/:id   — 200 found, 404 not found
 *  ✓ POST   /api/recurring-bookings       — 201 created, 400 validation
 *  ✓ PATCH  /api/recurring-bookings/:id   — 200 updated, 400 empty body
 *  ✓ DELETE /api/recurring-bookings/:id   — 200 deactivated
 *  ✓ 403 when non-ADMIN
 *  ✓ 503 when RECURRING_BOOKINGS_ENABLED=false
 *
 * 12 tests total
 */

// ─── Side-effect mocks (must come before app import) ─────────────────────────

jest.mock('../whatsapp/whatsapp.service', () => ({
  enqueueLeadInquiry:        jest.fn().mockResolvedValue(undefined),
  enqueueBookingConfirmed:   jest.fn().mockResolvedValue(undefined),
  enqueuePostVisitReview:    jest.fn().mockResolvedValue(undefined),
  enqueueRestaurantReminder: jest.fn().mockResolvedValue(undefined),
  testSendWhatsApp:          jest.fn().mockResolvedValue({ messageSid: 'SM_test' }),
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
    get:   jest.fn().mockRejectedValue(new Error('mock')),
    setex: jest.fn().mockRejectedValue(new Error('mock')),
    incr:  jest.fn().mockResolvedValue(1),
  })),
  isRedisHealthy: jest.fn(() => false),
  pingRedis:      jest.fn().mockResolvedValue(undefined),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user:             { findUnique: jest.fn() },
    artist:           { findUnique: jest.fn() },
    service:          { findUnique: jest.fn() },
    recurringBooking: {
      findFirst:  jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
  },
}));

jest.mock('bullmq', () => ({
  Queue:  jest.fn().mockImplementation(() => ({ add: jest.fn(), close: jest.fn() })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';

import { app }    from '../../app';
import { prisma } from '../../lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN', userId = 'u_1') {
  return `Bearer ${jwt.sign(
    { sub: userId, email: 'test@example.com', role, tenantId: 'tenant_1' },
    SECRET,
    { expiresIn: '15m' },
  )}`;
}

const baseRecord = {
  id:              'rb_1',
  tenantId:        'tenant_1',
  customerId:      'customer_1',
  serviceId:       'service_1',
  artistId:        'artist_1',
  intervalDays:    30,
  nextBookingDate: new Date('2026-05-06T10:00:00Z'),
  isActive:        true,
  createdAt:       new Date(),
  updatedAt:       new Date(),
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/recurring-bookings', () => {
  it('200 — ADMIN lists recurring bookings', async () => {
    (prisma.recurringBooking.findMany as jest.Mock).mockResolvedValue([baseRecord]);
    (prisma.recurringBooking.count    as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/recurring-bookings')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get('/api/recurring-bookings');
    expect(res.status).toBe(401);
  });

  it('403 — ARTIST cannot list recurring bookings', async () => {
    const res = await request(app)
      .get('/api/recurring-bookings')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/recurring-bookings/:id', () => {
  it('200 — ADMIN gets recurring booking', async () => {
    (prisma.recurringBooking.findFirst as jest.Mock).mockResolvedValue(baseRecord);

    const res = await request(app)
      .get('/api/recurring-bookings/rb_1')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('rb_1');
  });

  it('404 — unknown recurring booking', async () => {
    (prisma.recurringBooking.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/recurring-bookings/nonexistent')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/recurring-bookings', () => {
  it('201 — ADMIN creates recurring booking', async () => {
    (prisma.user.findUnique    as jest.Mock).mockResolvedValue({ tenantId: 'tenant_1' });
    (prisma.artist.findUnique  as jest.Mock).mockResolvedValue({ tenantId: 'tenant_1' });
    (prisma.service.findUnique as jest.Mock).mockResolvedValue({ tenantId: 'tenant_1' });
    (prisma.recurringBooking.create as jest.Mock).mockResolvedValue(baseRecord);

    const res = await request(app)
      .post('/api/recurring-bookings')
      .set('Authorization', makeToken('ADMIN'))
      .send({
        customerId:      'customer_1',
        serviceId:       'service_1',
        artistId:        'artist_1',
        intervalDays:    30,
        nextBookingDate: '2026-05-06T10:00:00Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('rb_1');
  });

  it('403 — customer belongs to a different tenant', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ tenantId: 'tenant_other' });

    const res = await request(app)
      .post('/api/recurring-bookings')
      .set('Authorization', makeToken('ADMIN'))
      .send({
        customerId:      'customer_x',
        intervalDays:    30,
        nextBookingDate: '2026-05-06T10:00:00Z',
      });

    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('CUSTOMER_FORBIDDEN');
  });

  it('400 — validation error (missing customerId)', async () => {
    const res = await request(app)
      .post('/api/recurring-bookings')
      .set('Authorization', makeToken('ADMIN'))
      .send({ intervalDays: 30, nextBookingDate: '2026-05-06T10:00:00Z' });

    expect(res.status).toBe(400);
  });

  it('400 — validation error (intervalDays out of range)', async () => {
    const res = await request(app)
      .post('/api/recurring-bookings')
      .set('Authorization', makeToken('ADMIN'))
      .send({
        customerId:      'customer_1',
        intervalDays:    0,
        nextBookingDate: '2026-05-06T10:00:00Z',
      });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/recurring-bookings/:id', () => {
  it('200 — ADMIN updates recurring booking', async () => {
    (prisma.recurringBooking.findFirst as jest.Mock).mockResolvedValue(baseRecord);
    (prisma.recurringBooking.update    as jest.Mock).mockResolvedValue({ ...baseRecord, intervalDays: 60 });

    const res = await request(app)
      .patch('/api/recurring-bookings/rb_1')
      .set('Authorization', makeToken('ADMIN'))
      .send({ intervalDays: 60 });

    expect(res.status).toBe(200);
    expect(res.body.data.intervalDays).toBe(60);
  });

  it('400 — empty body rejected', async () => {
    const res = await request(app)
      .patch('/api/recurring-bookings/rb_1')
      .set('Authorization', makeToken('ADMIN'))
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/recurring-bookings/:id', () => {
  it('200 — ADMIN deactivates recurring booking', async () => {
    (prisma.recurringBooking.findFirst as jest.Mock).mockResolvedValue(baseRecord);
    (prisma.recurringBooking.update    as jest.Mock).mockResolvedValue({ ...baseRecord, isActive: false });

    const res = await request(app)
      .delete('/api/recurring-bookings/rb_1')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Feature flag gating', () => {
  it('503 — when RECURRING_BOOKINGS_ENABLED is false', async () => {
    const orig = process.env['BUSINESS_TYPE'];
    process.env['BUSINESS_TYPE'] = 'restaurant';

    const res = await request(app)
      .get('/api/recurring-bookings')
      .set('Authorization', makeToken('ADMIN'));

    process.env['BUSINESS_TYPE'] = orig;

    expect(res.status).toBe(503);
  });
});
