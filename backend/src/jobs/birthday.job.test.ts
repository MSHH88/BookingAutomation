/**
 * Unit tests for birthday.job.ts — Phase 1 (Messaging Foundation)
 *
 * All external dependencies are mocked:
 *   - ../lib/prisma              — database calls
 *   - ../lib/notification-dispatcher — notification dispatch
 *   - ../utils/logger            — silenced in tests
 *
 * Coverage:
 *  ✓ findBirthdayCustomers
 *      — returns customers matching today's month/day
 *      — excludes inactive customers
 *      — excludes unsubscribed customers
 *      — excludes non-CUSTOMER roles
 *      — returns empty array when no matches
 *      — handles null dateOfBirth
 *      — handles leap year dates (Feb 29)
 *      — filters by month AND day correctly
 *
 * Total: 8 tests across 1 describe
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockFindMany = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
    },
  },
}));

// ─── Notification dispatcher mock ────────────────────────────────────────────

jest.mock('../lib/notification-dispatcher', () => ({
  dispatchNotification: jest.fn().mockResolvedValue(undefined),
}));

// ─── Logger mock ─────────────────────────────────────────────────────────────

jest.mock('../utils/logger', () => ({
  logger: {
    warn:  jest.fn(),
    error: jest.fn(),
    info:  jest.fn(),
    debug: jest.fn(),
  },
}));

// ─── BullMQ / ioredis mocks ─────────────────────────────────────────────────

jest.mock('bullmq', () => ({
  Queue:  jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    close: jest.fn(),
    getRepeatableJobs: jest.fn().mockResolvedValue([]),
    removeRepeatableByKey: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ on: jest.fn() })));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { findBirthdayCustomers } from './birthday.job';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const makeCustomer = (overrides: Record<string, unknown> = {}) => ({
  id:                  'u_1',
  name:                'Jane Doe',
  phone:               '+61400000000',
  email:               'jane@test.com',
  tenantId:            'tenant_1',
  dateOfBirth:         new Date('1990-03-15T00:00:00.000Z'),
  notificationChannel: 'SMS',
  role:                'CUSTOMER',
  isActive:            true,
  unsubscribed:        false,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// findBirthdayCustomers
// ─────────────────────────────────────────────────────────────────────────────

describe('findBirthdayCustomers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns customers matching today\'s month/day', async () => {
    const customer = makeCustomer({ dateOfBirth: new Date('1990-03-15T00:00:00.000Z') });
    mockFindMany.mockResolvedValue([customer]);

    const result = await findBirthdayCustomers(3, 15);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'u_1', name: 'Jane Doe' });
  });

  it('excludes inactive customers (query-level filter)', async () => {
    // The Prisma where clause includes isActive: true, so inactive
    // customers are never returned from the DB.
    mockFindMany.mockResolvedValue([]);

    const result = await findBirthdayCustomers(3, 15);

    expect(result).toEqual([]);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
  });

  it('excludes unsubscribed customers (query-level filter)', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await findBirthdayCustomers(3, 15);

    expect(result).toEqual([]);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ unsubscribed: false }),
      }),
    );
  });

  it('excludes non-CUSTOMER roles (query-level filter)', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await findBirthdayCustomers(3, 15);

    expect(result).toEqual([]);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'CUSTOMER' }),
      }),
    );
  });

  it('returns empty array when no matches', async () => {
    const customer = makeCustomer({ dateOfBirth: new Date('1990-06-20T00:00:00.000Z') });
    mockFindMany.mockResolvedValue([customer]);

    const result = await findBirthdayCustomers(3, 15);

    expect(result).toEqual([]);
  });

  it('handles null dateOfBirth', async () => {
    const customer = makeCustomer({ dateOfBirth: null });
    mockFindMany.mockResolvedValue([customer]);

    const result = await findBirthdayCustomers(3, 15);

    expect(result).toEqual([]);
  });

  it('handles leap year dates (Feb 29)', async () => {
    const customer = makeCustomer({ dateOfBirth: new Date('2000-02-29T00:00:00.000Z') });
    mockFindMany.mockResolvedValue([customer]);

    const result = await findBirthdayCustomers(2, 29);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'u_1' });
  });

  it('filters by month AND day correctly — wrong month excluded', async () => {
    const customer = makeCustomer({ dateOfBirth: new Date('1990-04-15T00:00:00.000Z') });
    mockFindMany.mockResolvedValue([customer]);

    // Same day (15) but different month (3 ≠ 4)
    const result = await findBirthdayCustomers(3, 15);

    expect(result).toEqual([]);
  });
});
