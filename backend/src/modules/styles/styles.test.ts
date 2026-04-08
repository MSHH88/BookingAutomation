/**
 * Integration tests for /api/styles — Step 1.22
 *
 * Coverage:
 *  ✓ GET  /api/styles        — 200 list (public)
 *  ✓ GET  /api/styles/:id    — 200 found, 404 not found
 *  ✓ POST /api/styles        — 201 ADMIN, 401 unauth, 403 non-ADMIN, 400 invalid
 *  ✓ PATCH /api/styles/:id   — 200 ADMIN, 401 unauth
 *  ✓ DELETE /api/styles/:id  — 200 ADMIN, 403 non-ADMIN
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

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user:    { findUnique: jest.fn() },
    tattooStyle: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
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

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'CUSTOMER', userId = 'u_1') {
  return `Bearer ${jwt.sign({ sub: userId, email: 'test@example.com', role }, SECRET, { expiresIn: '15m' })}`;
}

const baseStyle = {
  id: 's_1', name: 'Blackwork', description: 'Bold black ink', imageUrl: null,
  isActive: true, createdAt: new Date(), updatedAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/styles', () => {
  it('200 — returns empty list', async () => {
    (prisma.tattooStyle.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.tattooStyle.count    as jest.Mock).mockResolvedValue(0);

    const res = await request(app).get('/api/styles');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('200 — returns active styles', async () => {
    (prisma.tattooStyle.findMany as jest.Mock).mockResolvedValue([baseStyle]);
    (prisma.tattooStyle.count    as jest.Mock).mockResolvedValue(1);

    const res = await request(app).get('/api/styles');
    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe('Blackwork');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/styles/:id', () => {
  it('200 — returns style by id', async () => {
    (prisma.tattooStyle.findUnique as jest.Mock).mockResolvedValue(baseStyle);

    const res = await request(app).get('/api/styles/s_1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('s_1');
  });

  it('404 — unknown id', async () => {
    (prisma.tattooStyle.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/styles/nonexistent');
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/styles', () => {
  const validBody = { name: 'Neo Traditional', description: 'Colorful bold lines' };

  it('201 — ADMIN creates style', async () => {
    (prisma.tattooStyle.findUnique as jest.Mock).mockResolvedValue(null); // no duplicate
    (prisma.tattooStyle.create     as jest.Mock).mockResolvedValue(baseStyle);

    const res = await request(app)
      .post('/api/styles')
      .set('Authorization', makeToken('ADMIN'))
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).post('/api/styles').send(validBody);
    expect(res.status).toBe(401);
  });

  it('403 — CUSTOMER cannot create style', async () => {
    const res = await request(app)
      .post('/api/styles')
      .set('Authorization', makeToken('CUSTOMER'))
      .send(validBody);

    expect(res.status).toBe(403);
  });

  it('400 — missing name', async () => {
    const res = await request(app)
      .post('/api/styles')
      .set('Authorization', makeToken('ADMIN'))
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/styles/:id', () => {
  it('200 — ADMIN updates style', async () => {
    (prisma.tattooStyle.findUnique as jest.Mock).mockResolvedValue(baseStyle);
    (prisma.tattooStyle.update     as jest.Mock).mockResolvedValue({ ...baseStyle, name: 'Updated' });

    const res = await request(app)
      .patch('/api/styles/s_1')
      .set('Authorization', makeToken('ADMIN'))
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).patch('/api/styles/s_1').send({ name: 'x' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/styles/:id', () => {
  it('200 — ADMIN soft-deletes style', async () => {
    (prisma.tattooStyle.findUnique as jest.Mock).mockResolvedValue(baseStyle);
    (prisma.tattooStyle.update     as jest.Mock).mockResolvedValue({ ...baseStyle, isActive: false });

    const res = await request(app)
      .delete('/api/styles/s_1')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
  });

  it('403 — ARTIST cannot delete style', async () => {
    const res = await request(app)
      .delete('/api/styles/s_1')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(403);
  });
});
