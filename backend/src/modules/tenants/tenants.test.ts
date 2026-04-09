/**
 * Integration tests for /api/tenants — Phase 0
 *
 * Uses Supertest against the full Express app (Prisma and BullMQ mocked).
 *
 * Coverage:
 *  ✓ POST /api/tenants
 *      — 401 when no token
 *      — 403 when ADMIN attempts creation
 *      — 400 when slug is invalid
 *      — 400 when name is missing
 *      — 201 when SUPER_ADMIN creates a tenant
 *      — 409 when slug already exists
 *
 *  ✓ GET /api/tenants
 *      — 401 when no token
 *      — 403 when ADMIN attempts list
 *      — 200 when SUPER_ADMIN lists tenants
 *
 *  ✓ GET /api/tenants/:id
 *      — 200 when tenant found
 *      — 404 when tenant not found
 *
 *  ✓ PATCH /api/tenants/:id
 *      — 400 when body is empty
 *      — 200 when SUPER_ADMIN updates a tenant
 *
 *  ✓ DELETE /api/tenants/:id
 *      — 200 when SUPER_ADMIN deactivates a tenant
 *      — 409 when already deactivated
 *
 * Total: 15 tests
 */

// ─── Env vars before any import ──────────────────────────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockTenantFindUnique = jest.fn();
const mockTenantFindMany   = jest.fn();
const mockTenantCount      = jest.fn();
const mockTenantCreate     = jest.fn();
const mockTenantUpdate     = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: mockTenantFindUnique,
      findMany:   mockTenantFindMany,
      count:      mockTenantCount,
      create:     mockTenantCreate,
      update:     mockTenantUpdate,
    },
    featureFlag: { findUnique: jest.fn() },
  },
}));

jest.mock('bullmq', () => ({
  Queue:  jest.fn().mockImplementation(() => ({ add: jest.fn() })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}));
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ on: jest.fn() })));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app';

// ─── Token helpers ────────────────────────────────────────────────────────────

function makeSuperAdminToken(): string {
  return jwt.sign(
    {
      sub:            'sa1',
      email:          'super@platform.com',
      role:           'SUPER_ADMIN',
      tenantId:       null,
      canViewLeads:   true,
      canAssignRoles: true,
    },
    'a'.repeat(32),
    { expiresIn: '15m' },
  );
}

function makeAdminToken(): string {
  return jwt.sign(
    {
      sub:            'admin1',
      email:          'admin@business.com',
      role:           'ADMIN',
      tenantId:       'tenant1',
      canViewLeads:   false,
      canAssignRoles: false,
    },
    'a'.repeat(32),
    { expiresIn: '15m' },
  );
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tenantRow = {
  id:           't1',
  slug:         'ink-masters',
  name:         'Ink Masters London',
  businessType: 'tattoo_studio',
  plan:         'starter',
  isActive:     true,
  createdAt:    new Date('2024-01-01').toISOString(),
  updatedAt:    new Date('2024-01-01').toISOString(),
};

// ─── POST /api/tenants ────────────────────────────────────────────────────────

describe('POST /api/tenants', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when no Authorization header', async () => {
    const res = await request(app).post('/api/tenants').send({ slug: 'test', name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when ADMIN attempts creation', async () => {
    const res = await request(app)
      .post('/api/tenants')
      .set('Authorization', `Bearer ${makeAdminToken()}`)
      .send({ slug: 'test', name: 'Test' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when slug contains uppercase letters', async () => {
    const res = await request(app)
      .post('/api/tenants')
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`)
      .send({ slug: 'Invalid-Slug', name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/tenants')
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`)
      .send({ slug: 'valid-slug' });
    expect(res.status).toBe(400);
  });

  it('returns 201 when SUPER_ADMIN creates a tenant', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(null); // slug not taken
    mockTenantCreate.mockResolvedValueOnce(tenantRow);

    const res = await request(app)
      .post('/api/tenants')
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`)
      .send({ slug: 'ink-masters', name: 'Ink Masters London' });
    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('ink-masters');
  });

  it('returns 409 when slug already exists', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(tenantRow); // slug taken

    const res = await request(app)
      .post('/api/tenants')
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`)
      .send({ slug: 'ink-masters', name: 'Duplicate' });
    expect(res.status).toBe(409);
  });
});

// ─── GET /api/tenants ─────────────────────────────────────────────────────────

describe('GET /api/tenants', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when no Authorization header', async () => {
    const res = await request(app).get('/api/tenants');
    expect(res.status).toBe(401);
  });

  it('returns 403 when ADMIN attempts list', async () => {
    const res = await request(app)
      .get('/api/tenants')
      .set('Authorization', `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 when SUPER_ADMIN lists tenants', async () => {
    mockTenantFindMany.mockResolvedValueOnce([tenantRow]);
    mockTenantCount.mockResolvedValueOnce(1);

    const res = await request(app)
      .get('/api/tenants')
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── GET /api/tenants/:id ─────────────────────────────────────────────────────

describe('GET /api/tenants/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 when tenant found', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(tenantRow);

    const res = await request(app)
      .get('/api/tenants/t1')
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('t1');
  });

  it('returns 404 when tenant not found', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/tenants/nonexistent')
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`);
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/tenants/:id ───────────────────────────────────────────────────

describe('PATCH /api/tenants/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .patch('/api/tenants/t1')
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 when SUPER_ADMIN updates a tenant', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(tenantRow);
    mockTenantUpdate.mockResolvedValueOnce({ ...tenantRow, name: 'Updated Name' });

    const res = await request(app)
      .patch('/api/tenants/t1')
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
  });
});

// ─── DELETE /api/tenants/:id ──────────────────────────────────────────────────

describe('DELETE /api/tenants/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 when SUPER_ADMIN deactivates a tenant', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(tenantRow);
    mockTenantUpdate.mockResolvedValueOnce({ ...tenantRow, isActive: false });

    const res = await request(app)
      .delete('/api/tenants/t1')
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('returns 409 when tenant is already deactivated', async () => {
    mockTenantFindUnique.mockResolvedValueOnce({ ...tenantRow, isActive: false });

    const res = await request(app)
      .delete('/api/tenants/t1')
      .set('Authorization', `Bearer ${makeSuperAdminToken()}`);
    expect(res.status).toBe(409);
  });
});
