/**
 * Integration tests for Feature Flag enforcement — Step 1.22
 *
 * Tests the `requireFeature` middleware at the HTTP layer.  These tests verify
 * that routes are correctly gated by business-type feature flags without
 * requiring any business logic to execute (Prisma is fully mocked).
 *
 * Key assertions:
 *  ✓ Routes with no feature gate always respond (e.g. /health)
 *  ✓ Routes with a disabled flag return 503 FEATURE_DISABLED
 *  ✓ Routes with an enabled flag proceed past the middleware
 *
 * Business-type feature flag defaults used in these tests:
 *  tattoo_studio: LEAD_CAPTURE_ENABLED=true, QUOTE_SYSTEM_ENABLED=true,
 *                 BOOKING_ENABLED=true, ANALYTICS_ENABLED=true
 *  restaurant:    LEAD_CAPTURE_ENABLED=false, QUOTE_SYSTEM_ENABLED=false,
 *                 BOOKING_ENABLED=true, ANALYTICS_ENABLED=true
 *
 * 12 tests total
 */

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

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user:           { findUnique: jest.fn() },
    lead:           { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    quote:          { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    booking:        { findMany: jest.fn(), count: jest.fn() },
    analyticsEvent: { create: jest.fn() },
    artist:         { findFirst: jest.fn() },
  },
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';

import { app }    from '../../app';
import { prisma } from '../../lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ARTIST', userId = 'u_1') {
  return `Bearer ${jwt.sign({ sub: userId, email: 'test@example.com', role }, SECRET, { expiresIn: '15m' })}`;
}

/** Temporarily switch BUSINESS_TYPE, run the callback, then restore. */
async function withBusinessType(
  type: string,
  fn: () => Promise<void>,
): Promise<void> {
  const original = process.env['BUSINESS_TYPE'];
  process.env['BUSINESS_TYPE'] = type;
  try {
    await fn();
  } finally {
    process.env['BUSINESS_TYPE'] = original;
  }
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('Routes without a feature flag gate', () => {
  it('GET /health — always returns 200 regardless of BUSINESS_TYPE', async () => {
    await withBusinessType('restaurant', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  });

  it('GET /api/artists — public, no feature flag, always available', async () => {
    (prisma.artist.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.artist as jest.Mocked<typeof prisma.artist>);
    // findMany is used by the list endpoint
    const m = prisma as { artist: { findMany: jest.Mock } };
    m.artist.findMany = jest.fn().mockResolvedValue([]);

    await withBusinessType('restaurant', async () => {
      const res = await request(app).get('/api/artists');
      expect(res.status).toBe(200);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('LEAD_CAPTURE_ENABLED flag', () => {
  const leadBody = {
    name: 'Test Lead', email: 'lead@example.com', phone: '+447700900000',
    businessType: 'tattoo_studio',
  };

  it('tattoo_studio — LEAD_CAPTURE_ENABLED=true → route proceeds (201 or service error)', async () => {
    (prisma.lead.create as jest.Mock).mockResolvedValue({
      id: 'l_1', name: 'Test Lead', email: 'lead@example.com', status: 'NEW',
    });
    (prisma.analyticsEvent.create as jest.Mock).mockResolvedValue({ id: 'ae_1' });

    const res = await request(app).post('/api/leads').send(leadBody);

    // Should NOT be 503 — the feature IS enabled for tattoo_studio
    expect(res.status).not.toBe(503);
  });

  it('restaurant — LEAD_CAPTURE_ENABLED=false → 503 FEATURE_DISABLED', async () => {
    await withBusinessType('restaurant', async () => {
      const res = await request(app).post('/api/leads').send(leadBody);

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FEATURE_DISABLED');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('QUOTE_SYSTEM_ENABLED flag', () => {
  const quoteBody = {
    leadId: 'l_1', price: 500, depositAmount: 100,
    description: 'Sleeve', durationMinutes: 180,
  };

  it('tattoo_studio — QUOTE_SYSTEM_ENABLED=true → route proceeds (not 503)', async () => {
    // Route will return 401 because we're not providing auth, but it must
    // not return 503 (feature disabled).
    const res = await request(app).post('/api/quotes').send(quoteBody);
    expect(res.status).not.toBe(503);
  });

  it('restaurant — QUOTE_SYSTEM_ENABLED=false → 503 FEATURE_DISABLED', async () => {
    await withBusinessType('restaurant', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', makeToken('ARTIST'))
        .send(quoteBody);

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('FEATURE_DISABLED');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ANALYTICS_ENABLED flag', () => {
  it('tattoo_studio — analytics route accessible', async () => {
    // POST /api/analytics/events is public; it attempts to write to DB.
    // We only verify it does NOT return 503 (feature is enabled).
    (prisma.analyticsEvent.create as jest.Mock).mockResolvedValue({ id: 'ae_1' });
    (prisma.lead.findUnique as jest.Mock | undefined);

    const res = await request(app)
      .post('/api/analytics/events')
      .send({ eventType: 'PAGE_VIEW', page: '/home' });

    expect(res.status).not.toBe(503);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('BOOKING_ENABLED flag', () => {
  it('tattoo_studio — booking routes accessible (not 503)', async () => {
    // Request without auth token: should fail with 401 not 503
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(401);
    expect(res.status).not.toBe(503);
  });

  it('restaurant — BOOKING_ENABLED=true for restaurant → not 503', async () => {
    await withBusinessType('restaurant', async () => {
      const res = await request(app).get('/api/bookings');
      // All business types have BOOKING_ENABLED=true; should get 401 not 503
      expect(res.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Multiple feature flag changes in sequence', () => {
  it('correctly restores BUSINESS_TYPE between tests', async () => {
    // Verify the withBusinessType helper correctly restores env vars
    expect(process.env['BUSINESS_TYPE']).toBe('tattoo_studio');

    await withBusinessType('restaurant', async () => {
      expect(process.env['BUSINESS_TYPE']).toBe('restaurant');
    });

    expect(process.env['BUSINESS_TYPE']).toBe('tattoo_studio');
  });
});
