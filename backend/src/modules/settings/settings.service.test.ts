/**
 * Unit tests for settings.service.ts — Step 1.29
 *
 * All external dependencies are mocked:
 *   - ../../lib/prisma   — database calls
 *   - ../../lib/redis    — Redis get / set / del
 *   - ../../utils/logger — logger.warn (silenced in tests)
 *
 * Coverage:
 *  ✓ getCachedSettings
 *      — returns cached JSON when Redis has the key (no DB call)
 *      — fetches from DB, writes to cache, and returns data on cache miss
 *      — returns null when settings row does not exist (DB returns null)
 *      — falls through to DB when Redis.get() throws (non-fatal)
 *      — returns data even when Redis.set() throws after DB fetch (non-fatal)
 *      — does NOT attempt to cache a null result
 *
 *  ✓ updateSettings
 *      — updates the existing row and returns the full settings object
 *      — invalidates the Redis cache after a successful update
 *      — creates a new row when none exists (studioName provided)
 *      — throws 400 when no settings row exists and studioName is missing
 *      — partial update — only supplied fields are changed
 *      — handles Redis.del() failure gracefully (non-fatal)
 *
 * Total: 12 tests across 2 describes
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockSettingsFindFirst = jest.fn();
const mockSettingsUpdate    = jest.fn();
const mockSettingsCreate    = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    studioSettings: {
      findFirst: (...a: unknown[]) => mockSettingsFindFirst(...a),
      update:    (...a: unknown[]) => mockSettingsUpdate(...a),
      create:    (...a: unknown[]) => mockSettingsCreate(...a),
    },
  },
}));

// ─── Redis mock ───────────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

jest.mock('../../lib/redis', () => ({
  getRedis: () => ({
    get: (...a: unknown[]) => mockRedisGet(...a),
    set: (...a: unknown[]) => mockRedisSet(...a),
    del: (...a: unknown[]) => mockRedisDel(...a),
  }),
}));

// ─── Logger mock (suppress console output in tests) ──────────────────────────

jest.mock('../../utils/logger', () => ({
  logger: {
    warn:  jest.fn(),
    error: jest.fn(),
    info:  jest.fn(),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { getCachedSettings, updateSettings } from './settings.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const publicSettingsFixture = {
  id:                     'settings_1',
  studioName:             'Test Studio',
  studioEmail:            'test@studio.com',
  studioPhone:            '+44 7700 900000',
  studioAddress:          '1 Test Street, London',
  studioTimezone:         'Europe/London',
  currency:               'GBP',
  cancellationPolicyText: 'No refunds within 24h.',
  googleReviewUrl:        'https://g.page/test',
  bookingPageUrl:         'https://book.test.com',
  updatedAt:              new Date('2026-01-01T00:00:00.000Z'),
};

const fullSettingsFixture = {
  ...publicSettingsFixture,
  depositPercentage:   20,
  depositFixedAmount:  null,
  cancellationHours:   24,
  cancellationFeePercent: 25,
  maxCoversPerSlot:    null,
  slotIntervalMinutes: 15,
};

// ─────────────────────────────────────────────────────────────────────────────
// getCachedSettings
// ─────────────────────────────────────────────────────────────────────────────

describe('getCachedSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached JSON when Redis has the key — no DB call', async () => {
    mockRedisGet.mockResolvedValue(JSON.stringify(publicSettingsFixture));

    const result = await getCachedSettings();

    expect(result).toMatchObject({ studioName: 'Test Studio' });
    expect(mockSettingsFindFirst).not.toHaveBeenCalled();
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('fetches from DB, writes to cache, and returns data on cache miss', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockSettingsFindFirst.mockResolvedValue(publicSettingsFixture);
    mockRedisSet.mockResolvedValue('OK');

    const result = await getCachedSettings();

    expect(result).toMatchObject({ studioName: 'Test Studio' });
    expect(mockSettingsFindFirst).toHaveBeenCalledTimes(1);
    expect(mockRedisSet).toHaveBeenCalledWith(
      'settings:public',
      expect.any(String),
      'EX',
      300,
    );
  });

  it('returns null when settings row does not exist (DB returns null)', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockSettingsFindFirst.mockResolvedValue(null);

    const result = await getCachedSettings();

    expect(result).toBeNull();
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('falls through to DB when Redis.get() throws (non-fatal)', async () => {
    mockRedisGet.mockRejectedValue(new Error('Redis connection refused'));
    mockSettingsFindFirst.mockResolvedValue(publicSettingsFixture);
    mockRedisSet.mockResolvedValue('OK');

    const result = await getCachedSettings();

    expect(result).toMatchObject({ studioName: 'Test Studio' });
    expect(mockSettingsFindFirst).toHaveBeenCalledTimes(1);
  });

  it('returns data even when Redis.set() throws after DB fetch (non-fatal)', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockSettingsFindFirst.mockResolvedValue(publicSettingsFixture);
    mockRedisSet.mockRejectedValue(new Error('Redis write error'));

    const result = await getCachedSettings();

    expect(result).toMatchObject({ studioName: 'Test Studio' });
  });

  it('does NOT attempt to cache a null result', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockSettingsFindFirst.mockResolvedValue(null);

    await getCachedSettings();

    expect(mockRedisSet).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateSettings
// ─────────────────────────────────────────────────────────────────────────────

describe('updateSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the existing row and returns the full settings object', async () => {
    mockSettingsFindFirst.mockResolvedValue({ id: 'settings_1' });
    mockSettingsUpdate.mockResolvedValue(fullSettingsFixture);
    mockRedisDel.mockResolvedValue(1);

    const result = await updateSettings({ studioName: 'Updated Studio' });

    expect(result).toMatchObject({ studioName: 'Test Studio' }); // fixture value
    expect(mockSettingsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'settings_1' },
        data:  { studioName: 'Updated Studio' },
      }),
    );
  });

  it('invalidates the Redis cache after a successful update', async () => {
    mockSettingsFindFirst.mockResolvedValue({ id: 'settings_1' });
    mockSettingsUpdate.mockResolvedValue(fullSettingsFixture);
    mockRedisDel.mockResolvedValue(1);

    await updateSettings({ studioName: 'New Name' });

    expect(mockRedisDel).toHaveBeenCalledWith('settings:public');
  });

  it('creates a new row when none exists (studioName provided)', async () => {
    mockSettingsFindFirst.mockResolvedValue(null);
    mockSettingsCreate.mockResolvedValue(fullSettingsFixture);
    mockRedisDel.mockResolvedValue(0);

    const result = await updateSettings({
      studioName:     'Brand New Studio',
      studioTimezone: 'Europe/Paris',
    });

    expect(result).toBeDefined();
    expect(mockSettingsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ studioName: 'Brand New Studio' }),
      }),
    );
  });

  it('throws AppError 400 when no settings row exists and studioName is missing', async () => {
    mockSettingsFindFirst.mockResolvedValue(null);

    await expect(
      updateSettings({ currency: 'EUR' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });

    expect(mockSettingsCreate).not.toHaveBeenCalled();
  });

  it('partial update — only supplied fields are changed', async () => {
    mockSettingsFindFirst.mockResolvedValue({ id: 'settings_1' });
    mockSettingsUpdate.mockResolvedValue(fullSettingsFixture);
    mockRedisDel.mockResolvedValue(1);

    await updateSettings({ currency: 'USD' });

    expect(mockSettingsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { currency: 'USD' },
      }),
    );
  });

  it('handles Redis.del() failure gracefully after successful DB update', async () => {
    mockSettingsFindFirst.mockResolvedValue({ id: 'settings_1' });
    mockSettingsUpdate.mockResolvedValue(fullSettingsFixture);
    mockRedisDel.mockRejectedValue(new Error('Redis unavailable'));

    // Should resolve without throwing even though cache invalidation failed
    await expect(
      updateSettings({ studioName: 'Resilient Studio' }),
    ).resolves.toBeDefined();
  });
});
