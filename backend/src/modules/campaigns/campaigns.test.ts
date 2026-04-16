/**
 * Integration tests for /api/campaigns — Phase 1, Step 1.9
 *
 * Coverage:
 *  ✓ GET    /api/campaigns             — 200 ADMIN, 401 unauth
 *  ✓ GET    /api/campaigns/:id         — 200 found, 404 not found
 *  ✓ GET    /api/campaigns/:id/stats   — 200 found
 *  ✓ POST   /api/campaigns             — 201 created, 400 validation
 *  ✓ PATCH  /api/campaigns/:id         — 200 updated, 400 empty body
 *  ✓ 403 when non-ADMIN
 *  ✓ 503 when CAMPAIGNS_ENABLED=false
 *
 * 12 tests total
 */

// ─── Side-effect mocks (must come before app import) ─────────────────────────

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
    user:     { findUnique: jest.fn() },
    campaign: {
      findFirst:  jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
  },
}));

jest.mock('../../jobs/campaign.job', () => ({
  enqueueCampaign:    jest.fn().mockResolvedValue(undefined),
  campaignQueue:      { add: jest.fn(), close: jest.fn() },
  CAMPAIGN_QUEUE_NAME: 'campaign',
}));

jest.mock('bullmq', () => ({
  Queue:  jest.fn().mockImplementation(() => ({ add: jest.fn(), close: jest.fn() })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';

import { app }    from '../../app';
import { prisma } from '../../lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN', userId = 'u_1') {
  return `Bearer ${jwt.sign(
    { sub: userId, email: 'test@example.com', role, tenantId: 'tenant_1' },
    SECRET,
    { expiresIn: '15m' },
  )}`;
}

const baseCampaign = {
  id:             'camp_1',
  tenantId:       'tenant_1',
  name:           'Spring Promo',
  channel:        'WHATSAPP',
  templateKey:    'spring_promo',
  audienceFilter: { type: 'ALL' },
  scheduledAt:    null,
  status:         'DRAFT',
  stats:          { delivered: 10, failed: 2, total: 12 },
  createdAt:      new Date(),
  updatedAt:      new Date(),
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/campaigns', () => {
  it('200 — ADMIN lists campaigns', async () => {
    (prisma.campaign.findMany as jest.Mock).mockResolvedValue([baseCampaign]);
    (prisma.campaign.count    as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/campaigns')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get('/api/campaigns');
    expect(res.status).toBe(401);
  });

  it('403 — ARTIST cannot list campaigns', async () => {
    const res = await request(app)
      .get('/api/campaigns')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/campaigns/:id', () => {
  it('200 — ADMIN gets campaign', async () => {
    (prisma.campaign.findFirst as jest.Mock).mockResolvedValue(baseCampaign);

    const res = await request(app)
      .get('/api/campaigns/camp_1')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('camp_1');
  });

  it('404 — unknown campaign', async () => {
    (prisma.campaign.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/campaigns/nonexistent')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/campaigns/:id/stats', () => {
  it('200 — ADMIN gets campaign stats', async () => {
    (prisma.campaign.findFirst as jest.Mock).mockResolvedValue(baseCampaign);

    const res = await request(app)
      .get('/api/campaigns/camp_1/stats')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ delivered: 10, failed: 2, total: 12 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/campaigns', () => {
  it('201 — ADMIN creates campaign', async () => {
    (prisma.campaign.create as jest.Mock).mockResolvedValue(baseCampaign);

    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', makeToken('ADMIN'))
      .send({
        name:        'Spring Promo',
        channel:     'WHATSAPP',
        templateKey: 'spring_promo',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('camp_1');
  });

  it('400 — validation error (missing name)', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', makeToken('ADMIN'))
      .send({ templateKey: 'spring_promo' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/campaigns/:id', () => {
  it('200 — ADMIN updates campaign', async () => {
    (prisma.campaign.findFirst as jest.Mock).mockResolvedValue(baseCampaign);
    (prisma.campaign.update    as jest.Mock).mockResolvedValue({ ...baseCampaign, name: 'Summer Promo' });

    const res = await request(app)
      .patch('/api/campaigns/camp_1')
      .set('Authorization', makeToken('ADMIN'))
      .send({ name: 'Summer Promo' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Summer Promo');
  });

  it('400 — empty body rejected', async () => {
    const res = await request(app)
      .patch('/api/campaigns/camp_1')
      .set('Authorization', makeToken('ADMIN'))
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Feature flag gating', () => {
  it('503 — when CAMPAIGNS_ENABLED is false', async () => {
    const orig = process.env['BUSINESS_TYPE'];
    process.env['BUSINESS_TYPE'] = 'restaurant';

    const res = await request(app)
      .get('/api/campaigns')
      .set('Authorization', makeToken('ADMIN'));

    process.env['BUSINESS_TYPE'] = orig;

    expect(res.status).toBe(503);
  });
});
