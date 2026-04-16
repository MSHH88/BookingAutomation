/**
 * Integration tests for /api/waitlist — Step 1.22
 *
 * Coverage:
 *  ✓ POST /api/waitlist               — 201 public, 503 when feature disabled, 400 invalid, 409 duplicate
 *  ✓ GET  /api/waitlist               — 200 ADMIN, 401 unauth, 403 non-ADMIN
 *  ✓ PATCH /api/waitlist/:id/status   — 200 ADMIN, 409 invalid transition, 404 unknown
 *  ✓ POST  /api/waitlist/:id/notify   — 200 ADMIN, 404 unknown
 *  ✓ GET  /api/waitlist/:id           — 200 ADMIN, 404 unknown
 *  ✓ DELETE /api/waitlist/:id         — 200 ADMIN, 404 unknown
 *
 * 25 tests total
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

jest.mock('../notifications/notifications.service', () => ({
  sendEmail:    jest.fn().mockResolvedValue(undefined),
  sendTestEmail: jest.fn().mockResolvedValue(undefined),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  listTemplates:  jest.fn(),
  getTemplate:    jest.fn(),
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
    user:           { findUnique: jest.fn() },
    waitlistEntry:  {
      findFirst:  jest.fn(),
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
      count:      jest.fn(),
    },
  },
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';

import { app }    from '../../app';
import { prisma } from '../../lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN', userId = 'u_admin') {
  return `Bearer ${jwt.sign({ sub: userId, email: 'admin@example.com', role }, SECRET, { expiresIn: '15m' })}`;
}

const baseEntry = {
  id:            'wl_1',
  name:          'Jane Smith',
  email:         'jane@example.com',
  phone:         '+447700900001',
  artistId:      null,
  serviceId:     null,
  bookingId:     null,
  requestedDate: null,
  notes:         null,
  status:        'WAITING' as const,
  notifiedAt:    null,
  expiresAt:     null,
  createdAt:     new Date(),
  updatedAt:     new Date(),
};

const validJoinBody = {
  name:  'Jane Smith',
  email: 'jane@example.com',
  phone: '+447700900001',
};

// hair_salon has WAITING_LIST_ENABLED=true; restore after suite
const ORIGINAL_BT = process.env['BUSINESS_TYPE'];

beforeAll(() => {
  process.env['BUSINESS_TYPE'] = 'hair_salon';
});

afterAll(() => {
  process.env['BUSINESS_TYPE'] = ORIGINAL_BT;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/waitlist', () => {
  it('201 — public submission accepted', async () => {
    (prisma.waitlistEntry.findFirst  as jest.Mock).mockResolvedValue(null);
    (prisma.waitlistEntry.create     as jest.Mock).mockResolvedValue(baseEntry);

    const res = await request(app).post('/api/waitlist').send(validJoinBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('wl_1');
  });

  it('400 — missing required fields', async () => {
    const res = await request(app).post('/api/waitlist').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  it('409 — duplicate active entry for same email', async () => {
    (prisma.waitlistEntry.findFirst as jest.Mock).mockResolvedValue(baseEntry);

    const res = await request(app).post('/api/waitlist').send(validJoinBody);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WAITLIST_DUPLICATE');
  });

  it('503 — WAITING_LIST_ENABLED=false returns feature disabled', async () => {
    const prev = process.env['BUSINESS_TYPE'];
    process.env['BUSINESS_TYPE'] = 'tattoo_studio'; // tattoo_studio has WAITING_LIST_ENABLED=false

    const res = await request(app).post('/api/waitlist').send(validJoinBody);

    process.env['BUSINESS_TYPE'] = prev;
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('FEATURE_DISABLED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/waitlist', () => {
  it('200 — ADMIN lists waitlist entries', async () => {
    (prisma.waitlistEntry.findMany as jest.Mock).mockResolvedValue([baseEntry]);
    (prisma.waitlistEntry.count   as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/waitlist')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('401 — unauthenticated request rejected', async () => {
    const res = await request(app).get('/api/waitlist');
    expect(res.status).toBe(401);
  });

  it('403 — CUSTOMER cannot list waitlist entries', async () => {
    const res = await request(app)
      .get('/api/waitlist')
      .set('Authorization', makeToken('CUSTOMER'));

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/waitlist/:id', () => {
  it('200 — ADMIN retrieves entry by id', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue(baseEntry);

    const res = await request(app)
      .get('/api/waitlist/wl_1')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('wl_1');
  });

  it('404 — unknown entry id', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/waitlist/nonexistent')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(404);
  });

  it('403 — ARTIST cannot retrieve waitlist entry', async () => {
    const res = await request(app)
      .get('/api/waitlist/wl_1')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/waitlist/:id/status', () => {
  it('200 — ADMIN transitions status WAITING → NOTIFIED', async () => {
    const notified = { ...baseEntry, status: 'NOTIFIED' as const, notifiedAt: new Date(), expiresAt: new Date() };

    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'wl_1', status: 'WAITING', email: 'jane@example.com' });
    (prisma.waitlistEntry.update as jest.Mock).mockResolvedValue(notified);

    const res = await request(app)
      .patch('/api/waitlist/wl_1/status')
      .set('Authorization', makeToken('ADMIN'))
      .send({ status: 'NOTIFIED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('NOTIFIED');
  });

  it('409 — invalid status transition BOOKED → WAITING', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'wl_1', status: 'BOOKED' });

    const res = await request(app)
      .patch('/api/waitlist/wl_1/status')
      .set('Authorization', makeToken('ADMIN'))
      .send({ status: 'WAITING' });

    expect(res.status).toBe(409);
  });

  it('404 — unknown entry', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/waitlist/nonexistent/status')
      .set('Authorization', makeToken('ADMIN'))
      .send({ status: 'NOTIFIED' });

    expect(res.status).toBe(404);
  });

  it('403 — ARTIST cannot change waitlist status', async () => {
    const res = await request(app)
      .patch('/api/waitlist/wl_1/status')
      .set('Authorization', makeToken('ARTIST'))
      .send({ status: 'NOTIFIED' });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/waitlist/:id/notify', () => {
  it('200 — ADMIN sends slot-available notification', async () => {
    const notified = { ...baseEntry, status: 'NOTIFIED' as const, notifiedAt: new Date(), expiresAt: new Date() };

    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValueOnce(
      { id: 'wl_1', status: 'WAITING', email: 'jane@example.com', name: 'Jane Smith', artistId: null, serviceId: null },
    );
    (prisma.waitlistEntry.update as jest.Mock).mockResolvedValue(notified);

    const res = await request(app)
      .post('/api/waitlist/wl_1/notify')
      .set('Authorization', makeToken('ADMIN'))
      .send({ expiresInHours: 48 });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('NOTIFIED');
  });

  it('404 — notify unknown entry', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/waitlist/nonexistent/notify')
      .set('Authorization', makeToken('ADMIN'))
      .send({});

    expect(res.status).toBe(404);
  });

  it('403 — CUSTOMER cannot send notifications', async () => {
    const res = await request(app)
      .post('/api/waitlist/wl_1/notify')
      .set('Authorization', makeToken('CUSTOMER'))
      .send({});

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/waitlist/:id', () => {
  it('200 — ADMIN deletes waitlist entry', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue(baseEntry);
    (prisma.waitlistEntry.delete    as jest.Mock).mockResolvedValue(baseEntry);

    const res = await request(app)
      .delete('/api/waitlist/wl_1')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('404 — delete unknown entry', async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/waitlist/nonexistent')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(404);
  });

  it('403 — ARTIST cannot delete waitlist entries', async () => {
    const res = await request(app)
      .delete('/api/waitlist/wl_1')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(403);
  });
});
