/**
 * Unit tests for roles.service.ts — Phase 0
 *
 * Prisma is fully mocked so these tests run without a live database.
 *
 * Coverage:
 *  ✓ listUsers
 *      — SUPER_ADMIN: returns all users (no tenant filter)
 *      — ADMIN with canAssignRoles: scoped to their tenant
 *      — filters by role
 *      — filters by isActive
 *      — search filter builds OR clause
 *
 *  ✓ updateUserRole
 *      — SUPER_ADMIN: can set any role including SUPER_ADMIN
 *      — SUPER_ADMIN: can set canViewLeads and canAssignRoles
 *      — ADMIN with canAssignRoles: can set role ≤ ADMIN
 *      — ADMIN with canAssignRoles: throws 403 when trying to set SUPER_ADMIN role
 *      — ADMIN with canAssignRoles: throws 403 when target in different tenant
 *      — ADMIN with canAssignRoles: throws 403 when trying to set canViewLeads
 *      — ADMIN with canAssignRoles: throws 403 when trying to set canAssignRoles flag
 *      — throws 404 when target user not found
 *      — partial update: only supplied fields change
 *
 * Total: 14 tests
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

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
  },
}));

// ─── Mock Redis (needed by bumpRbacVersion called from updateUserRole) ────────
jest.mock('../../lib/redis', () => ({
  getRedis: () => ({
    get:   jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    incr:  jest.fn().mockResolvedValue(1),
  }),
}));

import { listUsers, updateUserRole } from './roles.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseUser = {
  id:             'u1',
  email:          'admin@example.com',
  name:           'Alice',
  phone:          null,
  role:           'ADMIN' as const,
  tenantId:       'tenant1',
  canViewLeads:   false,
  canAssignRoles: false,
  isActive:       true,
  createdAt:      new Date('2024-01-01'),
  updatedAt:      new Date('2024-01-01'),
};

// ─── listUsers ────────────────────────────────────────────────────────────────

describe('listUsers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('SUPER_ADMIN: returns all users with no tenant filter', async () => {
    mockUserFindMany.mockResolvedValueOnce([baseUser]);
    mockUserCount.mockResolvedValueOnce(1);

    const result = await listUsers({}, 'SUPER_ADMIN', null);

    expect(result.data).toHaveLength(1);
    const callArgs = mockUserFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    // No tenantId filter should be set for SUPER_ADMIN
    expect(callArgs.where).not.toHaveProperty('tenantId');
  });

  it('ADMIN with canAssignRoles: scoped to their tenant', async () => {
    mockUserFindMany.mockResolvedValueOnce([baseUser]);
    mockUserCount.mockResolvedValueOnce(1);

    await listUsers({}, 'ADMIN', 'tenant1');

    const callArgs = mockUserFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArgs.where).toHaveProperty('tenantId', 'tenant1');
  });

  it('filters by role when role query param supplied', async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    mockUserCount.mockResolvedValueOnce(0);

    await listUsers({ role: 'ADMIN' }, 'SUPER_ADMIN', null);

    const callArgs = mockUserFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArgs.where).toHaveProperty('role', 'ADMIN');
  });

  it('filters by isActive=true', async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    mockUserCount.mockResolvedValueOnce(0);

    await listUsers({ isActive: 'true' }, 'SUPER_ADMIN', null);

    const callArgs = mockUserFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArgs.where).toHaveProperty('isActive', true);
  });

  it('search filter builds OR clause on name and email', async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    mockUserCount.mockResolvedValueOnce(0);

    await listUsers({ search: 'alice' }, 'SUPER_ADMIN', null);

    const callArgs = mockUserFindMany.mock.calls[0][0] as { where: { OR?: unknown[] } };
    expect(callArgs.where.OR).toBeDefined();
    expect(Array.isArray(callArgs.where.OR)).toBe(true);
  });
});

// ─── updateUserRole ───────────────────────────────────────────────────────────

describe('updateUserRole', () => {
  beforeEach(() => jest.clearAllMocks());

  it('SUPER_ADMIN: can set any role including SUPER_ADMIN', async () => {
    const target = { ...baseUser, role: 'CUSTOMER' };
    mockUserFindUnique.mockResolvedValueOnce(target);
    mockUserUpdate.mockResolvedValueOnce({ ...target, role: 'SUPER_ADMIN' });

    const result = await updateUserRole('u1', { role: 'SUPER_ADMIN' }, 'SUPER_ADMIN', null);
    expect(result.role).toBe('SUPER_ADMIN');
  });

  it('SUPER_ADMIN: can set canViewLeads and canAssignRoles', async () => {
    mockUserFindUnique.mockResolvedValueOnce(baseUser);
    mockUserUpdate.mockResolvedValueOnce({ ...baseUser, canViewLeads: true, canAssignRoles: true });

    const result = await updateUserRole(
      'u1',
      { canViewLeads: true, canAssignRoles: true },
      'SUPER_ADMIN',
      null,
    );
    expect(result.canViewLeads).toBe(true);
    expect(result.canAssignRoles).toBe(true);
  });

  it('ADMIN with canAssignRoles: can set role ≤ ADMIN', async () => {
    const target = { ...baseUser, tenantId: 'tenant1', role: 'CUSTOMER' };
    mockUserFindUnique.mockResolvedValueOnce(target);
    mockUserUpdate.mockResolvedValueOnce({ ...target, role: 'ARTIST' });

    const result = await updateUserRole('u1', { role: 'ARTIST' }, 'ADMIN', 'tenant1');
    expect(result.role).toBe('ARTIST');
  });

  it('ADMIN with canAssignRoles: throws 403 when trying to assign SUPER_ADMIN role', async () => {
    const target = { ...baseUser, tenantId: 'tenant1' };
    mockUserFindUnique.mockResolvedValueOnce(target);

    await expect(
      updateUserRole('u1', { role: 'SUPER_ADMIN' }, 'ADMIN', 'tenant1'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('ADMIN with canAssignRoles: throws 403 when target is in a different tenant', async () => {
    const target = { ...baseUser, tenantId: 'tenant2' }; // different tenant!
    mockUserFindUnique.mockResolvedValueOnce(target);

    await expect(
      updateUserRole('u1', { role: 'ARTIST' }, 'ADMIN', 'tenant1'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('ADMIN with canAssignRoles: throws 403 when trying to set canViewLeads', async () => {
    const target = { ...baseUser, tenantId: 'tenant1' };
    mockUserFindUnique.mockResolvedValueOnce(target);

    await expect(
      updateUserRole('u1', { canViewLeads: true }, 'ADMIN', 'tenant1'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('ADMIN with canAssignRoles: throws 403 when trying to set canAssignRoles flag', async () => {
    const target = { ...baseUser, tenantId: 'tenant1' };
    mockUserFindUnique.mockResolvedValueOnce(target);

    await expect(
      updateUserRole('u1', { canAssignRoles: true }, 'ADMIN', 'tenant1'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws 404 when target user not found', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);

    await expect(
      updateUserRole('nonexistent', { role: 'ARTIST' }, 'SUPER_ADMIN', null),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('partial update: only supplied fields change', async () => {
    mockUserFindUnique.mockResolvedValueOnce(baseUser);
    mockUserUpdate.mockResolvedValueOnce({ ...baseUser, canViewLeads: true });

    await updateUserRole('u1', { canViewLeads: true }, 'SUPER_ADMIN', null);

    const updateCall = mockUserUpdate.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    // Only canViewLeads should be in the update payload
    expect(updateCall.data).toHaveProperty('canViewLeads', true);
    expect(updateCall.data).not.toHaveProperty('role');
    expect(updateCall.data).not.toHaveProperty('canAssignRoles');
  });
});
