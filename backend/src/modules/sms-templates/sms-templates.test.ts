/**
 * Integration tests for /api/messages/sms-templates — Phase 1 (Messaging Foundation)
 *
 * Tests the full HTTP → controller → service stack with Prisma and Redis
 * fully mocked.  No real database or cache server is needed.
 *
 * Coverage:
 *  ✓ GET /api/messages/sms-templates
 *      — 200 with paginated template list
 *      — 401 when no Authorization header
 *      — 403 when authenticated as ARTIST
 *
 *  ✓ GET /api/messages/sms-templates/:key
 *      — 200 returns single template
 *      — 404 when template not found
 *
 *  ✓ PATCH /api/messages/sms-templates/:key
 *      — 200 success when ADMIN sends a valid update
 *      — 400 when body is empty {}
 *      — 401 when no Authorization header
 *
 *  ✓ POST /api/messages/sms-templates/:key/preview
 *      — 200 returns rendered preview
 *      — 400 when variables is not an object
 *      — 401 when no Authorization header
 *
 * Total: 11 tests across 4 describes
 */

// ─── Env vars before any import ──────────────────────────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Queue / external-service mocks (must come before app import) ─────────────

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

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockFindFirst = jest.fn();
const mockFindMany  = jest.fn();
const mockCount     = jest.fn();
const mockUpdate    = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    smsTemplate: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      findMany:  (...a: unknown[]) => mockFindMany(...a),
      count:     (...a: unknown[]) => mockCount(...a),
      update:    (...a: unknown[]) => mockUpdate(...a),
    },
    featureFlag: { findUnique: jest.fn() },
  },
}));

// ─── Redis mock ───────────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

jest.mock('../../lib/redis', () => ({
  getRedis: () => ({
    get: (...a: unknown[]) => mockRedisGet(...a),
    set: (...a: unknown[]) => mockRedisSet(...a),
    del: (...a: unknown[]) => mockRedisDel(...a),
  }),
}));

// ─── Template renderer mock ──────────────────────────────────────────────────

jest.mock('../../lib/template-renderer', () => ({
  renderTemplate: jest.fn().mockReturnValue('Rendered preview text'),
}));

// ─── BullMQ / ioredis mocks ──────────────────────────────────────────────────

jest.mock('bullmq', () => ({
  Queue:  jest.fn().mockImplementation(() => ({ add: jest.fn() })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}));
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ on: jest.fn() })));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN'): string {
  return `Bearer ${jwt.sign(
    {
      sub:            'u_admin',
      email:          'admin@test.com',
      role,
      tenantId:       'tenant1',
      canViewLeads:   false,
      canAssignRoles: false,
    },
    SECRET,
    { expiresIn: '15m' },
  )}`;
}

const templateFixture = {
  id:        'stpl_1',
  tenantId:  'tenant1',
  key:       'booking-confirmation',
  body:      'Hi {{customerName}}, your booking is confirmed!',
  variables: ['customerName'],
  isActive:  true,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRedisGet.mockResolvedValue(null);
  mockRedisSet.mockResolvedValue('OK');
  mockRedisDel.mockResolvedValue(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messages/sms-templates
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/messages/sms-templates', () => {
  it('200 — returns paginated template list', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([templateFixture]);

    const res = await request(app)
      .get('/api/messages/sms-templates')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ total: 1 });
  });

  it('401 when no Authorization header', async () => {
    const res = await request(app).get('/api/messages/sms-templates');
    expect(res.status).toBe(401);
  });

  it('403 when authenticated as ARTIST', async () => {
    const res = await request(app)
      .get('/api/messages/sms-templates')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messages/sms-templates/:key
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/messages/sms-templates/:key', () => {
  it('200 — returns single template', async () => {
    mockFindFirst.mockResolvedValue(templateFixture);

    const res = await request(app)
      .get('/api/messages/sms-templates/booking-confirmation')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ key: 'booking-confirmation' });
  });

  it('404 when template not found', async () => {
    mockFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/messages/sms-templates/nonexistent')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/messages/sms-templates/:key
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/messages/sms-templates/:key', () => {
  it('200 — success when ADMIN sends a valid update', async () => {
    mockFindFirst.mockResolvedValue({ id: 'stpl_1' });
    mockUpdate.mockResolvedValue({ ...templateFixture, body: 'Updated body' });

    const res = await request(app)
      .patch('/api/messages/sms-templates/booking-confirmation')
      .set('Authorization', makeToken('ADMIN'))
      .send({ body: 'Updated body' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ body: 'Updated body' });
  });

  it('400 when body is empty {}', async () => {
    const res = await request(app)
      .patch('/api/messages/sms-templates/booking-confirmation')
      .set('Authorization', makeToken('ADMIN'))
      .send({});

    expect(res.status).toBe(400);
  });

  it('401 when no Authorization header', async () => {
    const res = await request(app)
      .patch('/api/messages/sms-templates/booking-confirmation')
      .send({ body: 'hack' });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messages/sms-templates/:key/preview
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/messages/sms-templates/:key/preview', () => {
  it('200 — returns rendered preview', async () => {
    mockFindFirst.mockResolvedValue(templateFixture);

    const res = await request(app)
      .post('/api/messages/sms-templates/booking-confirmation/preview')
      .set('Authorization', makeToken('ADMIN'))
      .send({ variables: { customerName: 'Jane' } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ key: 'booking-confirmation' });
  });

  it('400 when variables is not an object', async () => {
    const res = await request(app)
      .post('/api/messages/sms-templates/booking-confirmation/preview')
      .set('Authorization', makeToken('ADMIN'))
      .send({ variables: 'not-an-object' });

    expect(res.status).toBe(400);
  });

  it('401 when no Authorization header', async () => {
    const res = await request(app)
      .post('/api/messages/sms-templates/booking-confirmation/preview')
      .send({ variables: { customerName: 'Jane' } });

    expect(res.status).toBe(401);
  });
});
