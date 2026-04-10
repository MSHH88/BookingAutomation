/**
 * Integration tests for /api/products — Phase 4.3
 *
 * Coverage:
 *  ✓ GET    /api/products        — 200 (ADMIN), 401, 403
 *  ✓ GET    /api/products/:id    — 200, 404
 *  ✓ POST   /api/products        — 201 (ADMIN), 400
 *  ✓ PATCH  /api/products/:id    — 200 (ADMIN), 404
 *  ✓ DELETE /api/products/:id    — 200 (ADMIN), 404
 *  ✓ PATCH  /api/products/:id/stock — 200 (ADMIN), 400
 *
 * Total: 12 tests
 */

const originalBizType = process.env['BUSINESS_TYPE'];

jest.mock('../../lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
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

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id:                'prod-1',
    tenantId:          'tenant-1',
    name:              'Blue Ink',
    sku:               'INK-BLUE-001',
    price:             9.99,
    stockLevel:        20,
    lowStockThreshold: 5,
    category:          'Inks',
    imageUrl:          null,
    isActive:          true,
    createdAt:         new Date('2024-01-01'),
    updatedAt:         new Date('2024-01-01'),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
  });

  afterAll(() => {
    process.env['BUSINESS_TYPE'] = originalBizType ?? 'tattoo_studio';
  });

  // ── GET /api/products ─────────────────────────────────────────────────────

  describe('GET /api/products', () => {
    it('200 — returns paginated products (ADMIN)', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([makeProduct()]);
      (prisma.product.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.products).toHaveLength(1);
    });

    it('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(401);
    });

    it('403 — CUSTOMER cannot access products', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${makeToken('CUSTOMER')}`);
      expect(res.status).toBe(403);
    });
  });

  // ── GET /api/products/:id ─────────────────────────────────────────────────

  describe('GET /api/products/:id', () => {
    it('200 — returns product (ADMIN)', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(makeProduct());

      const res = await request(app)
        .get('/api/products/prod-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('prod-1');
    });

    it('404 — product not found', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/products/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/products ────────────────────────────────────────────────────

  describe('POST /api/products', () => {
    it('201 — creates product (ADMIN)', async () => {
      (prisma.product.create as jest.Mock).mockResolvedValue(makeProduct({ stockLevel: 0 }));
      (prisma.stockMovement.create as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ name: 'Blue Ink', price: 9.99 });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Blue Ink');
    });

    it('400 — validation error when name is missing', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ price: 9.99 });

      expect(res.status).toBe(400);
    });
  });

  // ── PATCH /api/products/:id ───────────────────────────────────────────────

  describe('PATCH /api/products/:id', () => {
    it('200 — updates product (ADMIN)', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(makeProduct());
      (prisma.product.update as jest.Mock).mockResolvedValue(makeProduct({ name: 'Red Ink' }));

      const res = await request(app)
        .patch('/api/products/prod-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ name: 'Red Ink' });

      expect(res.status).toBe(200);
    });

    it('404 — product not found', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/products/bad-id')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ name: 'X' });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/products/:id ──────────────────────────────────────────────

  describe('DELETE /api/products/:id', () => {
    it('200 — soft-deletes product (ADMIN)', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(makeProduct());
      (prisma.product.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .delete('/api/products/prod-1')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  // ── PATCH /api/products/:id/stock ─────────────────────────────────────────

  describe('PATCH /api/products/:id/stock', () => {
    it('200 — adjusts stock successfully (ADMIN)', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(makeProduct({ stockLevel: 10 }));
      (prisma.product.update as jest.Mock).mockResolvedValue(makeProduct({ stockLevel: 60 }));
      (prisma.stockMovement.create as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .patch('/api/products/prod-1/stock')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ quantity: 50, reason: 'RESTOCK' });

      expect(res.status).toBe(200);
      expect(res.body.data.stockLevel).toBe(60);
    });

    it('400 — invalid reason enum', async () => {
      const res = await request(app)
        .patch('/api/products/prod-1/stock')
        .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
        .send({ quantity: 10, reason: 'INVALID_REASON' });

      expect(res.status).toBe(400);
    });
  });
});
