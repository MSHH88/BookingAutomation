/**
 * Integration tests for /api/settings — Step 1.29
 *
 * Tests the full HTTP → controller → service stack with Prisma and Redis
 * fully mocked.  No real database or cache server is needed.
 *
 * Coverage:
 *  ✓ GET  /api/settings
 *      — 200 with settings data when row exists
 *      — 200 with null data when settings have not been seeded
 *      — serves from Redis cache (no DB call on cache hit)
 *
 *  ✓ PATCH /api/settings
 *      — 401 when no Authorization header
 *      — 403 when authenticated as ARTIST
 *      — 403 when authenticated as CUSTOMER
 *      — 400 when body is empty {}
 *      — 400 when currency is not a 3-letter code
 *      — 200 success when ADMIN sends a valid partial update
 *      — 400 when no settings row exists and studioName is omitted
 *
 * Total: 10 tests across 2 describes
 */

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

const mockSettingsFindFirst = jest.fn();
const mockSettingsUpdate    = jest.fn();
const mockSettingsCreate    = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    studioSettings: {
      findFirst: (...a: unknown[]) => mockSettingsFindFirst(...a),
      update:    (...a: unknown[]) => mockSettingsUpdate(...a),
      create:    (...a: unknown[]) => mockSettingsCreate(...a),
    },
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

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import request from 'supertest';
import jwt from 'jsonwebtoken';

import { app } from '../../app';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN', userId = 'u_admin') {
  return `Bearer ${jwt.sign({ sub: userId, email: 'admin@test.com', role }, SECRET, { expiresIn: '15m' })}`;
}

const publicSettingsFixture = {
  id:                     'settings_1',
  studioName:             'The Ink Spot',
  studioEmail:            'hello@inkspot.com',
  studioPhone:            '+44 7700 900000',
  studioAddress:          '1 Ink Lane, London',
  studioTimezone:         'Europe/London',
  currency:               'GBP',
  cancellationPolicyText: 'Cancellations within 24h incur a 25% fee.',
  googleReviewUrl:        'https://g.page/inkspot',
  bookingPageUrl:         'https://book.inkspot.com',
  updatedAt:              new Date('2026-01-01T00:00:00.000Z'),
};

const fullSettingsFixture = {
  ...publicSettingsFixture,
  depositPercentage:      20,
  depositFixedAmount:     null,
  cancellationHours:      24,
  cancellationFeePercent: 25,
  maxCoversPerSlot:       null,
  slotIntervalMinutes:    15,
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: Redis cache is cold
  mockRedisGet.mockResolvedValue(null);
  mockRedisSet.mockResolvedValue('OK');
  mockRedisDel.mockResolvedValue(1);
  // Default: settings row exists
  mockSettingsFindFirst.mockResolvedValue({ id: 'settings_1' });
  mockSettingsUpdate.mockResolvedValue(fullSettingsFixture);
  mockSettingsCreate.mockResolvedValue(fullSettingsFixture);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/settings
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/settings', () => {
  it('200 — returns settings data from DB when cache is cold', async () => {
    mockSettingsFindFirst.mockResolvedValue(publicSettingsFixture);

    const res = await request(app).get('/api/settings');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      studioName: 'The Ink Spot',
      currency:   'GBP',
    });
    expect(mockSettingsFindFirst).toHaveBeenCalledTimes(1);
  });

  it('200 — returns null data when settings have not been seeded', async () => {
    mockSettingsFindFirst.mockResolvedValue(null);

    const res = await request(app).get('/api/settings');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it('200 — serves from Redis cache (no DB call on cache hit)', async () => {
    mockRedisGet.mockResolvedValue(JSON.stringify(publicSettingsFixture));

    const res = await request(app).get('/api/settings');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ studioName: 'The Ink Spot' });
    // DB should NOT have been queried
    expect(mockSettingsFindFirst).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/settings
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/settings', () => {
  it('401 when no Authorization header is provided', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .send({ studioName: 'Hacker Studio' });

    expect(res.status).toBe(401);
  });

  it('403 when authenticated as ARTIST', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set('Authorization', makeToken('ARTIST'))
      .send({ studioName: 'Artist Studio' });

    expect(res.status).toBe(403);
  });

  it('403 when authenticated as CUSTOMER', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set('Authorization', makeToken('CUSTOMER'))
      .send({ studioName: 'Customer Studio' });

    expect(res.status).toBe(403);
  });

  it('400 when body is empty {}', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set('Authorization', makeToken('ADMIN'))
      .send({});

    expect(res.status).toBe(400);
  });

  it('400 when currency is not a 3-letter ISO code', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set('Authorization', makeToken('ADMIN'))
      .send({ currency: 'US' }); // only 2 chars

    expect(res.status).toBe(400);
  });

  it('200 — ADMIN successfully updates studio settings', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set('Authorization', makeToken('ADMIN'))
      .send({ studioName: 'Updated Studio', currency: 'USD' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ studioName: 'The Ink Spot' }); // fixture
    expect(mockSettingsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ studioName: 'Updated Studio', currency: 'USD' }),
      }),
    );
    // Cache should have been invalidated
    expect(mockRedisDel).toHaveBeenCalledWith('settings:public');
  });

  it('400 when no settings row exists and studioName is missing', async () => {
    // Simulate fresh deployment: findFirst returns null (no existing row)
    mockSettingsFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/settings')
      .set('Authorization', makeToken('ADMIN'))
      .send({ currency: 'EUR' }); // no studioName

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockSettingsCreate).not.toHaveBeenCalled();
  });
});
