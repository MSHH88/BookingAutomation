/**
 * Customer LTV / Stats service — unit tests — Phase 3.4
 *
 * Tests:
 *  1. getCustomerStats — returns cached stats from Redis
 *  2. getCustomerStats — computes stats from DB on cache miss
 *  3. getCustomerStats — stores computed stats in Redis cache
 *  4. getCustomerStats — throws 404 for unknown customer
 *  5. getCustomerStats — throws 403 for wrong tenant
 *  6. getCustomerStats — returns zeros when no completed bookings
 *  7. getCustomerStats — computes correct mostBookedService
 *  8. getCustomerStats — computes correct mostBookedArtist
 *  9. getCustomerStats — falls through to DB when Redis GET fails
 * 10. getCustomerStats — continues when Redis SET fails
 * 11. listCustomersWithStats — returns paginated customers with stats
 * 12. listCustomersWithStats — filters by minSpend
 * 13. listCustomersWithStats — sorts by ltv
 * 14. listCustomersWithStats — returns empty when no customers
 *
 * Total: 14 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

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

// ─── Prisma mock ──────────────────────────────────────────────────────────────

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
    },
    artist: {
      findUnique: jest.fn(),
    },
  },
}));

// ─── Logger mock ──────────────────────────────────────────────────────────────

jest.mock('../../utils/logger', () => ({
  logger: {
    warn:  jest.fn(),
    error: jest.fn(),
    info:  jest.fn(),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import { getCustomerStats, listCustomersWithStats } from './customer-stats.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT = 'tenant-1';

const completedBookings = [
  { id: 'b-1', completedAt: new Date('2025-06-01'), serviceId: 'svc-1', artistId: 'art-1' },
  { id: 'b-2', completedAt: new Date('2025-05-01'), serviceId: 'svc-1', artistId: 'art-2' },
  { id: 'b-3', completedAt: new Date('2025-04-01'), serviceId: 'svc-2', artistId: 'art-1' },
];

const cachedStats = {
  totalSpend:        300,
  visitCount:        3,
  lastVisitDate:     '2025-06-01T00:00:00.000Z',
  firstVisitDate:    '2025-04-01T00:00:00.000Z',
  averageSpend:      100,
  mostBookedService: 'Tattoo',
  mostBookedArtist:  'Jane Doe',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('customer-stats.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getCustomerStats ─────────────────────────────────────────────────────

  describe('getCustomerStats', () => {
    it('should return cached stats from Redis', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'cust-1', tenantId: TENANT });
      mockRedisGet.mockResolvedValue(JSON.stringify(cachedStats));

      const result = await getCustomerStats('cust-1', TENANT);

      expect(result).toEqual(cachedStats);
      expect(prisma.booking.findMany).not.toHaveBeenCalled();
    });

    it('should compute stats from DB on cache miss', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'cust-1', tenantId: TENANT });
      mockRedisGet.mockResolvedValue(null);

      // Completed bookings
      (prisma.booking.findMany as jest.Mock)
        .mockResolvedValueOnce(completedBookings)  // completed bookings
        .mockResolvedValueOnce(completedBookings.map(b => ({ id: b.id }))); // all booking ids

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([
        { amount: 100 },
        { amount: 150 },
      ]);

      (prisma.service.findUnique as jest.Mock).mockResolvedValue({ name: 'Tattoo' });
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue({ user: { name: 'Jane Doe' } });

      const result = await getCustomerStats('cust-1', TENANT);

      expect(result.totalSpend).toBe(250);
      expect(result.visitCount).toBe(3);
      expect(result.averageSpend).toBe(83.33);
      expect(result.mostBookedService).toBe('Tattoo');
      expect(result.mostBookedArtist).toBe('Jane Doe');
      expect(result.lastVisitDate).toBe('2025-06-01T00:00:00.000Z');
      expect(result.firstVisitDate).toBe('2025-04-01T00:00:00.000Z');
    });

    it('should store computed stats in Redis cache', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'cust-1', tenantId: TENANT });
      mockRedisGet.mockResolvedValue(null);

      (prisma.booking.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      await getCustomerStats('cust-1', TENANT);

      expect(mockRedisSet).toHaveBeenCalledWith(
        `customer_stats:${TENANT}:cust-1`,
        expect.any(String),
        'EX',
        3600,
      );
    });

    it('should throw 404 for unknown customer', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getCustomerStats('bad-id', TENANT)).rejects.toMatchObject({
        statusCode: 404,
        code: 'CUSTOMER_NOT_FOUND',
      });
    });

    it('should throw 403 for wrong tenant', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        tenantId: 'other-tenant',
      });

      await expect(getCustomerStats('cust-1', TENANT)).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('should return zeros when no completed bookings', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'cust-1', tenantId: TENANT });
      mockRedisGet.mockResolvedValue(null);

      (prisma.booking.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getCustomerStats('cust-1', TENANT);

      expect(result.totalSpend).toBe(0);
      expect(result.visitCount).toBe(0);
      expect(result.averageSpend).toBe(0);
      expect(result.lastVisitDate).toBeNull();
      expect(result.firstVisitDate).toBeNull();
      expect(result.mostBookedService).toBeNull();
      expect(result.mostBookedArtist).toBeNull();
    });

    it('should compute correct mostBookedService', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'cust-1', tenantId: TENANT });
      mockRedisGet.mockResolvedValue(null);

      // svc-1 appears twice, svc-2 once → svc-1 wins
      (prisma.booking.findMany as jest.Mock)
        .mockResolvedValueOnce(completedBookings)
        .mockResolvedValueOnce(completedBookings.map(b => ({ id: b.id })));
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue({ name: 'Full Sleeve' });
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue({ user: { name: 'Artist' } });

      const result = await getCustomerStats('cust-1', TENANT);

      expect(result.mostBookedService).toBe('Full Sleeve');
      expect(prisma.service.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'svc-1' } }),
      );
    });

    it('should compute correct mostBookedArtist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'cust-1', tenantId: TENANT });
      mockRedisGet.mockResolvedValue(null);

      // art-1 appears twice, art-2 once → art-1 wins
      (prisma.booking.findMany as jest.Mock)
        .mockResolvedValueOnce(completedBookings)
        .mockResolvedValueOnce(completedBookings.map(b => ({ id: b.id })));
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue({ name: 'Tattoo' });
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue({ user: { name: 'Top Artist' } });

      const result = await getCustomerStats('cust-1', TENANT);

      expect(result.mostBookedArtist).toBe('Top Artist');
      expect(prisma.artist.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'art-1' } }),
      );
    });

    it('should fall through to DB when Redis GET fails', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'cust-1', tenantId: TENANT });
      mockRedisGet.mockRejectedValue(new Error('Redis down'));

      (prisma.booking.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getCustomerStats('cust-1', TENANT);

      expect(result.visitCount).toBe(0);
      expect(prisma.booking.findMany).toHaveBeenCalled();
    });

    it('should continue when Redis SET fails', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'cust-1', tenantId: TENANT });
      mockRedisGet.mockResolvedValue(null);
      mockRedisSet.mockRejectedValue(new Error('Redis down'));

      (prisma.booking.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getCustomerStats('cust-1', TENANT);

      expect(result.visitCount).toBe(0);
    });
  });

  // ── listCustomersWithStats ───────────────────────────────────────────────

  describe('listCustomersWithStats', () => {
    it('should return paginated customers with stats', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'c-1', name: 'Alice', email: 'alice@test.com', createdAt: new Date('2025-01-01') },
      ]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      (prisma.booking.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await listCustomersWithStats(TENANT, {
        page: 1, limit: 20, sortBy: 'name',
      });

      expect(result.total).toBe(1);
      expect(result.customers).toHaveLength(1);
      expect(result.customers[0]!.name).toBe('Alice');
      expect(result.customers[0]!.stats.visitCount).toBe(0);
    });

    it('should filter by minSpend', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'c-1', name: 'Alice', email: 'alice@test.com', createdAt: new Date() },
        { id: 'c-2', name: 'Bob', email: 'bob@test.com', createdAt: new Date() },
      ]);
      (prisma.user.count as jest.Mock).mockResolvedValue(2);

      // Alice: 1 completed booking with $200 paid invoice
      (prisma.booking.findMany as jest.Mock)
        .mockResolvedValueOnce([{ id: 'b-1', completedAt: new Date(), serviceId: null, artistId: null }])
        .mockResolvedValueOnce([{ id: 'b-1' }])
        // Bob: no bookings
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      (prisma.invoice.findMany as jest.Mock)
        .mockResolvedValueOnce([{ amount: 200 }])  // Alice
        .mockResolvedValueOnce([]);                 // Bob

      const result = await listCustomersWithStats(TENANT, {
        page: 1, limit: 20, sortBy: 'name', minSpend: 100,
      });

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0]!.name).toBe('Alice');
    });

    it('should sort by ltv', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'c-1', name: 'Alice', email: 'alice@test.com', createdAt: new Date() },
        { id: 'c-2', name: 'Bob', email: 'bob@test.com', createdAt: new Date() },
      ]);
      (prisma.user.count as jest.Mock).mockResolvedValue(2);

      // Alice: $100
      (prisma.booking.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'ba-1' }])
        // Bob: $500
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'bb-1' }]);

      (prisma.invoice.findMany as jest.Mock)
        .mockResolvedValueOnce([{ amount: 100 }])
        .mockResolvedValueOnce([{ amount: 500 }]);

      const result = await listCustomersWithStats(TENANT, {
        page: 1, limit: 20, sortBy: 'ltv',
      });

      expect(result.customers[0]!.name).toBe('Bob');
      expect(result.customers[1]!.name).toBe('Alice');
    });

    it('should return empty when no customers', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      const result = await listCustomersWithStats(TENANT, {
        page: 1, limit: 20, sortBy: 'name',
      });

      expect(result.customers).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
