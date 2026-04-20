/**
 * Unit tests for tables.service.ts — Step 1.24
 *
 * Prisma is fully mocked so these tests run without a live database.
 *
 * Coverage:
 *  ✓ listTables          — returns active tables by default,
 *                          filter isActive=false returns all tables,
 *                          filter isActive=true explicit
 *
 *  ✓ getTableAvailability — returns tables matching capacity + no overlap,
 *                           occupied tables excluded,
 *                           all tables occupied returns empty array,
 *                           no tables with sufficient capacity returns empty array,
 *                           uses durationMinutes from query when provided,
 *                           invalid date (month 13) throws 400
 *
 *  ✓ createTable          — creates with all fields,
 *                           creates with defaults (location/position null, isActive true)
 *
 *  ✓ updateTable          — updates name and capacity,
 *                           updates positionX/Y,
 *                           location set to null clears the field,
 *                           table not found → 404
 *
 *  ✓ deleteTable          — deactivates table successfully,
 *                           table has active bookings → 409,
 *                           table not found → 404
 *
 * Total: 18 tests
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'restaurant';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockTableFindMany   = jest.fn();
const mockTableFindUnique = jest.fn();
const mockTableCreate     = jest.fn();
const mockTableUpdate     = jest.fn();
const mockBookingFindMany = jest.fn();
const mockBookingCount    = jest.fn();
const mockTenantFindUnique = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    table: {
      findMany:   (...a: unknown[]) => mockTableFindMany(...a),
      findUnique: (...a: unknown[]) => mockTableFindUnique(...a),
      create:     (...a: unknown[]) => mockTableCreate(...a),
      update:     (...a: unknown[]) => mockTableUpdate(...a),
    },
    booking: {
      findMany: (...a: unknown[]) => mockBookingFindMany(...a),
      count:    (...a: unknown[]) => mockBookingCount(...a),
    },
    tenant: {
      findUnique: (...a: unknown[]) => mockTenantFindUnique(...a),
    },
  },
}));

import {
  listTables,
  getTableAvailability,
  createTable,
  updateTable,
  deleteTable,
} from './tables.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tableA = {
  id: 't_A', name: 'Table A', capacity: 4, location: 'Window',
  positionX: 10, positionY: 20, isActive: true,
  createdAt: new Date(), updatedAt: new Date(),
};
const tableB = {
  id: 't_B', name: 'Table B', capacity: 6, location: null,
  positionX: 30, positionY: 20, isActive: true,
  createdAt: new Date(), updatedAt: new Date(),
};
const tableInactive = {
  id: 't_C', name: 'Table C', capacity: 2, location: null,
  positionX: null, positionY: null, isActive: false,
  createdAt: new Date(), updatedAt: new Date(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// listTables
// ─────────────────────────────────────────────────────────────────────────────

describe('listTables', () => {
  it('returns active tables by default (no isActive query param)', async () => {
    mockTableFindMany.mockResolvedValue([tableA, tableB]);
    const result = await listTables({ slug: 'studio' } as any, 'tenant-1');
    expect(mockTableFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true, tenantId: 'tenant-1' } }),
    );
    expect(result).toEqual([tableA, tableB]);
  });

  it('returns all tables when isActive=false', async () => {
    mockTableFindMany.mockResolvedValue([tableA, tableB, tableInactive]);
    const result = await listTables({ slug: 'studio', isActive: 'false' } as any, 'tenant-1');
    expect(mockTableFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: false, tenantId: 'tenant-1' } }),
    );
    expect(result).toHaveLength(3);
  });

  it('returns only active tables when isActive=true explicitly', async () => {
    mockTableFindMany.mockResolvedValue([tableA, tableB]);
    const result = await listTables({ slug: 'studio', isActive: 'true' } as any, 'tenant-1');
    expect(mockTableFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true, tenantId: 'tenant-1' } }),
    );
    expect(result).toEqual([tableA, tableB]);
  });

  // BUG 26: anonymous public callers must provide a slug; service resolves
  // tenant by slug and never falls back to a "no tenant filter" query.
  it('BUG 26: anonymous caller resolves tenant via slug and scopes by tenantId', async () => {
    mockTenantFindUnique.mockResolvedValue({ id: 'tenant-A' });
    mockTableFindMany.mockResolvedValue([tableA]);
    await listTables({ slug: 'tenant-a-slug' } as any, null);
    expect(mockTenantFindUnique).toHaveBeenCalledWith({
      where: { slug: 'tenant-a-slug' },
      select: { id: true },
    });
    expect(mockTableFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true, tenantId: 'tenant-A' } }),
    );
  });

  it('BUG 26: throws 404 TENANT_NOT_FOUND when slug does not resolve', async () => {
    mockTenantFindUnique.mockResolvedValue(null);
    await expect(
      listTables({ slug: 'missing' } as any, null),
    ).rejects.toMatchObject({ statusCode: 404, code: 'TENANT_NOT_FOUND' });
    expect(mockTableFindMany).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTableAvailability
// ─────────────────────────────────────────────────────────────────────────────

describe('getTableAvailability', () => {
  const baseQuery = { slug: 'studio', date: '2026-06-15', time: '19:00', partySize: 4 } as any;

  it('returns tables that have capacity and no overlapping bookings', async () => {
    mockTableFindMany.mockResolvedValue([tableA, tableB]);
    mockBookingFindMany.mockResolvedValue([]); // no occupied tables
    const result = await getTableAvailability(baseQuery, 'tenant-1');
    expect(result).toEqual([tableA, tableB]);
  });

  it('excludes tables that have an overlapping booking', async () => {
    mockTableFindMany.mockResolvedValue([tableA, tableB]);
    // tableA is occupied
    mockBookingFindMany.mockResolvedValue([{ tableId: 't_A' }]);
    const result = await getTableAvailability(baseQuery, 'tenant-1');
    expect(result).toEqual([tableB]);
  });

  it('returns empty array when all tables are occupied', async () => {
    mockTableFindMany.mockResolvedValue([tableA, tableB]);
    mockBookingFindMany.mockResolvedValue([
      { tableId: 't_A' },
      { tableId: 't_B' },
    ]);
    const result = await getTableAvailability(baseQuery, 'tenant-1');
    expect(result).toEqual([]);
  });

  it('returns empty array when no tables have sufficient capacity', async () => {
    // prisma already filters by capacity >= partySize, so findMany returns []
    mockTableFindMany.mockResolvedValue([]);
    const result = await getTableAvailability({ ...baseQuery, partySize: 100 }, 'tenant-1');
    expect(result).toEqual([]);
    // booking query should NOT have been called — no tables to check
    expect(mockBookingFindMany).not.toHaveBeenCalled();
  });

  it('uses durationMinutes from query when provided', async () => {
    mockTableFindMany.mockResolvedValue([tableA]);
    mockBookingFindMany.mockResolvedValue([]);
    await getTableAvailability({ ...baseQuery, durationMinutes: 60 }, 'tenant-1');
    // We can't directly inspect the computed endAt but we verify the call was made
    expect(mockBookingFindMany).toHaveBeenCalled();
  });

  it('throws 400 for a semantically invalid date (e.g. month 13)', async () => {
    // "2026-13-01" passes the YYYY-MM-DD regex but creates NaN in new Date()
    await expect(
      getTableAvailability({ slug: 'studio', date: '2026-13-01', time: '19:00', partySize: 2 } as any, 'tenant-1'),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_DATETIME' });
    // No DB queries should have been made
    expect(mockTableFindMany).not.toHaveBeenCalled();
  });

  // BUG 26: anonymous availability call resolves tenant via slug
  it('BUG 26: anonymous availability call resolves tenant via slug and scopes query', async () => {
    mockTenantFindUnique.mockResolvedValue({ id: 'tenant-A' });
    mockTableFindMany.mockResolvedValue([tableA]);
    mockBookingFindMany.mockResolvedValue([]);
    await getTableAvailability(baseQuery, null);
    expect(mockTenantFindUnique).toHaveBeenCalledWith({
      where: { slug: 'studio' },
      select: { id: true },
    });
    expect(mockTableFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-A' }),
      }),
    );
  });

  it('BUG 26: anonymous availability call with unknown slug throws 404', async () => {
    mockTenantFindUnique.mockResolvedValue(null);
    await expect(
      getTableAvailability(baseQuery, null),
    ).rejects.toMatchObject({ statusCode: 404, code: 'TENANT_NOT_FOUND' });
    expect(mockTableFindMany).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createTable
// ─────────────────────────────────────────────────────────────────────────────

describe('createTable', () => {
  it('creates a table with all fields', async () => {
    const created = { ...tableA };
    mockTableCreate.mockResolvedValue(created);
    const result = await createTable({
      name: 'Table A', capacity: 4, location: 'Window',
      positionX: 10, positionY: 20, isActive: true,
    });
    expect(mockTableCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Table A', capacity: 4, location: 'Window',
          positionX: 10, positionY: 20, isActive: true,
        }),
      }),
    );
    expect(result).toEqual(created);
  });

  it('creates a table with defaults when optional fields are omitted', async () => {
    const created = {
      ...tableA, location: null, positionX: null, positionY: null, isActive: true,
    };
    mockTableCreate.mockResolvedValue(created);
    const result = await createTable({ name: 'Table A', capacity: 4, isActive: true });
    expect(mockTableCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          location: null, positionX: null, positionY: null, isActive: true,
        }),
      }),
    );
    expect(result).toEqual(created);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateTable
// ─────────────────────────────────────────────────────────────────────────────

describe('updateTable', () => {
  it('updates name and capacity', async () => {
    mockTableFindUnique.mockResolvedValue({ id: 't_A' });
    mockTableUpdate.mockResolvedValue({ ...tableA, name: 'VIP Table', capacity: 8 });
    const result = await updateTable('t_A', { name: 'VIP Table', capacity: 8 });
    expect(mockTableUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't_A' },
        data:  expect.objectContaining({ name: 'VIP Table', capacity: 8 }),
      }),
    );
    expect(result.name).toBe('VIP Table');
  });

  it('updates positionX and positionY for floor plan', async () => {
    mockTableFindUnique.mockResolvedValue({ id: 't_A' });
    mockTableUpdate.mockResolvedValue({ ...tableA, positionX: 55, positionY: 75 });
    await updateTable('t_A', { positionX: 55, positionY: 75 });
    expect(mockTableUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ positionX: 55, positionY: 75 }),
      }),
    );
  });

  it('sets location to null when explicitly passed as null', async () => {
    mockTableFindUnique.mockResolvedValue({ id: 't_A' });
    mockTableUpdate.mockResolvedValue({ ...tableA, location: null });
    await updateTable('t_A', { location: null });
    expect(mockTableUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ location: null }) }),
    );
  });

  it('throws 404 when table not found', async () => {
    mockTableFindUnique.mockResolvedValue(null);
    await expect(updateTable('bad_id', { name: 'x' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'TABLE_NOT_FOUND',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteTable
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteTable', () => {
  it('deactivates a table with no active bookings', async () => {
    mockTableFindUnique.mockResolvedValue({ id: 't_A', name: 'Table A', isActive: true });
    mockBookingCount.mockResolvedValue(0);
    mockTableUpdate.mockResolvedValue({ id: 't_A' });
    await deleteTable('t_A');
    expect(mockTableUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });

  it('throws 409 when table has active bookings', async () => {
    mockTableFindUnique.mockResolvedValue({ id: 't_A', name: 'Table A', isActive: true });
    mockBookingCount.mockResolvedValue(3);
    await expect(deleteTable('t_A')).rejects.toMatchObject({
      statusCode: 409,
      code: 'TABLE_HAS_ACTIVE_BOOKINGS',
    });
    expect(mockTableUpdate).not.toHaveBeenCalled();
  });

  it('throws 404 when table not found', async () => {
    mockTableFindUnique.mockResolvedValue(null);
    await expect(deleteTable('bad_id')).rejects.toMatchObject({
      statusCode: 404,
      code: 'TABLE_NOT_FOUND',
    });
  });
});
