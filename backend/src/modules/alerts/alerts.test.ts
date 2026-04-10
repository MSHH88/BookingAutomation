/**
 * Integration tests for /api/alerts — Phase 2.5
 *
 * Coverage:
 *  ✓ GET /api/alerts/booking/:id   — 200 (ADMIN), 404, 401
 *  ✓ GET /api/alerts/customer/:id  — 200 (ADMIN), 404
 *  ✓ GET /api/alerts/dashboard     — 200 (ADMIN), 403 (ARTIST)
 *
 * Total: 7 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      findFirst:  jest.fn(),
      count:      jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    invoice: {
      count: jest.fn(),
    },
    waitlistEntry: {
      count: jest.fn(),
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

describe('/api/alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterAll(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── GET /api/alerts/booking/:id ───────────────────────────────────────────

  describe('GET /api/alerts/booking/:id', () => {
    it('200 — returns alerts for booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', status: 'AWAITING_DEPOSIT', startAt: new Date('2030-01-01'),
        tenantId: 'tenant-1', depositAmount: 50, depositPaidAt: null, invoice: null,
      });

      const res = await request(app)
        .get('/api/alerts/booking/b-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('DEPOSIT_PENDING');
    });

    it('404 — booking not found', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/alerts/booking/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/alerts/booking/b-1');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/alerts/customer/:id ──────────────────────────────────────────

  describe('GET /api/alerts/customer/:id', () => {
    it('200 — returns alerts for customer', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', name: 'Jane', tenantId: 'tenant-1',
        dateOfBirth: null, stripeCustomerId: null,
      });
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/alerts/customer/cust-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((a: any) => a.type === 'CARD_NOT_ON_FILE')).toBe(true);
    });

    it('404 — customer not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/alerts/customer/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/alerts/dashboard ─────────────────────────────────────────────

  describe('GET /api/alerts/dashboard', () => {
    it('200 — returns dashboard alerts', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(2);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);
      (prisma.waitlistEntry.count as jest.Mock).mockResolvedValue(0);

      const res = await request(app)
        .get('/api/alerts/dashboard')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((a: any) => a.type === 'OVERDUE_INVOICE')).toBe(true);
    });

    it('403 — ARTIST cannot access dashboard', async () => {
      const res = await request(app)
        .get('/api/alerts/dashboard')
        .set('Authorization', `Bearer ${makeToken('ARTIST')}`);

      expect(res.status).toBe(403);
    });
  });
});
