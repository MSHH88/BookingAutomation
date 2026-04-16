/**
 * Integration tests for /api/rota — Phase 6.1
 *
 * Coverage:
 *  ✓ GET  /api/rota/week                     — 200 (ADMIN), 400 missing param, 401
 *  ✓ GET  /api/rota/shifts                   — 200 (ADMIN), 401
 *  ✓ POST /api/rota/shifts                   — 201 (ADMIN), 400 validation, 401
 *  ✓ GET  /api/rota/shifts/:id               — 200, 404
 *  ✓ PATCH /api/rota/shifts/:id              — 200 (ADMIN)
 *  ✓ DELETE /api/rota/shifts/:id             — 200 (ADMIN)
 *  ✓ POST /api/rota/shifts/:id/override      — 201 (ADMIN), 404
 *
 * Total: 11 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

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
    shift: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
    },
    shiftOverride: {
      upsert: jest.fn(),
    },
    artist: {
      findUnique: jest.fn(),
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

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN', userId = 'u_1') {
  return jwt.sign(
    { sub: userId, email: `${role.toLowerCase()}@test.com`, role, tenantId: 'tenant-1' },
    SECRET,
    { expiresIn: '1h' },
  );
}

function makeShift(overrides: Record<string, unknown> = {}) {
  return {
    id:             'shift-1',
    tenantId:       'tenant-1',
    artistId:       'artist-1',
    dayOfWeek:      1,
    startTime:      '09:00',
    endTime:        '17:00',
    isRecurring:    true,
    effectiveFrom:  new Date('2024-01-01'),
    effectiveUntil: null,
    createdAt:      new Date('2024-01-01'),
    updatedAt:      new Date('2024-01-01'),
    overrides:      [],
    artist: {
      id:   'artist-1',
      slug: 'artist-one',
      user: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
    },
    ...overrides,
  };
}

beforeAll(() => { process.env['BUSINESS_TYPE'] = 'tattoo_studio'; });
afterAll(()  => { process.env['BUSINESS_TYPE'] = originalBizType; });

describe('GET /api/rota/week', () => {
  it('returns 200 with rota grid for ADMIN', async () => {
    (prisma.shift.findMany as jest.Mock).mockResolvedValue([makeShift()]);

    const res = await request(app)
      .get('/api/rota/week?from=2024-01-08')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('weekStart', '2024-01-08');
  });

  it('returns 400 when from param is missing', async () => {
    const res = await request(app)
      .get('/api/rota/week')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/rota/week?from=2024-01-08');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/rota/shifts', () => {
  it('returns 200 list for ADMIN', async () => {
    (prisma.shift.findMany as jest.Mock).mockResolvedValue([makeShift()]);

    const res = await request(app)
      .get('/api/rota/shifts')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/rota/shifts');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/rota/shifts', () => {
  const validBody = {
    artistId:      'artist-1',
    dayOfWeek:     1,
    startTime:     '09:00',
    endTime:       '17:00',
    effectiveFrom: '2024-01-01T00:00:00.000Z',
  };

  it('returns 201 for ADMIN', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue({
      id: 'artist-1', tenantId: 'tenant-1',
    });
    (prisma.shift.create as jest.Mock).mockResolvedValue(makeShift());

    const res = await request(app)
      .post('/api/rota/shifts')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('shift-1');
  });

  it('returns 400 for invalid body (endTime before startTime)', async () => {
    const res = await request(app)
      .post('/api/rota/shifts')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ ...validBody, startTime: '17:00', endTime: '09:00' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/rota/shifts').send(validBody);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/rota/shifts/:id', () => {
  it('returns 200 with shift', async () => {
    (prisma.shift.findUnique as jest.Mock).mockResolvedValue(makeShift());

    const res = await request(app)
      .get('/api/rota/shifts/shift-1')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('shift-1');
  });

  it('returns 404 when shift not found', async () => {
    (prisma.shift.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/rota/shifts/missing')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/rota/shifts/:id', () => {
  it('returns 200 on successful update', async () => {
    (prisma.shift.findUnique as jest.Mock).mockResolvedValue(
      makeShift({ startTime: '09:00', endTime: '17:00' }),
    );
    (prisma.shift.update as jest.Mock).mockResolvedValue(makeShift({ endTime: '18:00' }));

    const res = await request(app)
      .patch('/api/rota/shifts/shift-1')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ endTime: '18:00' });

    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/rota/shifts/:id', () => {
  it('returns 204 on successful delete', async () => {
    (prisma.shift.findUnique as jest.Mock).mockResolvedValue(makeShift());
    (prisma.shift.delete as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .delete('/api/rota/shifts/shift-1')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

    expect(res.status).toBe(204);
  });
});

describe('POST /api/rota/shifts/:id/override', () => {
  it('returns 201 on successful override', async () => {
    (prisma.shift.findUnique as jest.Mock).mockResolvedValue(makeShift());
    (prisma.shiftOverride.upsert as jest.Mock).mockResolvedValue({
      id:        'override-1',
      shiftId:   'shift-1',
      date:      new Date('2024-01-08'),
      startTime: null,
      endTime:   null,
      isOff:     true,
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/rota/shifts/shift-1/override')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ date: '2024-01-08', isOff: true });

    expect(res.status).toBe(201);
    expect(res.body.data.isOff).toBe(true);
  });

  it('returns 404 when shift not found', async () => {
    (prisma.shift.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/rota/shifts/missing/override')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ date: '2024-01-08', isOff: true });

    expect(res.status).toBe(404);
  });
});
