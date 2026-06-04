/**
 * Integration tests for /api/roles — Phase 0
 *
 * Uses Supertest against the full Express app (Prisma and BullMQ mocked).
 *
 * Coverage:
 *  ✓ GET /api/roles/users
 *      — 401 when no token
 *      — 403 when authenticated as CUSTOMER
 *      — 403 when authenticated as ARTIST
 *      — 403 when authenticated as ADMIN without canAssignRoles
 *      — 200 when authenticated as SUPER_ADMIN
 *      — 200 when authenticated as ADMIN with canAssignRoles (tenant-scoped)
 *
 *  ✓ PATCH /api/roles/users/:id
 *      — 401 when no token
 *      — 403 when CUSTOMER attempts update
 *      — 400 when body is empty
 *      — 200 when SUPER_ADMIN updates role
 *      — 200 when SUPER_ADMIN sets permission flags
 *      — 403 when ADMIN tries to set SUPER_ADMIN role
 *      — 403 when ADMIN tries to set canViewLeads flag
 *      — 404 when target user not found
 *
 * Total: 14 tests
 */

// ─── Env vars before any import ──────────────────────────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUserFindUnique = jest.fn();
const mockUserFindMany   = jest.fn();
const mockUserCount      = jest.fn();
const mockUserUpdate     = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findMany:   mockUserFindMany,
      count:      mockUserCount,
      update:     mockUserUpdate,
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

function makeToken(overrides: Record<string, unknown> = {}): string {
  return jwt.sign(
    {
      sub:            'user1',
      email:          'test@example.com',
      role:           'CUSTOMER',
      tenantId:       'tenant1',
      canViewLeads:   false,
      canAssignRoles: false,
      ...overrides,
    },
    'a'.repeat(32),
    { expiresIn: '15m' },
  );
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const userRow = {
  id:             'u1',
  email:          'alice@example.com',
  name:           'Alice',
  phone:          null,
  role:           'ADMIN',
  tenantId:       'tenant1',
  canViewLeads:   false,
  canAssignRoles: false,
  isActive:       true,
  createdAt:      new Date('2024-01-01'),
  updatedAt:      new Date('2024-01-01'),
};

// ─── GET /api/roles/users ─────────────────────────────────────────────────────

describe('GET /api/roles/users', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when no Authorization header', async () => {
    const res = await request(app).get('/api/roles/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 when authenticated as CUSTOMER', async () => {
    const res = await request(app)
      .get('/api/roles/users')
      .set('Authorization', `Bearer ${makeToken({ role: 'CUSTOMER' })}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 when authenticated as ARTIST', async () => {
    const res = await request(app)
      .get('/api/roles/users')
      .set('Authorization', `Bearer ${makeToken({ role: 'ARTIST' })}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 when ADMIN without canAssignRoles', async () => {
    const res = await request(app)
      .get('/api/roles/users')
      .set('Authorization', `Bearer ${makeToken({ role: 'ADMIN', canAssignRoles: false })}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 when SUPER_ADMIN', async () => {
    mockUserFindMany.mockResolvedValueOnce([userRow]);
    mockUserCount.mockResolvedValueOnce(1);

    const res = await request(app)
      .get('/api/roles/users')
      .set('Authorization', `Bearer ${makeToken({ role: 'SUPER_ADMIN', tenantId: null })}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 200 when ADMIN with canAssignRoles (tenant-scoped)', async () => {
    mockUserFindMany.mockResolvedValueOnce([userRow]);
    mockUserCount.mockResolvedValueOnce(1);

    const res = await request(app)
      .get('/api/roles/users')
      .set(
        'Authorization',
        `Bearer ${makeToken({ role: 'ADMIN', canAssignRoles: true, tenantId: 'tenant1' })}`,
      );
    expect(res.status).toBe(200);
  });
});

// ─── PATCH /api/roles/users/:id ───────────────────────────────────────────────

describe('PATCH /api/roles/users/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when no Authorization header', async () => {
    const res = await request(app).patch('/api/roles/users/u1').send({ role: 'ARTIST' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when CUSTOMER attempts update', async () => {
    const res = await request(app)
      .patch('/api/roles/users/u1')
      .set('Authorization', `Bearer ${makeToken({ role: 'CUSTOMER' })}`)
      .send({ role: 'ARTIST' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .patch('/api/roles/users/u1')
      .set('Authorization', `Bearer ${makeToken({ role: 'SUPER_ADMIN', tenantId: null })}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 when SUPER_ADMIN updates role', async () => {
    mockUserFindUnique.mockResolvedValueOnce(userRow);
    mockUserUpdate.mockResolvedValueOnce({ ...userRow, role: 'ARTIST' });

    const res = await request(app)
      .patch('/api/roles/users/u1')
      .set('Authorization', `Bearer ${makeToken({ role: 'SUPER_ADMIN', tenantId: null })}`)
      .send({ role: 'ARTIST' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('ARTIST');
  });

  it('returns 200 when SUPER_ADMIN sets permission flags', async () => {
    mockUserFindUnique.mockResolvedValueOnce(userRow);
    mockUserUpdate.mockResolvedValueOnce({ ...userRow, canViewLeads: true });

    const res = await request(app)
      .patch('/api/roles/users/u1')
      .set('Authorization', `Bearer ${makeToken({ role: 'SUPER_ADMIN', tenantId: null })}`)
      .send({ canViewLeads: true });
    expect(res.status).toBe(200);
    expect(res.body.data.canViewLeads).toBe(true);
  });

  it('returns 403 when ADMIN tries to assign SUPER_ADMIN role', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ ...userRow, tenantId: 'tenant1' });

    const res = await request(app)
      .patch('/api/roles/users/u1')
      .set(
        'Authorization',
        `Bearer ${makeToken({ role: 'ADMIN', canAssignRoles: true, tenantId: 'tenant1' })}`,
      )
      .send({ role: 'SUPER_ADMIN' });
    expect(res.status).toBe(403);
  });

  it('returns 403 when ADMIN tries to set canViewLeads flag', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ ...userRow, tenantId: 'tenant1' });

    const res = await request(app)
      .patch('/api/roles/users/u1')
      .set(
        'Authorization',
        `Bearer ${makeToken({ role: 'ADMIN', canAssignRoles: true, tenantId: 'tenant1' })}`,
      )
      .send({ canViewLeads: true });
    expect(res.status).toBe(403);
  });

  it('returns 404 when target user not found', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/roles/users/nonexistent')
      .set('Authorization', `Bearer ${makeToken({ role: 'SUPER_ADMIN', tenantId: null })}`)
      .send({ role: 'ARTIST' });
    expect(res.status).toBe(404);
  });
});
