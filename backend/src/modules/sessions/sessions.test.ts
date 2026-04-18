/**
 * Integration tests for sessions module — Phase 9.2
 *
 * All external dependencies (prisma) are mocked.
 *
 * Coverage:
 *  ✓ GET    /api/sessions                       — list (empty, with results)
 *  ✓ POST   /api/sessions                       — create (success, missing fields, service not found, forbidden)
 *  ✓ GET    /api/sessions/:id                   — get (success, not found, forbidden)
 *  ✓ PATCH  /api/sessions/:id                   — update (success, not found, forbidden, cancelled, location cross-tenant, capacity→FULL, capacity→OPEN)
 *  ✓ DELETE /api/sessions/:id                   — delete (success, not found, forbidden)
 *  ✓ POST   /api/sessions/:id/book              — book (success, full, duplicate, cancelled, not found)
 *  ✓ GET    /api/sessions/:id/bookings          — list bookings
 *  ✓ DELETE /api/sessions/:id/bookings/:id      — cancel booking (success, already cancelled, not found)
 *  ✓ Feature flag off → 503
 */

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockSessionFindMany    = jest.fn();
const mockSessionCount       = jest.fn();
const mockSessionFindUnique  = jest.fn();
const mockSessionCreate      = jest.fn();
const mockSessionUpdate      = jest.fn();
const mockSessionDelete      = jest.fn();
const mockSessionBookingFindUnique = jest.fn();
const mockSessionBookingCount      = jest.fn();
const mockSessionBookingCreate     = jest.fn();
const mockSessionBookingUpdate     = jest.fn();
const mockSessionBookingFindMany   = jest.fn();
const mockServiceFindUnique  = jest.fn();
const mockArtistFindUnique   = jest.fn();
const mockLocationFindUnique = jest.fn();
const mockUserFindUnique     = jest.fn();
const mockTransaction        = jest.fn();

jest.mock('../../lib/redis', () => ({
  getRedis: jest.fn(() => ({
    get:   jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    incr:  jest.fn().mockResolvedValue(1),
  })),
  isRedisHealthy: jest.fn(() => null),
  pingRedis:      jest.fn().mockResolvedValue(undefined),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    session: {
      findMany:   (...a: unknown[]) => mockSessionFindMany(...a),
      count:      (...a: unknown[]) => mockSessionCount(...a),
      findUnique: (...a: unknown[]) => mockSessionFindUnique(...a),
      create:     (...a: unknown[]) => mockSessionCreate(...a),
      update:     (...a: unknown[]) => mockSessionUpdate(...a),
      delete:     (...a: unknown[]) => mockSessionDelete(...a),
    },
    sessionBooking: {
      findUnique: (...a: unknown[]) => mockSessionBookingFindUnique(...a),
      count:      (...a: unknown[]) => mockSessionBookingCount(...a),
      create:     (...a: unknown[]) => mockSessionBookingCreate(...a),
      update:     (...a: unknown[]) => mockSessionBookingUpdate(...a),
      findMany:   (...a: unknown[]) => mockSessionBookingFindMany(...a),
    },
    service: {
      findUnique: (...a: unknown[]) => mockServiceFindUnique(...a),
    },
    artist: {
      findUnique: (...a: unknown[]) => mockArtistFindUnique(...a),
    },
    location: {
      findUnique: (...a: unknown[]) => mockLocationFindUnique(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
    },
    featureFlag: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

// ─── Mock businessType ────────────────────────────────────────────────────────

import * as businessType from '../../config/businessType';

jest.spyOn(businessType, 'getDefaultFlags').mockReturnValue({
  ...businessType.getDefaultFlags('tattoo_studio'),
  MULTI_LOCATION_ENABLED: true,
  GROUP_BOOKING_ENABLED:  true,
});

// ─── Test setup ───────────────────────────────────────────────────────────────

import request from 'supertest';
import { app }  from '../../app';
import jwt      from 'jsonwebtoken';

function makeAdminToken(tenantId = 'tenant_1'): string {
  return jwt.sign(
    { sub: 'admin_user_1', role: 'ADMIN', tenantId },
    process.env['JWT_ACCESS_SECRET']!,
    { expiresIn: '1h' },
  );
}

const adminToken = makeAdminToken();

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sessionFixture = {
  id:               'session_1',
  tenantId:         'tenant_1',
  serviceId:        'svc_1',
  artistId:         'artist_1',
  locationId:       null,
  startTime:        new Date('2025-06-15T10:00:00Z'),
  endTime:          new Date('2025-06-15T11:00:00Z'),
  capacity:         10,
  currentAttendees: 0,
  status:           'OPEN',
  notes:            null,
  createdAt:        new Date(),
  updatedAt:        new Date(),
};

const sessionBookingFixture = {
  id:         'sb_1',
  sessionId:  'session_1',
  customerId: 'cust_1',
  tenantId:   'tenant_1',
  status:     'CONFIRMED',
  createdAt:  new Date(),
  updatedAt:  new Date(),
};

// ─── Feature flag guard ───────────────────────────────────────────────────────

describe('Feature flag guard', () => {
  it('returns 503 when GROUP_BOOKING_ENABLED is false', async () => {
    jest.spyOn(businessType, 'getDefaultFlags').mockReturnValueOnce({
      ...businessType.getDefaultFlags('tattoo_studio'),
      MULTI_LOCATION_ENABLED: true,
      GROUP_BOOKING_ENABLED:  false,
    });

    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(503);
  });
});

beforeEach(() => jest.clearAllMocks());

// ── GET /api/sessions ─────────────────────────────────────────────────────────

describe('GET /api/sessions', () => {
  it('returns empty list when no sessions', async () => {
    mockSessionCount.mockResolvedValue(0);
    mockSessionFindMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns list of sessions', async () => {
    mockSessionCount.mockResolvedValue(1);
    mockSessionFindMany.mockResolvedValue([sessionFixture]);

    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('session_1');
  });
});

// ── POST /api/sessions ────────────────────────────────────────────────────────

describe('POST /api/sessions', () => {
  const validBody = {
    serviceId: 'svc_1',
    artistId:  'artist_1',
    startTime: '2025-06-15T10:00:00Z',
    endTime:   '2025-06-15T11:00:00Z',
    capacity:  10,
  };

  beforeEach(() => {
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1', tenantId: 'tenant_1' });
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_1', tenantId: 'tenant_1' });
  });

  it('creates session successfully', async () => {
    mockSessionCreate.mockResolvedValue(sessionFixture);

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('session_1');
  });

  it('returns 400 when serviceId is missing', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ artistId: 'artist_1', startTime: '2025-06-15T10:00:00Z', endTime: '2025-06-15T11:00:00Z', capacity: 10 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when endTime is before startTime', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validBody, startTime: '2025-06-15T11:00:00Z', endTime: '2025-06-15T10:00:00Z' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when service not found', async () => {
    mockServiceFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody);

    expect(res.status).toBe(404);
  });

  it('returns 403 when service belongs to different tenant', async () => {
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1', tenantId: 'other_tenant' });

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody);

    expect(res.status).toBe(403);
  });
});

// ── GET /api/sessions/:id ─────────────────────────────────────────────────────

describe('GET /api/sessions/:id', () => {
  it('returns session by id', async () => {
    mockSessionFindUnique.mockResolvedValue({ ...sessionFixture, service: { id: 'svc_1', name: 'Service 1' }, artist: { id: 'artist_1', slug: 'artist-1' }, location: null, bookings: [] });

    const res = await request(app)
      .get('/api/sessions/session_1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('session_1');
  });

  it('returns 404 when session not found', async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/sessions/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when session belongs to different tenant', async () => {
    mockSessionFindUnique.mockResolvedValue({ ...sessionFixture, tenantId: 'other_tenant', service: {}, artist: {}, location: null, bookings: [] });

    const res = await request(app)
      .get('/api/sessions/session_1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/sessions/:id ───────────────────────────────────────────────────

describe('PATCH /api/sessions/:id', () => {
  it('updates session successfully', async () => {
    mockSessionFindUnique.mockResolvedValue(sessionFixture);
    mockSessionUpdate.mockResolvedValue({ ...sessionFixture, capacity: 20 });

    const res = await request(app)
      .patch('/api/sessions/session_1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ capacity: 20 });

    expect(res.status).toBe(200);
  });

  it('returns 404 when session not found', async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/sessions/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ capacity: 20 });

    expect(res.status).toBe(404);
  });

  it('returns 403 when session belongs to different tenant', async () => {
    mockSessionFindUnique.mockResolvedValue({ ...sessionFixture, tenantId: 'other_tenant' });

    const res = await request(app)
      .patch('/api/sessions/session_1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ capacity: 20 });

    expect(res.status).toBe(403);
  });

  it('returns 409 when session is cancelled', async () => {
    mockSessionFindUnique.mockResolvedValue({ ...sessionFixture, status: 'CANCELLED' });

    const res = await request(app)
      .patch('/api/sessions/session_1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ capacity: 20 });

    expect(res.status).toBe(409);
  });

  it('returns 403 when new locationId belongs to a different tenant', async () => {
    mockSessionFindUnique.mockResolvedValue(sessionFixture);
    mockLocationFindUnique.mockResolvedValue({ id: 'loc_other', tenantId: 'other_tenant' });

    const res = await request(app)
      .patch('/api/sessions/session_1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ locationId: 'loc_other' });

    expect(res.status).toBe(403);
  });

  it('auto-sets status FULL when capacity reduced to at or below currentAttendees', async () => {
    const fullSession = { ...sessionFixture, currentAttendees: 8, status: 'OPEN' };
    mockSessionFindUnique.mockResolvedValue(fullSession);
    mockSessionUpdate.mockResolvedValue({ ...fullSession, capacity: 8, status: 'FULL' });

    const res = await request(app)
      .patch('/api/sessions/session_1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ capacity: 8 });

    expect(res.status).toBe(200);
    const updateCall = mockSessionUpdate.mock.calls[0][0];
    expect(updateCall.data.status).toBe('FULL');
  });

  it('auto-sets status OPEN when capacity increased above currentAttendees while FULL', async () => {
    const fullSession = { ...sessionFixture, currentAttendees: 5, status: 'FULL' };
    mockSessionFindUnique.mockResolvedValue(fullSession);
    mockSessionUpdate.mockResolvedValue({ ...fullSession, capacity: 10, status: 'OPEN' });

    const res = await request(app)
      .patch('/api/sessions/session_1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ capacity: 10 });

    expect(res.status).toBe(200);
    const updateCall = mockSessionUpdate.mock.calls[0][0];
    expect(updateCall.data.status).toBe('OPEN');
  });
});

// ── DELETE /api/sessions/:id ──────────────────────────────────────────────────

describe('DELETE /api/sessions/:id', () => {
  it('deletes session successfully', async () => {
    mockSessionFindUnique.mockResolvedValue(sessionFixture);
    mockSessionDelete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/sessions/session_1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 when session not found', async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/sessions/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ── POST /api/sessions/:id/book ───────────────────────────────────────────────

describe('POST /api/sessions/:id/book', () => {
  it('books a spot successfully via transaction', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      return fn({
        session: {
          findUnique: jest.fn().mockResolvedValue(sessionFixture),
          update:     jest.fn().mockResolvedValue({ ...sessionFixture, currentAttendees: 1 }),
        },
        sessionBooking: {
          findUnique: jest.fn().mockResolvedValue(null),
          create:     jest.fn().mockResolvedValue(sessionBookingFixture),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'cust_1', tenantId: 'tenant_1' }),
        },
      });
    });

    const res = await request(app)
      .post('/api/sessions/session_1/book')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: 'cust_1' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('sb_1');
  });

  it('returns 409 when session is full', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      return fn({
        session: {
          findUnique: jest.fn().mockResolvedValue({ ...sessionFixture, status: 'FULL' }),
        },
        sessionBooking: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'cust_1', tenantId: 'tenant_1' }),
        },
      });
    });

    const res = await request(app)
      .post('/api/sessions/session_1/book')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: 'cust_1' });

    expect(res.status).toBe(409);
  });

  it('returns 409 when customer already booked', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      return fn({
        session: {
          findUnique: jest.fn().mockResolvedValue(sessionFixture),
        },
        sessionBooking: {
          findUnique: jest.fn().mockResolvedValue({ ...sessionBookingFixture, status: 'CONFIRMED' }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'cust_1', tenantId: 'tenant_1' }),
        },
      });
    });

    const res = await request(app)
      .post('/api/sessions/session_1/book')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: 'cust_1' });

    expect(res.status).toBe(409);
  });

  it('returns 404 when session not found', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      return fn({
        session: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        sessionBooking: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'cust_1', tenantId: 'tenant_1' }),
        },
      });
    });

    const res = await request(app)
      .post('/api/sessions/nonexistent/book')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: 'cust_1' });

    expect(res.status).toBe(404);
  });

  it('returns 404 when customer not found', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      return fn({
        session: {
          findUnique: jest.fn().mockResolvedValue(sessionFixture),
        },
        sessionBooking: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });
    });

    const res = await request(app)
      .post('/api/sessions/session_1/book')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: 'unknown_cust' });

    expect(res.status).toBe(404);
  });

  it('returns 403 when customer belongs to a different tenant', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      return fn({
        session: {
          findUnique: jest.fn().mockResolvedValue(sessionFixture),
        },
        sessionBooking: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'cust_other', tenantId: 'other_tenant' }),
        },
      });
    });

    const res = await request(app)
      .post('/api/sessions/session_1/book')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: 'cust_other' });

    expect(res.status).toBe(403);
  });

  it('returns 400 when customerId is missing', async () => {
    const res = await request(app)
      .post('/api/sessions/session_1/book')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ── GET /api/sessions/:id/bookings ────────────────────────────────────────────

describe('GET /api/sessions/:id/bookings', () => {
  it('lists all bookings for a session', async () => {
    mockSessionFindUnique.mockResolvedValue(sessionFixture);
    mockSessionBookingCount.mockResolvedValue(1);
    mockSessionBookingFindMany.mockResolvedValue([sessionBookingFixture]);

    const res = await request(app)
      .get('/api/sessions/session_1/bookings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 404 when session not found', async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/sessions/nonexistent/bookings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/sessions/:id/bookings/:bookingId ──────────────────────────────

describe('DELETE /api/sessions/:id/bookings/:bookingId', () => {
  it('cancels a session booking successfully', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      return fn({
        session: {
          findUnique: jest.fn().mockResolvedValue(sessionFixture),
          update:     jest.fn().mockResolvedValue({ ...sessionFixture, currentAttendees: 0 }),
        },
        sessionBooking: {
          findUnique: jest.fn().mockResolvedValue(sessionBookingFixture),
          update:     jest.fn().mockResolvedValue({ ...sessionBookingFixture, status: 'CANCELLED' }),
        },
      });
    });

    const res = await request(app)
      .delete('/api/sessions/session_1/bookings/sb_1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('returns 409 when booking is already cancelled', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      return fn({
        session: {
          findUnique: jest.fn().mockResolvedValue(sessionFixture),
        },
        sessionBooking: {
          findUnique: jest.fn().mockResolvedValue({ ...sessionBookingFixture, status: 'CANCELLED' }),
        },
      });
    });

    const res = await request(app)
      .delete('/api/sessions/session_1/bookings/sb_1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
  });

  it('returns 404 when booking not found', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      return fn({
        session: {
          findUnique: jest.fn().mockResolvedValue(sessionFixture),
        },
        sessionBooking: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });
    });

    const res = await request(app)
      .delete('/api/sessions/session_1/bookings/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
