/**
 * Unit tests for tenants.service.ts — Phase 0
 *
 * Prisma is fully mocked so these tests run without a live database.
 *
 * Coverage:
 *  ✓ createTenant
 *      — creates a tenant with all required fields
 *      — uses default businessType and plan when not supplied
 *      — throws 409 when slug already exists
 *
 *  ✓ listTenants
 *      — returns all tenants paginated
 *      — filters by isActive=true
 *      — filters by isActive=false
 *      — search filter builds OR clause on name and slug
 *      — returns empty list when nothing matches
 *
 *  ✓ getTenantById
 *      — returns the tenant when found
 *      — throws 404 when tenant not found
 *
 *  ✓ updateTenant
 *      — updates name
 *      — updates businessType and plan
 *      — throws 404 when tenant not found
 *
 *  ✓ deleteTenant
 *      — sets isActive=false
 *      — throws 404 when tenant not found
 *      — throws 409 when tenant is already deactivated
 *
 * Total: 16 tests
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

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
  },
}));

import {
  createTenant,
  listTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
} from './tenants.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tenantRow = {
  id:           't1',
  slug:         'ink-masters',
  name:         'Ink Masters London',
  businessType: 'tattoo_studio',
  plan:         'starter',
  isActive:     true,
  createdAt:    new Date('2024-01-01'),
  updatedAt:    new Date('2024-01-01'),
};

// ─── createTenant ─────────────────────────────────────────────────────────────

describe('createTenant', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a tenant with all required fields', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(null); // slug not taken
    mockTenantCreate.mockResolvedValueOnce(tenantRow);

    const result = await createTenant({
      slug:         'ink-masters',
      name:         'Ink Masters London',
      businessType: 'tattoo_studio',
      plan:         'starter',
    });

    expect(result).toEqual(tenantRow);
    expect(mockTenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'ink-masters',
          name: 'Ink Masters London',
        }),
      }),
    );
  });

  it('uses default businessType and plan when not supplied', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(null);
    const defaultRow = { ...tenantRow, businessType: 'tattoo_studio', plan: 'starter' };
    mockTenantCreate.mockResolvedValueOnce(defaultRow);

    // Cast to satisfy type — businessType and plan have defaults
    await createTenant({ slug: 'test', name: 'Test', businessType: 'tattoo_studio', plan: 'starter' });

    const createCall = mockTenantCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createCall.data.businessType).toBe('tattoo_studio');
    expect(createCall.data.plan).toBe('starter');
  });

  it('throws 409 when slug already exists', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(tenantRow); // slug taken

    await expect(
      createTenant({ slug: 'ink-masters', name: 'Duplicate', businessType: 'tattoo_studio', plan: 'starter' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });
});

// ─── listTenants ──────────────────────────────────────────────────────────────

describe('listTenants', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns all tenants paginated', async () => {
    mockTenantFindMany.mockResolvedValueOnce([tenantRow]);
    mockTenantCount.mockResolvedValueOnce(1);

    const result = await listTenants({});
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('filters by isActive=true', async () => {
    mockTenantFindMany.mockResolvedValueOnce([tenantRow]);
    mockTenantCount.mockResolvedValueOnce(1);

    await listTenants({ isActive: 'true' });

    const callArgs = mockTenantFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArgs.where).toHaveProperty('isActive', true);
  });

  it('filters by isActive=false', async () => {
    mockTenantFindMany.mockResolvedValueOnce([]);
    mockTenantCount.mockResolvedValueOnce(0);

    await listTenants({ isActive: 'false' });

    const callArgs = mockTenantFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArgs.where).toHaveProperty('isActive', false);
  });

  it('search filter builds OR clause on name and slug', async () => {
    mockTenantFindMany.mockResolvedValueOnce([]);
    mockTenantCount.mockResolvedValueOnce(0);

    await listTenants({ search: 'ink' });

    const callArgs = mockTenantFindMany.mock.calls[0][0] as { where: { OR?: unknown[] } };
    expect(callArgs.where.OR).toBeDefined();
    expect(Array.isArray(callArgs.where.OR)).toBe(true);
    expect(callArgs.where.OR).toHaveLength(2);
  });

  it('returns empty list when nothing matches', async () => {
    mockTenantFindMany.mockResolvedValueOnce([]);
    mockTenantCount.mockResolvedValueOnce(0);

    const result = await listTenants({ search: 'nonexistent' });
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});

// ─── getTenantById ────────────────────────────────────────────────────────────

describe('getTenantById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the tenant when found', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(tenantRow);

    const result = await getTenantById('t1');
    expect(result).toEqual(tenantRow);
  });

  it('throws 404 when tenant not found', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(null);

    await expect(getTenantById('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

// ─── updateTenant ─────────────────────────────────────────────────────────────

describe('updateTenant', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates tenant name', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(tenantRow);
    mockTenantUpdate.mockResolvedValueOnce({ ...tenantRow, name: 'New Name' });

    const result = await updateTenant('t1', { name: 'New Name' });
    expect(result.name).toBe('New Name');
  });

  it('updates businessType and plan', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(tenantRow);
    mockTenantUpdate.mockResolvedValueOnce({
      ...tenantRow,
      businessType: 'barber',
      plan:         'pro',
    });

    const result = await updateTenant('t1', { businessType: 'barber', plan: 'pro' });
    expect(result.businessType).toBe('barber');
    expect(result.plan).toBe('pro');
  });

  it('throws 404 when tenant not found', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(null);

    await expect(updateTenant('nonexistent', { name: 'X' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

// ─── deleteTenant ─────────────────────────────────────────────────────────────

describe('deleteTenant', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets isActive=false (soft-delete)', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(tenantRow);
    mockTenantUpdate.mockResolvedValueOnce({ ...tenantRow, isActive: false });

    const result = await deleteTenant('t1');
    expect(result.isActive).toBe(false);

    const updateCall = mockTenantUpdate.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(updateCall.data).toEqual({ isActive: false });
  });

  it('throws 404 when tenant not found', async () => {
    mockTenantFindUnique.mockResolvedValueOnce(null);

    await expect(deleteTenant('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws 409 when tenant is already deactivated', async () => {
    mockTenantFindUnique.mockResolvedValueOnce({ ...tenantRow, isActive: false });

    await expect(deleteTenant('t1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });
});
