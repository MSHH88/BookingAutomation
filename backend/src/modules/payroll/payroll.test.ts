/**
 * Integration tests for /api/payroll — Phase 4.6
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    artist: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    stockMovement: {
      findMany: jest.fn(),
    },
    payrollReport: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      count:      jest.fn(),
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

function makeArtist(overrides: Record<string, unknown> = {}) {
  return {
    id:                   'artist-1',
    tenantId:             'tenant-1',
    basePay:              100,
    serviceCommissionPct: 10,
    productCommissionPct: 5,
    ...overrides,
  };
}

function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    id:                'report-1',
    tenantId:          'tenant-1',
    artistId:          'artist-1',
    periodStart:       new Date('2024-06-01'),
    periodEnd:         new Date('2024-06-30'),
    basePay:           100,
    serviceCommission: 50,
    productCommission: 10,
    totalTips:         20,
    totalPay:          160,
    generatedAt:       new Date(),
    artist:            { id: 'artist-1', user: { email: 'artist@test.com' } },
    ...overrides,
  };
}

describe('/api/payroll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterAll(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  describe('POST /api/payroll/generate', () => {
    it('201 — generates payroll report (ADMIN)', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue(makeArtist());
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([{ id: 'book-1' }]);
      (prisma.payment.findMany as jest.Mock).mockResolvedValue([{ amount: 500, tipAmount: 20 }]);
      (prisma.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.payrollReport.create as jest.Mock).mockResolvedValue(makeReport());

      const res = await request(app)
        .post('/api/payroll/generate')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({
          artistId:    'artist-1',
          periodStart: '2024-06-01',
          periodEnd:   '2024-06-30',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.reports).toHaveLength(1);
    });

    it('400 — validation error when periodStart is missing', async () => {
      const res = await request(app)
        .post('/api/payroll/generate')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ artistId: 'artist-1', periodEnd: '2024-06-30' });

      expect(res.status).toBe(400);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app)
        .post('/api/payroll/generate')
        .send({ periodStart: '2024-06-01', periodEnd: '2024-06-30' });

      expect(res.status).toBe(401);
    });

    it('403 — forbidden for non-ADMIN', async () => {
      const res = await request(app)
        .post('/api/payroll/generate')
        .set('Authorization', `Bearer ${makeToken('CUSTOMER')}`)
        .send({ periodStart: '2024-06-01', periodEnd: '2024-06-30' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/payroll/reports', () => {
    it('200 — returns paginated reports (ADMIN)', async () => {
      (prisma.payrollReport.findMany as jest.Mock).mockResolvedValue([makeReport()]);
      (prisma.payrollReport.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/payroll/reports')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.reports).toHaveLength(1);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/payroll/reports');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/payroll/reports/:id', () => {
    it('200 — returns single report (ADMIN)', async () => {
      (prisma.payrollReport.findUnique as jest.Mock).mockResolvedValue(makeReport());

      const res = await request(app)
        .get('/api/payroll/reports/report-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('report-1');
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/payroll/reports/report-1');
      expect(res.status).toBe(401);
    });

    it('404 — report not found', async () => {
      (prisma.payrollReport.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/payroll/reports/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/payroll/my-earnings', () => {
    it('200 — returns earnings for authenticated ARTIST', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue({ id: 'artist-1' });
      (prisma.payrollReport.findMany as jest.Mock).mockResolvedValue([makeReport()]);
      (prisma.payrollReport.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/payroll/my-earnings')
        .set('Authorization', `Bearer ${makeToken('ARTIST')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.reports).toHaveLength(1);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/payroll/my-earnings');
      expect(res.status).toBe(401);
    });

    it('404 — artist profile not found', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/payroll/my-earnings')
        .set('Authorization', `Bearer ${makeToken('ARTIST')}`);

      expect(res.status).toBe(404);
    });
  });
});
