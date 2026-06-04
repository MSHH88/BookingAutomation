/**
 * Loyalty service — unit tests — Phase 5.3
 *
 * Tests:
 *  1.  getLoyaltyAccount — returns existing account
 *  2.  getLoyaltyAccount — creates account when not found
 *  3.  awardPoints — updates existing account with new total
 *  4.  awardPoints — creates account + transaction when first award
 *  5.  awardPoints — upgrades tier when threshold crossed
 *  6.  redeemPoints — deducts points and returns discount amount
 *  7.  redeemPoints — throws 400 for insufficient points
 *  8.  redeemPoints — throws 404 when no loyalty account
 *  9.  calculatePointsForBooking — returns default flat rate
 *
 * Total: 9 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    loyaltyAccount: {
      findFirst: jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    loyaltyTransaction: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '../../lib/prisma';
import {
  getLoyaltyAccount,
  awardPoints,
  redeemPoints,
  calculatePointsForBooking,
} from './loyalty.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id:           'la-1',
    customerId:   'user-1',
    tenantId:     'tenant-1',
    points:       100,
    tier:         'BRONZE',
    totalEarned:  100,
    createdAt:    new Date('2024-01-01'),
    updatedAt:    new Date('2024-01-01'),
    transactions: [],
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('loyalty.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getLoyaltyAccount ──────────────────────────────────────────────────────

  describe('getLoyaltyAccount', () => {
    it('returns existing account', async () => {
      (prisma.loyaltyAccount.findFirst as jest.Mock).mockResolvedValue(makeAccount());

      const result = await getLoyaltyAccount('user-1', 'tenant-1');
      expect(result.id).toBe('la-1');
      expect(prisma.loyaltyAccount.create).not.toHaveBeenCalled();
    });

    it('creates account when not found', async () => {
      (prisma.loyaltyAccount.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.loyaltyAccount.create as jest.Mock).mockResolvedValue(
        makeAccount({ points: 0, totalEarned: 0 }),
      );

      const result = await getLoyaltyAccount('user-1', 'tenant-1');
      expect(prisma.loyaltyAccount.create).toHaveBeenCalledTimes(1);
      expect(result.points).toBe(0);
    });
  });

  // ── awardPoints ────────────────────────────────────────────────────────────

  describe('awardPoints', () => {
    it('updates existing account with new totals', async () => {
      (prisma.loyaltyAccount.findFirst as jest.Mock).mockResolvedValue(
        makeAccount({ id: 'la-1', points: 100, totalEarned: 100 }),
      );

      const updatedAccount = makeAccount({ points: 110, totalEarned: 110 });
      (prisma.$transaction as jest.Mock).mockResolvedValue([updatedAccount, {}]);

      const result = await awardPoints({
        customerId: 'user-1',
        tenantId:   'tenant-1',
        points:     10,
        reason:     'Booking completed',
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.points).toBe(110);
    });

    it('creates account when none exists', async () => {
      (prisma.loyaltyAccount.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.loyaltyAccount.create as jest.Mock).mockResolvedValue(
        makeAccount({ points: 10, totalEarned: 10 }),
      );

      const result = await awardPoints({
        customerId: 'user-1',
        tenantId:   'tenant-1',
        points:     10,
        reason:     'Booking completed',
      });

      expect(prisma.loyaltyAccount.create).toHaveBeenCalledTimes(1);
      expect(result.points).toBe(10);
    });

    it('tier upgrades when threshold is crossed', async () => {
      (prisma.loyaltyAccount.findFirst as jest.Mock).mockResolvedValue(
        makeAccount({ id: 'la-1', points: 490, totalEarned: 490, tier: 'BRONZE' }),
      );

      const updatedAccount = makeAccount({ points: 500, totalEarned: 500, tier: 'SILVER' });
      (prisma.$transaction as jest.Mock).mockResolvedValue([updatedAccount, {}]);

      const result = await awardPoints({
        customerId: 'user-1',
        tenantId:   'tenant-1',
        points:     10,
        reason:     'Booking completed',
      });

      expect(result.tier).toBe('SILVER');
    });
  });

  // ── redeemPoints ───────────────────────────────────────────────────────────

  describe('redeemPoints', () => {
    it('deducts points and returns discount amount', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' });
      (prisma.loyaltyAccount.findFirst as jest.Mock).mockResolvedValue(
        makeAccount({ id: 'la-1', points: 200 }),
      );
      (prisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

      const result = await redeemPoints('user-1', 'tenant-1', {
        customerId:  'user-1',
        pointsToUse: 100,
      });

      expect(result.discountAmount).toBe(1);   // 100 pts = £1
      expect(result.remainingPoints).toBe(100);
    });

    it('throws 400 for insufficient points', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' });
      (prisma.loyaltyAccount.findFirst as jest.Mock).mockResolvedValue(
        makeAccount({ points: 50 }),
      );

      await expect(
        redeemPoints('user-1', 'tenant-1', { customerId: 'user-1', pointsToUse: 100 }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'INSUFFICIENT_POINTS' });
    });

    it('throws 404 when no loyalty account exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' });
      (prisma.loyaltyAccount.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        redeemPoints('user-1', 'tenant-1', { customerId: 'user-1', pointsToUse: 10 }),
      ).rejects.toMatchObject({ statusCode: 404, code: 'LOYALTY_ACCOUNT_NOT_FOUND' });
    });
  });

  // ── calculatePointsForBooking ──────────────────────────────────────────────

  describe('calculatePointsForBooking', () => {
    it('returns the default flat rate of 10 points', () => {
      expect(calculatePointsForBooking(100)).toBe(10);
      expect(calculatePointsForBooking(0)).toBe(10);
    });
  });
});
