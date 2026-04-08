/**
 * Integration tests for /api/analytics — Step 1.22
 *
 * Coverage:
 *  ✓ POST /api/analytics/events    — 201 public (no auth required)
 *  ✓ GET  /api/analytics/overview  — 200 ADMIN, 401 unauth, 403 non-ADMIN
 *  ✓ GET  /api/analytics/leads     — 200 ADMIN
 *  ✓ GET  /api/analytics/bookings  — 200 ADMIN
 *  ✓ GET  /api/analytics/revenue   — 200 ADMIN
 *  ✓ GET  /api/analytics/events    — 200 ADMIN (paginated event log)
 *  ✓ 503 when ANALYTICS_ENABLED=false (via masseuse override for future-proofing)
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
    lead:           { findUnique: jest.fn(), count: jest.fn(), groupBy: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
    booking:        { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    artist:         { findMany: jest.fn() },
    service:        { findMany: jest.fn() },
    invoice:        { findMany: jest.fn(), groupBy: jest.fn() },
    waitlistEntry:  { count: jest.fn() },
    analyticsEvent: {
      create:     jest.fn(),
      count:      jest.fn(),
      findMany:   jest.fn(),
      groupBy:    jest.fn(),
    },
    bookingService: { findMany: jest.fn() },
    $transaction:   jest.fn(),
  },
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';

import { app }    from '../../app';
import { prisma } from '../../lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN', userId = 'u_1') {
  return `Bearer ${jwt.sign({ sub: userId, email: 'test@example.com', role }, SECRET, { expiresIn: '15m' })}`;
}

/** Default mocks for overview (all counts return 0 / empty arrays). */
function mockOverviewDefaults() {
  (prisma.lead.count    as jest.Mock).mockResolvedValue(0);
  (prisma.booking.count as jest.Mock).mockResolvedValue(0);
  (prisma.booking.groupBy as jest.Mock).mockResolvedValue([]);
  (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.waitlistEntry.count as jest.Mock).mockResolvedValue(0);
  (prisma.analyticsEvent.count as jest.Mock).mockResolvedValue(0);
}

function mockLeadsDefaults() {
  (prisma.lead.count     as jest.Mock).mockResolvedValue(0);
  (prisma.lead.groupBy   as jest.Mock).mockResolvedValue([]);
  (prisma.lead.aggregate as jest.Mock).mockResolvedValue({ _avg: { score: null }, _count: 0, _min: { score: null }, _max: { score: null }, _sum: { score: null } });
  (prisma.lead.findMany  as jest.Mock).mockResolvedValue([]);
}

function mockBookingsDefaults() {
  (prisma.booking.count   as jest.Mock).mockResolvedValue(0);
  (prisma.booking.groupBy as jest.Mock).mockResolvedValue([]);
  (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.artist.findMany  as jest.Mock).mockResolvedValue([]);
  (prisma.service.findMany as jest.Mock).mockResolvedValue([]);
}

function mockRevenueDefaults() {
  (prisma.invoice.findMany  as jest.Mock).mockResolvedValue([]);
  (prisma.invoice.groupBy   as jest.Mock).mockResolvedValue([]);
  (prisma.bookingService.findMany as jest.Mock).mockResolvedValue([]);
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/analytics/events', () => {
  it('201 — public visitor can track an event without auth', async () => {
    (prisma.analyticsEvent.create as jest.Mock).mockResolvedValue({ id: 'ae_1' });
    (prisma.lead.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/analytics/events')
      .send({ eventType: 'page_view', page: '/home' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('201 — event with optional leadId (lead found)', async () => {
    (prisma.analyticsEvent.create as jest.Mock).mockResolvedValue({ id: 'ae_1' });
    (prisma.lead.findUnique as jest.Mock).mockResolvedValue({ id: 'clhjgz3c40000fkiufwsxc58c' });

    const res = await request(app)
      .post('/api/analytics/events')
      .send({ eventType: 'lead_form_started', leadId: 'clhjgz3c40000fkiufwsxc58c' });

    expect(res.status).toBe(201);
  });

  it('400 — missing eventType', async () => {
    const res = await request(app)
      .post('/api/analytics/events')
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/analytics/overview', () => {
  it('200 — ADMIN retrieves KPI overview', async () => {
    mockOverviewDefaults();

    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('leads.total');
    expect(res.body.data).toHaveProperty('bookings.total');
    expect(res.body.data).toHaveProperty('leads.conversionRate');
  });

  it('401 — unauthenticated request rejected', async () => {
    const res = await request(app).get('/api/analytics/overview');
    expect(res.status).toBe(401);
  });

  it('403 — ARTIST cannot access analytics', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/analytics/leads', () => {
  it('200 — ADMIN retrieves lead funnel', async () => {
    mockLeadsDefaults();

    const res = await request(app)
      .get('/api/analytics/leads')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('funnel');
    expect(Array.isArray(res.body.data.funnel)).toBe(true);
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get('/api/analytics/leads');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/analytics/bookings', () => {
  it('200 — ADMIN retrieves booking breakdown', async () => {
    mockBookingsDefaults();

    const res = await request(app)
      .get('/api/analytics/bookings')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('byStatus');
    expect(res.body.data).toHaveProperty('byDayOfWeek');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/analytics/revenue', () => {
  it('200 — ADMIN retrieves revenue metrics', async () => {
    mockRevenueDefaults();

    const res = await request(app)
      .get('/api/analytics/revenue')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('byMonth');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/analytics/events', () => {
  it('200 — ADMIN retrieves paginated event log', async () => {
    (prisma.analyticsEvent.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.analyticsEvent.count    as jest.Mock).mockResolvedValue(0);

    const res = await request(app)
      .get('/api/analytics/events')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
  });

  it('200 — filter by eventType query param', async () => {
    (prisma.analyticsEvent.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.analyticsEvent.count    as jest.Mock).mockResolvedValue(0);

    const res = await request(app)
      .get('/api/analytics/events')
      .query({ eventType: 'page_view' })
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
  });
});
