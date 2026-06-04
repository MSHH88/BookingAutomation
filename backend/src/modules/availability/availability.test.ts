/**
 * Integration tests for /api/availability — Step 1.22
 *
 * Coverage:
 *  ✓ GET  /api/availability/slots          — 200 public (no auth required)
 *  ✓ GET  /api/availability/blocks         — 200 ARTIST, 401 unauth
 *  ✓ POST /api/availability/blocks         — 201 ARTIST, 401 unauth, 400 invalid
 *  ✓ DELETE /api/availability/blocks/:id   — 200 ARTIST, 401 unauth
 *  ✓ GET  /api/availability                — 200 ARTIST
 *  ✓ PUT  /api/availability                — 200 ARTIST
 *
 * 14 tests total
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
    artist:  { findUnique: jest.fn(), findFirst: jest.fn() },
    service: { findUnique: jest.fn() },
    artistAvailability: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    availabilityBlock: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      delete:     jest.fn(),
      count:      jest.fn(),
    },
    booking: { findMany: jest.fn() },
    $transaction: jest.fn(),
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

const baseArtist = {
  id: 'a_1', userId: 'u_1', slug: 'ace', isActive: true,
  bufferMinutes: 30, slotDuration: 90,
  user: { id: 'u_1', name: 'Ace', email: 'ace@test.com' },
};

const baseBlock = {
  id: 'blk_1', artistId: 'a_1',
  startAt: new Date('2025-06-10T09:00:00Z'),
  endAt:   new Date('2025-06-10T17:00:00Z'),
  reason: 'Holiday', createdAt: new Date(),
};

const baseSchedule = {
  id: 'sched_1', artistId: 'a_1', dayOfWeek: 1,
  startTime: '09:00', endTime: '18:00',
  breakStart: '12:00', breakEnd: '13:00', isActive: true,
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/availability/slots', () => {
  it('200 — returns available slots for a public visitor (no auth)', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.artistAvailability.findUnique as jest.Mock).mockResolvedValue(baseSchedule);
    (prisma.availabilityBlock.findMany   as jest.Mock).mockResolvedValue([]);
    (prisma.booking.findMany             as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/availability/slots')
      .query({ artistId: 'a_1', date: '2025-06-16' }); // Monday

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('404 — unknown artistId', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/availability/slots')
      .query({ artistId: 'nonexistent', date: '2025-06-16' });

    expect(res.status).toBe(404);
  });

  it('400 — missing required query params', async () => {
    const res = await request(app).get('/api/availability/slots');
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/availability/blocks', () => {
  it('200 — ARTIST lists own blocks', async () => {
    // resolveOwnArtistId uses artist.findUnique (not findFirst)
    (prisma.artist.findUnique             as jest.Mock).mockResolvedValue({ id: baseArtist.id });
    (prisma.availabilityBlock.findMany    as jest.Mock).mockResolvedValue([baseBlock]);
    (prisma.availabilityBlock.count       as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/availability/blocks')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(200);
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get('/api/availability/blocks');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/availability/blocks', () => {
  const validBlock = {
    startAt: '2025-08-01T09:00:00.000Z',
    endAt:   '2025-08-01T17:00:00.000Z',
    reason:  'Vacation',
  };

  it('201 — ARTIST creates a block', async () => {
    (prisma.artist.findUnique          as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.availabilityBlock.create   as jest.Mock).mockResolvedValue(baseBlock);

    const res = await request(app)
      .post('/api/availability/blocks')
      .set('Authorization', makeToken('ARTIST'))
      .send(validBlock);

    expect(res.status).toBe(201);
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).post('/api/availability/blocks').send(validBlock);
    expect(res.status).toBe(401);
  });

  it('400 — missing startAt / endAt', async () => {
    const res = await request(app)
      .post('/api/availability/blocks')
      .set('Authorization', makeToken('ARTIST'))
      .send({ reason: 'Holiday' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/availability/blocks/:id', () => {
  it('204 — ARTIST deletes own block', async () => {
    (prisma.artist.findFirst             as jest.Mock).mockResolvedValue(baseArtist);
    // deleteBlock selects artist.userId to verify ownership — must include it in the mock
    (prisma.availabilityBlock.findUnique as jest.Mock).mockResolvedValue({
      ...baseBlock,
      artist: { userId: 'u_1' },
    });
    (prisma.availabilityBlock.delete     as jest.Mock).mockResolvedValue(baseBlock);

    const res = await request(app)
      .delete('/api/availability/blocks/blk_1')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(204);
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).delete('/api/availability/blocks/blk_1');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/availability (weekly schedule)', () => {
  it('200 — ARTIST retrieves own schedule', async () => {
    (prisma.artist.findFirst              as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.artistAvailability.findMany   as jest.Mock).mockResolvedValue([baseSchedule]);

    const res = await request(app)
      .get('/api/availability')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/availability (upsert schedule)', () => {
  it('200 — ARTIST sets weekly schedule', async () => {
    (prisma.artist.findUnique           as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.$transaction                as jest.Mock).mockResolvedValue([]);
    (prisma.artistAvailability.findMany as jest.Mock).mockResolvedValue([baseSchedule]);

    const res = await request(app)
      .put('/api/availability')
      .set('Authorization', makeToken('ARTIST'))
      .send({
        schedule: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isActive: true },
        ],
      });

    expect(res.status).toBe(200);
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app)
      .put('/api/availability')
      .send({ schedule: [] });

    expect(res.status).toBe(401);
  });
});
