/**
 * Integration tests for /api/social — Phase 2.4
 *
 * Coverage:
 *  ✓ GET /api/social/booking-link  — 200 (ADMIN), 401 (unauth), 403 (CUSTOMER)
 *  ✓ GET /api/social/sources       — 200 (ADMIN)
 *  ✓ 503 when SOCIAL_BOOKING_ENABLED=false
 *
 * Total: 5 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    tenant:         { findUnique: jest.fn() },
    studioSettings: { findUnique: jest.fn() },
    booking:        { groupBy: jest.fn() },
    user:           { findUnique: jest.fn() },
  },
}));

// ── Default flag set ──────────────────────────────────────────────────────────

const allEnabledFlags: Record<string, boolean> = {
  BOOKING_ENABLED: true,
  CALENDAR_ENABLED: true,
  PUBLIC_BOOKING_ENABLED: true,
  SOCIAL_BOOKING_ENABLED: true,
  NO_SHOW_AUTOMATION_ENABLED: true,
  LEAD_CAPTURE_ENABLED: true,
  QUOTE_SYSTEM_ENABLED: true,
  ONLINE_PAYMENT_ENABLED: true,
  SERVICE_MENU_ENABLED: true,
  TABLE_SELECTION_ENABLED: false,
  EMAIL_REMINDERS_ENABLED: true,
  SMS_REMINDERS_ENABLED: true,
  WHATSAPP_CONTACT_ENABLED: true,
  REVIEW_REQUEST_ENABLED: true,
  ANALYTICS_ENABLED: true,
  CANCELLATION_FEE_ENABLED: false,
  GIFT_VOUCHER_ENABLED: false,
  WAITING_LIST_ENABLED: false,
  LOYALTY_ENABLED: false,
  BIRTHDAY_AUTOMATION_ENABLED: true,
  REBOOKING_NUDGES_ENABLED: true,
  RECURRING_BOOKINGS_ENABLED: true,
  CAMPAIGNS_ENABLED: true,
  DEPOSIT_REQUIRED: false,
};

const mockGetDefaultFlags = jest.fn().mockReturnValue(allEnabledFlags);
jest.mock('../../config/businessType', () => {
  const actual = jest.requireActual('../../config/businessType');
  return {
    ...actual,
    getDefaultFlags: (...args: unknown[]) => mockGetDefaultFlags(...args),
  };
});

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

describe('/api/social', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
    mockGetDefaultFlags.mockReturnValue(allEnabledFlags);
  });

  afterAll(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── GET /api/social/booking-link ──────────────────────────────────────────

  describe('GET /api/social/booking-link', () => {
    it('200 — ADMIN gets booking link', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ slug: 'test-studio', name: 'Test' });
      (prisma.studioSettings.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/social/booking-link?platform=instagram')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.url).toContain('instagram');
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/social/booking-link');
      expect(res.status).toBe(401);
    });

    it('403 — CUSTOMER role rejected', async () => {
      const res = await request(app)
        .get('/api/social/booking-link')
        .set('Authorization', `Bearer ${makeToken('CUSTOMER')}`);

      expect(res.status).toBe(403);
    });
  });

  // ── GET /api/social/sources ───────────────────────────────────────────────

  describe('GET /api/social/sources', () => {
    it('200 — returns source statistics', async () => {
      (prisma.booking.groupBy as jest.Mock).mockResolvedValue([
        { source: 'WIDGET', _count: { id: 10 } },
      ]);

      const res = await request(app)
        .get('/api/social/sources')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(10);
    });
  });

  // ── Feature flag gate ─────────────────────────────────────────────────────

  describe('SOCIAL_BOOKING_ENABLED=false', () => {
    it('503 — feature disabled', async () => {
      mockGetDefaultFlags.mockReturnValue({
        ...allEnabledFlags,
        SOCIAL_BOOKING_ENABLED: false,
      });

      const res = await request(app)
        .get('/api/social/booking-link')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(503);
    });
  });
});
