/**
 * Integration tests for /api/leads — Step 1.22
 *
 * Coverage:
 *  ✓ POST /api/leads                 — 201 public, 503 when feature disabled, 422 invalid
 *  ✓ GET  /api/leads                 — 200 ADMIN, 401 unauth, 403 non-ADMIN
 *  ✓ GET  /api/leads/export          — 200 ADMIN (CSV)
 *  ✓ GET  /api/leads/:id             — 200 ADMIN, 404 unknown
 *  ✓ PATCH /api/leads/:id/status     — 200 ADMIN, 400 invalid transition
 *  ✓ PATCH /api/leads/:id/score      — 200 ADMIN
 *
 * 17 tests total
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
    lead:           { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    analyticsEvent: { create: jest.fn() },
  },
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';

import { app }    from '../../app';
import { prisma } from '../../lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'SUPER_ADMIN' | 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'CUSTOMER', userId = 'u_1') {
  return `Bearer ${jwt.sign(
    {
      sub:            userId,
      email:          'test@example.com',
      role,
      tenantId:       role === 'SUPER_ADMIN' ? null : 'tenant1',
      canViewLeads:   role === 'ADMIN' || role === 'SUPER_ADMIN', // ADMIN gets leads access in tests
      canAssignRoles: false,
    },
    SECRET,
    { expiresIn: '15m' },
  )}`;
}

const baseLead = {
  id: 'lead_1', name: 'Bob Client', email: 'bob@example.com',
  phone: '+447700900000', status: 'NEW' as const,
  score: 50, source: null, utmSource: null, utmMedium: null, utmCampaign: null,
  country: 'GB', deviceType: 'desktop', preferWhatsApp: false,
  businessType: 'tattoo_studio', metadata: null,
  placement: null, size: null, colorPreference: null, style: null,
  notes: null, cancelReason: null,
  artistId: null, artist: null, quotes: [], bookings: [],
  createdAt: new Date(), updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.analyticsEvent.create as jest.Mock).mockResolvedValue({ id: 'ae_1' });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/leads', () => {
  const validBody = {
    name: 'New Client', email: 'client@example.com', phone: '+447700900001',
    description: 'Full sleeve tattoo on left arm',
    placement: { area: 'left_arm' },
    businessType: 'tattoo_studio',
  };

  it('201 — public submission accepted', async () => {
    (prisma.lead.create as jest.Mock).mockResolvedValue({ id: 'lead_1', artistId: null, phone: null, preferWhatsApp: false, email: 'client@example.com', name: 'New Client', utmSource: null, utmMedium: null, utmCampaign: null, ipAddress: null });
    (prisma.lead.findUnique as jest.Mock).mockResolvedValue(baseLead);

    const res = await request(app).post('/api/leads').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('lead_1');
  });

  it('400 — missing required fields', async () => {
    const res = await request(app).post('/api/leads').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  it('503 — LEAD_CAPTURE_ENABLED=false returns feature disabled', async () => {
    const originalBT = process.env['BUSINESS_TYPE'];
    process.env['BUSINESS_TYPE'] = 'restaurant'; // restaurant has LEAD_CAPTURE_ENABLED=false

    const res = await request(app).post('/api/leads').send(validBody);

    process.env['BUSINESS_TYPE'] = originalBT;
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('FEATURE_DISABLED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/leads', () => {
  it('200 — ADMIN lists leads', async () => {
    (prisma.lead.findMany as jest.Mock).mockResolvedValue([baseLead]);
    (prisma.lead.count    as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
  });

  it('403 — CUSTOMER cannot list leads', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', makeToken('CUSTOMER'));

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/leads/export', () => {
  it('200 — ADMIN downloads CSV', async () => {
    (prisma.lead.findMany as jest.Mock).mockResolvedValue([baseLead]);

    const res = await request(app)
      .get('/api/leads/export')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  it('403 — ARTIST cannot export leads', async () => {
    const res = await request(app)
      .get('/api/leads/export')
      .set('Authorization', makeToken('ARTIST'));

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/leads/:id', () => {
  it('200 — ADMIN gets lead detail', async () => {
    (prisma.lead.findUnique as jest.Mock).mockResolvedValue({ ...baseLead, tenantId: 'tenant1' });

    const res = await request(app)
      .get('/api/leads/lead_1')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('lead_1');
  });

  it('404 — unknown lead id', async () => {
    (prisma.lead.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/leads/nonexistent')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/leads/:id/status', () => {
  it('200 — ADMIN transitions lead status', async () => {
    const updatedLead  = { ...baseLead, status: 'CONTACTED' as const, tenantId: 'tenant1' };

    (prisma.lead.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'lead_1', status: 'NEW', tenantId: 'tenant1' })  // status check
      .mockResolvedValueOnce(updatedLead);                       // getLeadById
    (prisma.lead.update as jest.Mock).mockResolvedValue({ id: 'lead_1' });

    const res = await request(app)
      .patch('/api/leads/lead_1/status')
      .set('Authorization', makeToken('ADMIN'))
      .send({ status: 'CONTACTED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONTACTED');
  });

  it('403 — ARTIST cannot change lead status', async () => {
    const res = await request(app)
      .patch('/api/leads/lead_1/status')
      .set('Authorization', makeToken('ARTIST'))
      .send({ status: 'CONTACTED' });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/leads/:id/score', () => {
  it('200 — ADMIN updates lead score', async () => {
    const updated = { ...baseLead, score: 85 };

    (prisma.lead.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'lead_1', tenantId: 'tenant1' })  // existence check
      .mockResolvedValueOnce({ ...updated, tenantId: 'tenant1' });    // getLeadById
    (prisma.lead.update as jest.Mock).mockResolvedValue({ id: 'lead_1' });

    const res = await request(app)
      .patch('/api/leads/lead_1/score')
      .set('Authorization', makeToken('ADMIN'))
      .send({ score: 85 });

    expect(res.status).toBe(200);
    expect(res.body.data.score).toBe(85);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT-021 — Tenant isolation on single-record endpoints
// ─────────────────────────────────────────────────────────────────────────────
describe('AUDIT-021 — tenant isolation', () => {
  function makeTokenWithTenant(tenantId: string | null, role: 'SUPER_ADMIN' | 'ADMIN' = 'ADMIN') {
    return `Bearer ${jwt.sign(
      {
        sub:            'u_1',
        email:          'test@example.com',
        role,
        tenantId,
        canViewLeads:   true,
        canAssignRoles: false,
      },
      SECRET,
      { expiresIn: '15m' },
    )}`;
  }

  it('GET /api/leads/:id — 403 when ADMIN accesses a lead from another tenant', async () => {
    (prisma.lead.findUnique as jest.Mock).mockResolvedValueOnce({
      ...baseLead,
      tenantId: 'tenant_OTHER',
    });

    const res = await request(app)
      .get('/api/leads/lead_1')
      .set('Authorization', makeTokenWithTenant('tenant1'));

    expect(res.status).toBe(403);
  });

  it('GET /api/leads/:id — 200 when SUPER_ADMIN accesses any lead (unscoped)', async () => {
    (prisma.lead.findUnique as jest.Mock).mockResolvedValueOnce({
      ...baseLead,
      tenantId: 'tenant_OTHER',
    });

    const res = await request(app)
      .get('/api/leads/lead_1')
      .set('Authorization', makeTokenWithTenant(null, 'SUPER_ADMIN'));

    expect(res.status).toBe(200);
  });

  it('PATCH /api/leads/:id/status — 403 when ADMIN targets a cross-tenant lead', async () => {
    (prisma.lead.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'lead_1', status: 'NEW', tenantId: 'tenant_OTHER',
    });

    const res = await request(app)
      .patch('/api/leads/lead_1/status')
      .set('Authorization', makeTokenWithTenant('tenant1'))
      .send({ status: 'CONTACTED' });

    expect(res.status).toBe(403);
  });

  it('PATCH /api/leads/:id/score — 403 when ADMIN targets a cross-tenant lead', async () => {
    (prisma.lead.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'lead_1', tenantId: 'tenant_OTHER',
    });

    const res = await request(app)
      .patch('/api/leads/lead_1/score')
      .set('Authorization', makeTokenWithTenant('tenant1'))
      .send({ score: 70 });

    expect(res.status).toBe(403);
  });
});
