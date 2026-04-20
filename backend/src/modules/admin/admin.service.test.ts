/**
 * Unit tests for admin.service.ts — Step 1.26
 *
 * Prisma is fully mocked so these tests run without a live database.
 *
 * Coverage:
 *  ✓ getStudioSettings
 *      — returns existing settings row for tenant
 *      — returns null when no settings exist for tenant
 *      — throws 403 when tenantId is null (SUPER_ADMIN without context)
 *
 *  ✓ updateStudioSettings
 *      — updates existing settings (returns updated row)
 *      — creates settings on first-time setup (studioName + tenantId provided)
 *      — throws 400 when settings don't exist and studioName is missing
 *      — partial update: only supplied fields change
 *      — throws 403 when tenantId is null (SUPER_ADMIN without context)
 *      — TenantA cannot read TenantB settings (scoped by tenantId)
 *
 *  ✓ listFeatureFlags
 *      — returns all flags ordered by key
 *      — returns empty array when no flags exist
 *
 *  ✓ updateFeatureFlag
 *      — enables a flag (isEnabled → true)
 *      — disables a flag (isEnabled → false)
 *      — throws 404 when key not found
 *
 *  ✓ listUsers
 *      — returns all users paginated (default filters)
 *      — filters by role=ADMIN
 *      — filters by isActive=true
 *      — filters by isActive=false
 *      — search filter builds OR clause on name and email
 *      — returns empty list when no users match
 *
 *  ✓ updateUser
 *      — updates isActive to false (deactivate)
 *      — updates role from CUSTOMER to ADMIN
 *      — updates name only
 *      — updates multiple fields in one call
 *      — throws 404 when user not found
 *
 *  ✓ listArtistsAdmin
 *      — returns all artists paginated
 *      — filters by isActive=true
 *      — filters by isActive=false
 *      — returns empty list when no artists match
 *
 *  ✓ updateArtistAdmin
 *      — updates isActive to false
 *      — updates commissionRate and commissionType
 *      — clears commission (sets to null)
 *      — throws 404 when artist not found
 *
 * Total: 33 tests
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockSettingsFindUnique = jest.fn();
const mockSettingsUpdate    = jest.fn();
const mockSettingsCreate    = jest.fn();

const mockFlagFindFirst  = jest.fn();
const mockFlagFindMany   = jest.fn();
const mockFlagUpdate     = jest.fn();
const mockFlagUpsert     = jest.fn();

const mockUserFindUnique = jest.fn();
const mockUserFindMany   = jest.fn();
const mockUserCount      = jest.fn();
const mockUserUpdate     = jest.fn();

const mockArtistFindUnique = jest.fn();
const mockArtistFindMany   = jest.fn();
const mockArtistCount      = jest.fn();
const mockArtistUpdate     = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    studioSettings: {
      findUnique: (...a: unknown[]) => mockSettingsFindUnique(...a),
      update:    (...a: unknown[]) => mockSettingsUpdate(...a),
      create:    (...a: unknown[]) => mockSettingsCreate(...a),
    },
    featureFlag: {
      findFirst:  (...a: unknown[]) => mockFlagFindFirst(...a),
      findMany:   (...a: unknown[]) => mockFlagFindMany(...a),
      update:     (...a: unknown[]) => mockFlagUpdate(...a),
      upsert:     (...a: unknown[]) => mockFlagUpsert(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      findMany:   (...a: unknown[]) => mockUserFindMany(...a),
      count:      (...a: unknown[]) => mockUserCount(...a),
      update:     (...a: unknown[]) => mockUserUpdate(...a),
    },
    artist: {
      findUnique: (...a: unknown[]) => mockArtistFindUnique(...a),
      findMany:   (...a: unknown[]) => mockArtistFindMany(...a),
      count:      (...a: unknown[]) => mockArtistCount(...a),
      update:     (...a: unknown[]) => mockArtistUpdate(...a),
    },
  },
}));

// ─── Mock Redis (needed by bumpRbacVersion called from updateUser) ────────────
const mockRedisIncr  = jest.fn().mockResolvedValue(1);
const mockRedisGet   = jest.fn().mockResolvedValue(null);
const mockRedisSetex = jest.fn().mockResolvedValue('OK');
jest.mock('../../lib/redis', () => ({
  getRedis: () => ({
    get:   (...a: unknown[]) => mockRedisGet(...a),
    setex: (...a: unknown[]) => mockRedisSetex(...a),
    incr:  (...a: unknown[]) => mockRedisIncr(...a),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { AppError } from '../../errors/AppError';
import * as service from './admin.service';

/** Shared fixture for a stub studio settings row. */
const stubSettings = {
  id:                     'settings-1',
  studioName:             'Test Studio',
  studioEmail:            'hello@studio.com',
  studioPhone:            null,
  studioAddress:          null,
  studioTimezone:         'Europe/London',
  currency:               'GBP',
  depositPercentage:      20,
  depositFixedAmount:     null,
  cancellationHours:      24,
  cancellationFeePercent: 0,
  cancellationPolicyText: null,
  maxCoversPerSlot:       null,
  slotIntervalMinutes:    15,
  googleReviewUrl:        null,
  bookingPageUrl:         null,
  updatedAt:              new Date('2026-01-01'),
};

/** Shared fixture for a stub feature flag. */
const stubFlag = (key: string, isEnabled: boolean) => ({
  id:          `flag-${key}`,
  key,
  label:       key,
  description: null,
  isEnabled,
  updatedAt:   new Date('2026-01-01'),
});

/** Shared fixture for a stub user. */
const stubUser = (overrides: Record<string, unknown> = {}) => ({
  id:               'user-1',
  email:            'user@test.com',
  name:             'Test User',
  phone:            null,
  role:             'CUSTOMER',
  isActive:         true,
  loyaltyBalance:   0,
  marketingConsent: false,
  createdAt:        new Date('2026-01-01'),
  updatedAt:        new Date('2026-01-01'),
  ...overrides,
});

/** Shared fixture for a stub artist. */
const stubArtist = (overrides: Record<string, unknown> = {}) => ({
  id:             'artist-1',
  slug:           'john-doe',
  isActive:       true,
  commissionRate: null,
  commissionType: null,
  bufferMinutes:  30,
  slotDuration:   90,
  user:           { id: 'user-1', name: 'John Doe', email: 'john@studio.com', phone: null },
  ...overrides,
});

// ─── Reset all mocks before each test ────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── getStudioSettings ────────────────────────────────────────────────────────

describe('getStudioSettings', () => {
  it('returns existing settings row for tenant', async () => {
    mockSettingsFindUnique.mockResolvedValue(stubSettings);

    const result = await service.getStudioSettings('tenant-1');

    expect(result).toEqual(stubSettings);
    expect(mockSettingsFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
    );
  });

  it('returns null when no settings exist for tenant', async () => {
    mockSettingsFindUnique.mockResolvedValue(null);

    const result = await service.getStudioSettings('tenant-1');

    expect(result).toBeNull();
  });

  it('throws 403 when tenantId is null (SUPER_ADMIN without context)', async () => {
    await expect(
      service.getStudioSettings(null),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });

    expect(mockSettingsFindUnique).not.toHaveBeenCalled();
  });
});

// ─── updateStudioSettings ─────────────────────────────────────────────────────

describe('updateStudioSettings', () => {
  it('updates existing settings and returns updated row', async () => {
    mockSettingsFindUnique.mockResolvedValue({ id: 'settings-1' });
    const updated = { ...stubSettings, studioName: 'Renamed Studio' };
    mockSettingsUpdate.mockResolvedValue(updated);

    const result = await service.updateStudioSettings({ studioName: 'Renamed Studio' }, 'tenant-1');

    expect(result).toEqual(updated);
    expect(mockSettingsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'settings-1' } }),
    );
    expect(mockSettingsCreate).not.toHaveBeenCalled();
  });

  it('creates settings on first-time setup when studioName is provided', async () => {
    mockSettingsFindUnique.mockResolvedValue(null);
    mockSettingsCreate.mockResolvedValue(stubSettings);

    const result = await service.updateStudioSettings({
      studioName:     'My Studio',
      studioTimezone: 'Europe/London',
    }, 'tenant-1');

    expect(result).toEqual(stubSettings);
    expect(mockSettingsCreate).toHaveBeenCalledTimes(1);
    expect(mockSettingsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1' }) }),
    );
    expect(mockSettingsUpdate).not.toHaveBeenCalled();
  });

  it('throws 400 when settings do not exist and studioName is missing', async () => {
    mockSettingsFindUnique.mockResolvedValue(null);

    await expect(
      service.updateStudioSettings({ currency: 'EUR' }, 'tenant-1'),
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      service.updateStudioSettings({ currency: 'EUR' }, 'tenant-1'),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });

    expect(mockSettingsCreate).not.toHaveBeenCalled();
  });

  it('partial update — only supplied fields are sent to Prisma update', async () => {
    mockSettingsFindUnique.mockResolvedValue({ id: 'settings-1' });
    mockSettingsUpdate.mockResolvedValue(stubSettings);

    await service.updateStudioSettings({ currency: 'USD' }, 'tenant-1');

    expect(mockSettingsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { currency: 'USD' },
      }),
    );
  });

  it('throws 403 when tenantId is null (SUPER_ADMIN without context)', async () => {
    await expect(
      service.updateStudioSettings({ studioName: 'Studio' }, null),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });

    expect(mockSettingsFindUnique).not.toHaveBeenCalled();
  });

  it('TenantA cannot read TenantB settings — scoped by tenantId', async () => {
    // Only TenantA row is found; TenantB would return null
    mockSettingsFindUnique.mockImplementation((args: { where: { tenantId: string } }) => {
      return args.where.tenantId === 'tenant-a' ? Promise.resolve(stubSettings) : Promise.resolve(null);
    });

    const resultA = await service.getStudioSettings('tenant-a');
    const resultB = await service.getStudioSettings('tenant-b');

    expect(resultA).toEqual(stubSettings);
    expect(resultB).toBeNull();
  });
});

// ─── listFeatureFlags ─────────────────────────────────────────────────────────

describe('listFeatureFlags', () => {
  it('returns all flags ordered by key', async () => {
    const flags = [
      stubFlag('ANALYTICS_ENABLED', true),
      stubFlag('ONLINE_PAYMENT_ENABLED', false),
    ];
    mockFlagFindMany.mockResolvedValue(flags);

    const result = await service.listFeatureFlags();

    expect(result).toHaveLength(2);
    expect(mockFlagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { key: 'asc' } }),
    );
  });

  it('returns empty array when no flags exist', async () => {
    mockFlagFindMany.mockResolvedValue([]);

    const result = await service.listFeatureFlags();

    expect(result).toEqual([]);
  });
});

// ─── updateFeatureFlag ────────────────────────────────────────────────────────

describe('updateFeatureFlag', () => {
  it('enables a global flag (isEnabled → true)', async () => {
    const flag    = stubFlag('ONLINE_PAYMENT_ENABLED', false);
    const updated = { ...flag, isEnabled: true };
    mockFlagFindFirst.mockResolvedValue(flag);
    mockFlagUpdate.mockResolvedValue(updated);

    const result = await service.updateFeatureFlag('ONLINE_PAYMENT_ENABLED', {
      isEnabled: true,
    });

    expect(result.isEnabled).toBe(true);
    expect(mockFlagUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: flag.id },
        data:  { isEnabled: true },
      }),
    );
  });

  it('disables a global flag (isEnabled → false)', async () => {
    const flag    = stubFlag('ANALYTICS_ENABLED', true);
    const updated = { ...flag, isEnabled: false };
    mockFlagFindFirst.mockResolvedValue(flag);
    mockFlagUpdate.mockResolvedValue(updated);

    const result = await service.updateFeatureFlag('ANALYTICS_ENABLED', {
      isEnabled: false,
    });

    expect(result.isEnabled).toBe(false);
  });

  it('throws 404 when global key not found', async () => {
    mockFlagFindFirst.mockResolvedValue(null);

    await expect(
      service.updateFeatureFlag('NONEXISTENT_FLAG', { isEnabled: true }),
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      service.updateFeatureFlag('NONEXISTENT_FLAG', { isEnabled: true }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    expect(mockFlagUpdate).not.toHaveBeenCalled();
  });

  it('upserts a per-tenant override when tenantId is provided', async () => {
    const overrideFlag = { ...stubFlag('TIPS_ENABLED', false), tenantId: 'tenant-1' };
    mockFlagUpsert.mockResolvedValue(overrideFlag);

    const result = await service.updateFeatureFlag('TIPS_ENABLED', { isEnabled: false }, 'tenant-1');

    expect(result.isEnabled).toBe(false);
    expect(mockFlagUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key_tenantId: { key: 'TIPS_ENABLED', tenantId: 'tenant-1' } },
        update: { isEnabled: false },
      }),
    );
    expect(mockFlagFindFirst).not.toHaveBeenCalled();
  });
});

// ─── listUsers ────────────────────────────────────────────────────────────────

describe('listUsers', () => {
  it('returns all users paginated with default filters', async () => {
    const users = [stubUser(), stubUser({ id: 'user-2', email: 'b@b.com' })];
    mockUserFindMany.mockResolvedValue(users);
    mockUserCount.mockResolvedValue(2);

    const result = await service.listUsers({}, null);

    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    // No role / isActive / search filters should be applied
    const [findManyCall] = mockUserFindMany.mock.calls;
    expect(findManyCall[0].where).toEqual({});
  });

  it('filters by role=ADMIN', async () => {
    mockUserFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    await service.listUsers({ role: 'ADMIN' }, null);

    const [findManyCall] = mockUserFindMany.mock.calls;
    expect(findManyCall[0].where.role).toBe('ADMIN');
  });

  it('filters by isActive=true', async () => {
    mockUserFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    await service.listUsers({ isActive: true }, null);

    const [findManyCall] = mockUserFindMany.mock.calls;
    expect(findManyCall[0].where.isActive).toBe(true);
  });

  it('filters by isActive=false', async () => {
    mockUserFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    await service.listUsers({ isActive: false }, null);

    const [findManyCall] = mockUserFindMany.mock.calls;
    expect(findManyCall[0].where.isActive).toBe(false);
  });

  it('search filter builds OR clause on name and email', async () => {
    mockUserFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    await service.listUsers({ search: 'alice' }, null);

    const [findManyCall] = mockUserFindMany.mock.calls;
    expect(findManyCall[0].where.OR).toEqual([
      { name:  { contains: 'alice', mode: 'insensitive' } },
      { email: { contains: 'alice', mode: 'insensitive' } },
    ]);
  });

  it('returns empty list when no users match', async () => {
    mockUserFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    const result = await service.listUsers({ role: 'ADMIN' }, null);

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});

// ─── updateUser ───────────────────────────────────────────────────────────────

describe('updateUser', () => {
  it('deactivates a user (isActive → false)', async () => {
    mockUserFindUnique.mockResolvedValue(stubUser());
    const deactivated = stubUser({ isActive: false });
    mockUserUpdate.mockResolvedValue(deactivated);

    const result = await service.updateUser('user-1', { isActive: false }, null);

    expect(result.isActive).toBe(false);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data:  { isActive: false },
      }),
    );
  });

  it('promotes a user role from CUSTOMER to ADMIN', async () => {
    mockUserFindUnique.mockResolvedValue(stubUser({ role: 'CUSTOMER' }));
    mockUserUpdate.mockResolvedValue(stubUser({ role: 'ADMIN' }));

    const result = await service.updateUser('user-1', { role: 'ADMIN' }, null, 'SUPER_ADMIN');

    expect(result.role).toBe('ADMIN');
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'ADMIN' } }),
    );
  });

  it('updates name only', async () => {
    mockUserFindUnique.mockResolvedValue(stubUser());
    mockUserUpdate.mockResolvedValue(stubUser({ name: 'Alice' }));

    const result = await service.updateUser('user-1', { name: 'Alice' }, null);

    expect(result.name).toBe('Alice');
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Alice' } }),
    );
  });

  it('updates multiple fields in one call', async () => {
    mockUserFindUnique.mockResolvedValue(stubUser());
    mockUserUpdate.mockResolvedValue(
      stubUser({ role: 'ARTIST', isActive: true, name: 'Bob' }),
    );

    await service.updateUser('user-1', { role: 'ARTIST', isActive: true, name: 'Bob' }, null, 'SUPER_ADMIN');

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { role: 'ARTIST', isActive: true, name: 'Bob' },
      }),
    );
  });

  it('throws 404 when user not found', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    await expect(
      service.updateUser('nonexistent', { isActive: false }, null),
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      service.updateUser('nonexistent', { isActive: false }, null),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  // ── AUDIT-022: canAssignRoles guard ────────────────────────────────────────
  it('throws 403 when ADMIN without canAssignRoles tries to change role', async () => {
    mockUserFindUnique.mockResolvedValue(stubUser({ tenantId: 'tenant1' }));

    await expect(
      service.updateUser('user-1', { role: 'ADMIN' }, 'tenant1', 'ADMIN', false),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });

    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('allows ADMIN with canAssignRoles to change role', async () => {
    mockUserFindUnique.mockResolvedValue(stubUser({ tenantId: 'tenant1' }));
    mockUserUpdate.mockResolvedValue(stubUser({ role: 'ADMIN', tenantId: 'tenant1' }));

    const result = await service.updateUser('user-1', { role: 'ADMIN' }, 'tenant1', 'ADMIN', true);

    expect(result.role).toBe('ADMIN');
    expect(mockUserUpdate).toHaveBeenCalled();
  });

  it('allows SUPER_ADMIN to change role without canAssignRoles', async () => {
    mockUserFindUnique.mockResolvedValue(stubUser());
    mockUserUpdate.mockResolvedValue(stubUser({ role: 'ARTIST' }));

    const result = await service.updateUser('user-1', { role: 'ARTIST' }, null, 'SUPER_ADMIN', false);

    expect(result.role).toBe('ARTIST');
    expect(mockUserUpdate).toHaveBeenCalled();
  });

  it('allows ADMIN without canAssignRoles to update non-role fields', async () => {
    mockUserFindUnique.mockResolvedValue(stubUser({ tenantId: 'tenant1' }));
    mockUserUpdate.mockResolvedValue(stubUser({ name: 'New Name', tenantId: 'tenant1' }));

    const result = await service.updateUser('user-1', { name: 'New Name' }, 'tenant1', 'ADMIN', false);

    expect(result.name).toBe('New Name');
    expect(mockUserUpdate).toHaveBeenCalled();
  });

  // ── BUG 23: deactivating a user must invalidate active JWTs (rbac bump) ────
  it('bumps rbacVersion when isActive changes (BUG 23)', async () => {
    mockUserFindUnique.mockResolvedValue(stubUser());
    mockUserUpdate.mockResolvedValue(stubUser({ isActive: false }));
    mockRedisIncr.mockClear();

    await service.updateUser('user-1', { isActive: false }, null);

    expect(mockRedisIncr).toHaveBeenCalledWith('rbacVersion:user-1');
  });

  it('still bumps rbacVersion when role changes (regression)', async () => {
    mockUserFindUnique.mockResolvedValue(stubUser());
    mockUserUpdate.mockResolvedValue(stubUser({ role: 'ARTIST' }));
    mockRedisIncr.mockClear();

    await service.updateUser('user-1', { role: 'ARTIST' }, null, 'SUPER_ADMIN');

    expect(mockRedisIncr).toHaveBeenCalledWith('rbacVersion:user-1');
  });

  it('does NOT bump rbacVersion for name-only updates', async () => {
    mockUserFindUnique.mockResolvedValue(stubUser());
    mockUserUpdate.mockResolvedValue(stubUser({ name: 'Bob' }));
    mockRedisIncr.mockClear();

    await service.updateUser('user-1', { name: 'Bob' }, null);

    expect(mockRedisIncr).not.toHaveBeenCalled();
  });
});

// ─── listArtistsAdmin ─────────────────────────────────────────────────────────

describe('listArtistsAdmin', () => {
  it('returns all artists paginated', async () => {
    const artists = [stubArtist(), stubArtist({ id: 'artist-2', slug: 'jane' })];
    mockArtistFindMany.mockResolvedValue(artists);
    mockArtistCount.mockResolvedValue(2);

    const result = await service.listArtistsAdmin({}, null);

    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    const [call] = mockArtistFindMany.mock.calls;
    expect(call[0].where).toEqual({});
  });

  it('filters by isActive=true', async () => {
    mockArtistFindMany.mockResolvedValue([]);
    mockArtistCount.mockResolvedValue(0);

    await service.listArtistsAdmin({ isActive: true }, null);

    const [call] = mockArtistFindMany.mock.calls;
    expect(call[0].where.isActive).toBe(true);
  });

  it('filters by isActive=false', async () => {
    mockArtistFindMany.mockResolvedValue([]);
    mockArtistCount.mockResolvedValue(0);

    await service.listArtistsAdmin({ isActive: false }, null);

    const [call] = mockArtistFindMany.mock.calls;
    expect(call[0].where.isActive).toBe(false);
  });

  it('returns empty list when no artists match filter', async () => {
    mockArtistFindMany.mockResolvedValue([]);
    mockArtistCount.mockResolvedValue(0);

    const result = await service.listArtistsAdmin({ isActive: false }, null);

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});

// ─── updateArtistAdmin ────────────────────────────────────────────────────────

describe('updateArtistAdmin', () => {
  it('deactivates an artist (isActive → false)', async () => {
    mockArtistFindUnique.mockResolvedValue(stubArtist());
    const deactivated = stubArtist({ isActive: false });
    mockArtistUpdate.mockResolvedValue(deactivated);

    const result = await service.updateArtistAdmin('artist-1', { isActive: false }, null);

    expect(result.isActive).toBe(false);
    expect(mockArtistUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'artist-1' },
        data:  { isActive: false },
      }),
    );
  });

  it('sets commissionRate and commissionType', async () => {
    mockArtistFindUnique.mockResolvedValue(stubArtist());
    mockArtistUpdate.mockResolvedValue(
      stubArtist({ commissionRate: 15, commissionType: 'PERCENTAGE' }),
    );

    const result = await service.updateArtistAdmin('artist-1', {
      commissionRate: 15,
      commissionType: 'PERCENTAGE',
    }, null);

    expect(result.commissionRate).toBe(15);
    expect(result.commissionType).toBe('PERCENTAGE');
    expect(mockArtistUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { commissionRate: 15, commissionType: 'PERCENTAGE' },
      }),
    );
  });

  it('clears commission by setting commissionRate and commissionType to null', async () => {
    mockArtistFindUnique.mockResolvedValue(
      stubArtist({ commissionRate: 10, commissionType: 'PERCENTAGE' }),
    );
    mockArtistUpdate.mockResolvedValue(
      stubArtist({ commissionRate: null, commissionType: null }),
    );

    const result = await service.updateArtistAdmin('artist-1', {
      commissionRate: null,
      commissionType: null,
    }, null);

    expect(result.commissionRate).toBeNull();
    expect(result.commissionType).toBeNull();
  });

  it('throws 404 when artist not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);

    await expect(
      service.updateArtistAdmin('nonexistent', { isActive: true }, null),
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      service.updateArtistAdmin('nonexistent', { isActive: true }, null),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    expect(mockArtistUpdate).not.toHaveBeenCalled();
  });
});
