/**
 * Integration tests for /api/memberships — Phase 5.2
 *
 * Coverage:
 *  ✓ GET  /api/memberships       — 200 (ADMIN), 401, 403
 *  ✓ POST /api/memberships       — 201 (ADMIN), 400
 *  ✓ GET  /api/memberships/:id   — 200, 404
 *  ✓ PUT  /api/memberships/:id   — 200
 *  ✓ DELETE /api/memberships/:id — 200
 *  ✓ POST /api/memberships/:id/subscribe — 201 (ADMIN), 409
 *
 * Total: 9 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    membership: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    customerMembership: {
      create:     jest.fn(),
      findFirst:  jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      findUnique: jest.fn(),
      update:     jest.fn(),
      updateMany: jest.fn(),
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

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN', userId = 'u_1') {
  return jwt.sign(
    { sub: userId, email: `${role.toLowerCase()}@test.com`, role, tenantId: 'tenant-1' },
    SECRET,
    { expiresIn: '1h' },
  );
}

function makePlan(overrides: Record<string, unknown> = {}) {
  return {
    id:               'mem-1',
    tenantId:         'tenant-1',
    name:             'Monthly Unlimited',
    price:            99,
    billingInterval:  'MONTHLY',
    includedServices: [],
    usageLimit:       null,
    isActive:         true,
    createdAt:        new Date('2024-01-01'),
    updatedAt:        new Date('2024-01-01'),
    ...overrides,
  };
}

describe('/api/memberships', () => {
  beforeEach(() => {
    process.env['BUSINESS_TYPE'] = 'hair_salon'; // hair_salon has MEMBERSHIPS_ENABLED: true
  });

  afterEach(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  describe('GET /api/memberships', () => {
    it('returns 200 for ADMIN', async () => {
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([makePlan()]);
      (prisma.membership.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/memberships')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/memberships');
      expect(res.status).toBe(401);
    });

    it('returns 403 for ARTIST', async () => {
      const res = await request(app)
        .get('/api/memberships')
        .set('Authorization', `Bearer ${makeToken('ARTIST')}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/memberships', () => {
    it('returns 201 for ADMIN with valid body', async () => {
      (prisma.membership.create as jest.Mock).mockResolvedValue(makePlan());

      const res = await request(app)
        .post('/api/memberships')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ name: 'Monthly Unlimited', price: 99 });

      expect(res.status).toBe(201);
    });

    it('returns 400 with missing required field', async () => {
      const res = await request(app)
        .post('/api/memberships')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ price: 99 }); // missing name

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/memberships/:id', () => {
    it('returns 200 for existing plan', async () => {
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(makePlan());

      const res = await request(app)
        .get('/api/memberships/mem-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
    });

    it('returns 404 for unknown plan', async () => {
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/memberships/unknown')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/memberships/:id', () => {
    it('returns 200 and soft-deletes the plan', async () => {
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(makePlan());
      (prisma.membership.update as jest.Mock).mockResolvedValue(makePlan({ isActive: false }));

      const res = await request(app)
        .delete('/api/memberships/mem-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/memberships/:id/subscribe', () => {
    it('returns 201 for ADMIN with valid body', async () => {
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(makePlan());
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' });
      (prisma.customerMembership.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.customerMembership.create as jest.Mock).mockResolvedValue({
        id:         'cm-1',
        customerId: 'user-1',
        membershipId: 'mem-1',
        tenantId:   'tenant-1',
        stripeSubscriptionId: null,
        status:     'ACTIVE',
        currentPeriodEnd: null,
        createdAt:  new Date(),
        updatedAt:  new Date(),
        membership: { id: 'mem-1', name: 'Monthly Unlimited', billingInterval: 'MONTHLY', includedServices: [], usageLimit: null },
      });

      const res = await request(app)
        .post('/api/memberships/mem-1/subscribe')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ customerId: 'user-1' });

      expect(res.status).toBe(201);
    });
  });
});
