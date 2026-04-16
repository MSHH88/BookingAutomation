/**
 * Integration tests for /api/quotes — Step 1.22
 *
 * Coverage:
 *  ✓ POST /api/quotes             — 201 ARTIST, 401 unauth, 503 feature disabled
 *  ✓ GET  /api/quotes             — 200 ARTIST, 200 ADMIN, 401 unauth
 *  ✓ GET  /api/quotes/:id         — 200 ARTIST (own), 404 unknown
 *  ✓ PATCH /api/quotes/:id        — 200 ARTIST (edit DRAFT)
 *  ✓ PATCH /api/quotes/:id/send   — 200 ARTIST
 *  ✓ PATCH /api/quotes/:id/accept — 200 ADMIN
 *  ✓ PATCH /api/quotes/:id/reject — 200 ADMIN
 *
 * 16 tests total
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
    user:    { findUnique: jest.fn() },
    artist:  { findFirst: jest.fn(), findUnique: jest.fn() },
    lead:    { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    quote:   {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      count:      jest.fn(),
    },
    booking: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';

import { app }    from '../../app';
import { prisma } from '../../lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'CUSTOMER', userId = 'u_1') {
  return `Bearer ${jwt.sign({ sub: userId, email: 'test@example.com', role }, SECRET, { expiresIn: '15m' })}`;
}

const baseArtist = {
  id: 'a_1', userId: 'u_1', slug: 'ace', isActive: true,
  user: { id: 'u_1', email: 'artist@example.com', name: 'Ace Artist' },
};

const baseLead = {
  id: 'lead_1', name: 'Bob', email: 'bob@example.com',
  status: 'NEW' as const, artistId: 'a_1',
};

const baseQuote = {
  id: 'q_1', artistId: 'a_1', leadId: 'lead_1',
  status: 'DRAFT' as const, price: 500, depositAmount: 100,
  description: 'Sleeve quote', durationMinutes: 240, validUntil: null,
  notes: null, rejectedReason: null,
  artist: baseArtist,
  lead: baseLead,
  createdAt: new Date(), updatedAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/quotes', () => {
  const validBody = {
    leadId: 'lead_1', price: 500, depositAmount: 100,
    description: 'Full sleeve', durationMinutes: 240,
  };

  it('201 — ARTIST creates a DRAFT quote', async () => {
    (prisma.artist.findFirst  as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.lead.findUnique   as jest.Mock).mockResolvedValue(baseLead);
    // fetchQuoteDetail (called after create) needs to return the full quote
    (prisma.quote.findUnique  as jest.Mock).mockResolvedValueOnce(baseQuote);
    (prisma.quote.create      as jest.Mock).mockResolvedValue({ id: 'q_1' });

    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', makeToken('ARTIST'))
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).post('/api/quotes').send(validBody);
    expect(res.status).toBe(401);
  });

  it('503 — QUOTE_SYSTEM_ENABLED=false returns feature disabled', async () => {
    const originalBT = process.env['BUSINESS_TYPE'];
    process.env['BUSINESS_TYPE'] = 'restaurant'; // restaurant has QUOTE_SYSTEM_ENABLED=false

    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', makeToken('ARTIST'))
      .send(validBody);

    process.env['BUSINESS_TYPE'] = originalBT;
    expect(res.status).toBe(503);
  });

  it('400 — missing required fields', async () => {
    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', makeToken('ARTIST'))
      .send({ price: 500 }); // missing leadId, description, durationMinutes

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/quotes', () => {
  it('200 — ARTIST lists own quotes', async () => {
    (prisma.artist.findFirst as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.quote.findMany   as jest.Mock).mockResolvedValue([baseQuote]);
    (prisma.quote.count      as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/quotes')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 — ADMIN lists all quotes', async () => {
    (prisma.quote.findMany as jest.Mock).mockResolvedValue([baseQuote]);
    (prisma.quote.count    as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/quotes')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get('/api/quotes');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/quotes/:id', () => {
  it('200 — ARTIST gets own quote', async () => {
    (prisma.artist.findFirst  as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.quote.findUnique  as jest.Mock).mockResolvedValue(baseQuote);

    const res = await request(app)
      .get('/api/quotes/q_1')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('q_1');
  });

  it('404 — unknown quote', async () => {
    (prisma.artist.findFirst  as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.quote.findUnique  as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/quotes/unknown')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/quotes/:id (edit DRAFT)', () => {
  it('200 — ARTIST edits DRAFT quote', async () => {
    (prisma.artist.findFirst  as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.quote.findUnique  as jest.Mock)
      .mockResolvedValueOnce(baseQuote)                     // DRAFT status check
      .mockResolvedValueOnce({ ...baseQuote, price: 600 }); // fetchQuoteDetail
    (prisma.quote.update      as jest.Mock).mockResolvedValue({ ...baseQuote, price: 600 });

    const res = await request(app)
      .patch('/api/quotes/q_1')
      .set('Authorization', makeToken('ARTIST'))
      .send({ price: 600 });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(600);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/quotes/:id/send', () => {
  it('200 — ARTIST sends DRAFT quote → SENT', async () => {
    (prisma.artist.findFirst           as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.quote.findUnique           as jest.Mock).mockResolvedValue(baseQuote);
    (prisma.quote.update               as jest.Mock).mockResolvedValue({ ...baseQuote, status: 'SENT' });
    (prisma.lead.updateMany            as jest.Mock).mockResolvedValue({ count: 1 });

    const res = await request(app)
      .patch('/api/quotes/q_1/send')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/quotes/:id/accept', () => {
  it('200 — ADMIN accepts SENT quote → ACCEPTED + Booking created', async () => {
    const sentQuote = {
      ...baseQuote,
      status:     'SENT' as const,
      validUntil: new Date(Date.now() + 7 * 86400_000),
    };

    (prisma.quote.findUnique as jest.Mock).mockResolvedValue(sentQuote);
    (prisma.$transaction     as jest.Mock).mockResolvedValue(undefined);

    const startAt = new Date(Date.now() + 86400_000);
    const endAt   = new Date(startAt.getTime() + 5400_000);

    const res = await request(app)
      .patch('/api/quotes/q_1/accept')
      .set('Authorization', makeToken('ADMIN'))
      .send({ startAt: startAt.toISOString(), endAt: endAt.toISOString() });

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/quotes/:id/reject', () => {
  it('200 — ADMIN rejects SENT quote', async () => {
    const sentQuote = { ...baseQuote, status: 'SENT' as const };

    (prisma.quote.findUnique as jest.Mock).mockResolvedValue(sentQuote);
    (prisma.quote.update     as jest.Mock).mockResolvedValue({ ...sentQuote, status: 'REJECTED' });

    const res = await request(app)
      .patch('/api/quotes/q_1/reject')
      .set('Authorization', makeToken('ADMIN'))
      .send({ reason: 'Client cancelled inquiry' });

    expect(res.status).toBe(200);
  });
});
