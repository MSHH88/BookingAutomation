/**
 * Integration tests for /api/calendar — Step 1.28
 *
 * Tests the full HTTP → controller → service stack with Prisma and the
 * Google Calendar lib fully mocked.  No real database or Google credentials
 * are needed.
 *
 * Coverage:
 *  ✓ GET    /api/calendar/auth-url    — 401 unauth, 403 CUSTOMER, 200 ARTIST,
 *                                       200 ADMIN with artistId, 503 flag off
 *  ✓ GET    /api/calendar/callback   — 200 success, 400 user denied (BUG-A fix),
 *                                       400 missing state
 *  ✓ GET    /api/calendar/status     — 401 unauth, 200 connected, 200 disconnected,
 *                                       503 flag off
 *  ✓ DELETE /api/calendar/disconnect — 401 unauth, 204 success, 409 not connected
 *
 * Total: 15 tests across 4 describes
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
    artist:  {
      findFirst:  jest.fn(),
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
  },
}));

// ─── Google Calendar lib mock ─────────────────────────────────────────────────

const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/consent?client_id=test');
const mockGetToken        = jest.fn();

jest.mock('../../lib/google-calendar', () => ({
  getOAuth2BaseClient: jest.fn(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
    getToken:        mockGetToken,
  })),
  _resetOAuth2BaseClient:   jest.fn(),
  buildOAuth2ClientForTokens: jest.fn(() => ({})),
  createCalendarEvent:  jest.fn().mockResolvedValue('gcal_event_id'),
  updateCalendarEvent:  jest.fn().mockResolvedValue(undefined),
  deleteCalendarEvent:  jest.fn().mockResolvedValue(undefined),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import request from 'supertest';
import jwt from 'jsonwebtoken';

import { app }    from '../../app';
import { prisma } from '../../lib/prisma';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ARTIST', userId = 'u_1') {
  return `Bearer ${jwt.sign({ sub: userId, email: 'a@b.com', role }, SECRET, { expiresIn: '15m' })}`;
}

const artistId = 'artist_1';
const userId   = 'u_1';

/** Switch BUSINESS_TYPE, run fn, then restore original. */
async function withBusinessType(type: string, fn: () => Promise<void>): Promise<void> {
  const original = process.env['BUSINESS_TYPE'];
  process.env['BUSINESS_TYPE'] = type;
  try { await fn(); } finally { process.env['BUSINESS_TYPE'] = original; }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue({
    tokens: {
      access_token:  'new_access',
      refresh_token: 'new_refresh',
      expiry_date:   Date.now() + 3_600_000,
    },
  });
  (prisma.artist.findFirst  as jest.Mock).mockResolvedValue({ id: artistId });
  (prisma.artist.findUnique as jest.Mock).mockResolvedValue({
    id:                   artistId,
    calendarAccessToken:  'access',
    calendarRefreshToken: 'refresh',
    calendarTokenExpiresAt: new Date('2026-05-01'),
  });
  (prisma.artist.update as jest.Mock).mockResolvedValue({});
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/auth-url
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/calendar/auth-url', () => {
  it('401 when not authenticated', async () => {
    const res = await request(app).get('/api/calendar/auth-url');
    expect(res.status).toBe(401);
  });

  it('403 when authenticated as CUSTOMER', async () => {
    const res = await request(app)
      .get('/api/calendar/auth-url')
      .set('Authorization', makeToken('CUSTOMER'));
    expect(res.status).toBe(403);
  });

  it('200 — ARTIST receives OAuth consent URL for own profile', async () => {
    const res = await request(app)
      .get('/api/calendar/auth-url')
      .set('Authorization', makeToken('ARTIST', userId));
    expect(res.status).toBe(200);
    expect(res.body.data.url).toBe('https://accounts.google.com/consent?client_id=test');
    expect(prisma.artist.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    );
  });

  it('200 — ADMIN receives OAuth consent URL for specified artistId', async () => {
    const res = await request(app)
      .get(`/api/calendar/auth-url?artistId=${artistId}`)
      .set('Authorization', makeToken('ADMIN'));
    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain('accounts.google.com');
  });

  it('503 when CALENDAR_ENABLED feature flag is off', async () => {
    await withBusinessType('restaurant', async () => {
      const res = await request(app)
        .get('/api/calendar/auth-url')
        .set('Authorization', makeToken('ARTIST'));
      expect(res.status).toBe(503);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/callback  (public — no auth required)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/calendar/callback', () => {
  const validState = Buffer.from(JSON.stringify({ artistId })).toString('base64url');

  it('200 — success: exchanges code, persists tokens', async () => {
    const res = await request(app)
      .get(`/api/calendar/callback?code=auth_code&state=${validState}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ connected: true });
    expect(prisma.artist.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: artistId },
        data:  expect.objectContaining({ calendarAccessToken: 'new_access' }),
      }),
    );
  });

  it('400 — user denied consent (Google sends error=access_denied, no code)', async () => {
    // BUG-A fix: code is no longer required; error param triggers ACCESS_DENIED response
    const res = await request(app)
      .get(`/api/calendar/callback?error=access_denied&state=${validState}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ACCESS_DENIED');
  });

  it('400 — validation error when state is missing', async () => {
    const res = await request(app)
      .get('/api/calendar/callback?code=some_code');
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/status
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/calendar/status', () => {
  it('401 when not authenticated', async () => {
    const res = await request(app).get('/api/calendar/status');
    expect(res.status).toBe(401);
  });

  it('200 — ARTIST sees connected=true when refreshToken exists', async () => {
    const res = await request(app)
      .get('/api/calendar/status')
      .set('Authorization', makeToken('ARTIST', userId));
    expect(res.status).toBe(200);
    expect(res.body.data.connected).toBe(true);
  });

  it('200 — ARTIST sees connected=false when no tokens stored', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValueOnce({
      calendarAccessToken:    null,
      calendarRefreshToken:   null,
      calendarTokenExpiresAt: null,
    });
    const res = await request(app)
      .get('/api/calendar/status')
      .set('Authorization', makeToken('ARTIST', userId));
    expect(res.status).toBe(200);
    expect(res.body.data.connected).toBe(false);
  });

  it('503 when CALENDAR_ENABLED feature flag is off', async () => {
    await withBusinessType('restaurant', async () => {
      const res = await request(app)
        .get('/api/calendar/status')
        .set('Authorization', makeToken('ARTIST'));
      expect(res.status).toBe(503);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/calendar/disconnect
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/calendar/disconnect', () => {
  it('401 when not authenticated', async () => {
    const res = await request(app).delete('/api/calendar/disconnect');
    expect(res.status).toBe(401);
  });

  it('204 — success: tokens cleared for connected artist', async () => {
    const res = await request(app)
      .delete('/api/calendar/disconnect')
      .set('Authorization', makeToken('ARTIST', userId));
    expect(res.status).toBe(204);
    expect(prisma.artist.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          calendarAccessToken:    null,
          calendarRefreshToken:   null,
          calendarTokenExpiresAt: null,
        },
      }),
    );
  });

  it('409 — CONFLICT when artist calendar is not connected', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValueOnce({
      id:                   artistId,
      calendarRefreshToken: null,
    });
    const res = await request(app)
      .delete('/api/calendar/disconnect')
      .set('Authorization', makeToken('ARTIST', userId));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CALENDAR_NOT_CONNECTED');
  });
});
