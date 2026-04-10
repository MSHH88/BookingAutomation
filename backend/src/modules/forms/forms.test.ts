/**
 * Integration tests for /api/forms — Phase 3.2
 *
 * Coverage:
 *  ✓ GET    /api/forms                        — 200 (ADMIN), 401, 403 (ARTIST)
 *  ✓ GET    /api/forms/:id                    — 200, 404
 *  ✓ POST   /api/forms                        — 201, 400
 *  ✓ PATCH  /api/forms/:id                    — 200
 *  ✓ DELETE /api/forms/:id                    — 200, 404
 *  ✓ GET    /api/forms/:id/responses          — 200
 *  ✓ GET    /api/forms/public/:bookingToken   — 200, 404
 *  ✓ POST   /api/forms/public/:bookingToken   — 201
 *
 * Total: 13 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    form: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      findFirst:  jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
    formResponse: {
      findMany:  jest.fn(),
      findFirst: jest.fn(),
      create:    jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    user: {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN', userId = 'u_1') {
  return jwt.sign(
    { sub: userId, email: `${role.toLowerCase()}@test.com`, role, tenantId: 'tenant-1' },
    SECRET,
    { expiresIn: '1h' },
  );
}

const sampleForm = {
  id: 'form-1',
  tenantId: 'tenant-1',
  name: 'Tattoo Consent',
  serviceTypes: ['Tattoo'],
  fields: [{ name: 'allergies', type: 'text', label: 'Allergies?', required: true }],
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/forms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterAll(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── GET /api/forms ────────────────────────────────────────────────────────

  describe('GET /api/forms', () => {
    it('200 — returns forms for ADMIN', async () => {
      (prisma.form.findMany as jest.Mock).mockResolvedValue([sampleForm]);

      const res = await request(app)
        .get('/api/forms')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Tattoo Consent');
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/forms');
      expect(res.status).toBe(401);
    });

    it('403 — ARTIST cannot list forms', async () => {
      const res = await request(app)
        .get('/api/forms')
        .set('Authorization', `Bearer ${makeToken('ARTIST')}`);

      expect(res.status).toBe(403);
    });
  });

  // ── GET /api/forms/:id ────────────────────────────────────────────────────

  describe('GET /api/forms/:id', () => {
    it('200 — returns form by ID', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(sampleForm);

      const res = await request(app)
        .get('/api/forms/form-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('form-1');
    });

    it('404 — form not found', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/forms/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/forms ───────────────────────────────────────────────────────

  describe('POST /api/forms', () => {
    it('201 — creates a new form', async () => {
      (prisma.form.create as jest.Mock).mockResolvedValue(sampleForm);

      const res = await request(app)
        .post('/api/forms')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({
          name: 'Tattoo Consent',
          serviceTypes: ['Tattoo'],
          fields: [{ name: 'allergies', type: 'text', label: 'Allergies?', required: true }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Tattoo Consent');
    });

    it('400 — missing required fields', async () => {
      const res = await request(app)
        .post('/api/forms')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ name: 'No Fields' });

      expect(res.status).toBe(400);
    });
  });

  // ── PATCH /api/forms/:id ──────────────────────────────────────────────────

  describe('PATCH /api/forms/:id', () => {
    it('200 — updates a form', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(sampleForm);
      (prisma.form.update as jest.Mock).mockResolvedValue({ ...sampleForm, name: 'Updated' });

      const res = await request(app)
        .patch('/api/forms/form-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated');
    });
  });

  // ── DELETE /api/forms/:id ─────────────────────────────────────────────────

  describe('DELETE /api/forms/:id', () => {
    it('200 — deactivates a form', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(sampleForm);
      (prisma.form.update as jest.Mock).mockResolvedValue({ ...sampleForm, isActive: false });

      const res = await request(app)
        .delete('/api/forms/form-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
    });

    it('404 — form not found', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/forms/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/forms/:id/responses ──────────────────────────────────────────

  describe('GET /api/forms/:id/responses', () => {
    it('200 — returns responses for a form', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(sampleForm);
      (prisma.formResponse.findMany as jest.Mock).mockResolvedValue([
        { id: 'resp-1', formId: 'form-1', answers: { allergies: 'None' } },
      ]);

      const res = await request(app)
        .get('/api/forms/form-1/responses')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  // ── GET /api/forms/public/:bookingToken ───────────────────────────────────

  describe('GET /api/forms/public/:bookingToken', () => {
    it('200 — returns form for booking (no auth)', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-1',
        service: { id: 'svc-1', category: { name: 'Tattoo' } },
      });
      (prisma.form.findFirst as jest.Mock).mockResolvedValue(sampleForm);

      const res = await request(app).get('/api/forms/public/tok-abc');

      expect(res.status).toBe(200);
      expect(res.body.data.form.id).toBe('form-1');
      expect(res.body.data.bookingId).toBe('b-1');
    });

    it('404 — booking not found', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/api/forms/public/bad-tok');

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/forms/public/:bookingToken ──────────────────────────────────

  describe('POST /api/forms/public/:bookingToken', () => {
    it('201 — submits form response (no auth)', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-1', customerId: 'cust-1', status: 'AWAITING_FORM',
        service: { category: { name: 'Tattoo' } },
      });
      (prisma.form.findFirst as jest.Mock).mockResolvedValue(sampleForm);
      (prisma.formResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.formResponse.create as jest.Mock).mockResolvedValue({
        id: 'resp-1', formId: 'form-1', bookingId: 'b-1', answers: { allergies: 'None' },
      });
      (prisma.booking.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/forms/public/tok-abc')
        .send({ answers: { allergies: 'None' } });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('resp-1');
    });
  });
});
