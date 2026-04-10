/**
 * Gift Cards service — unit tests — Phase 4.2
 *
 * Tests:
 *  1.  createGiftCard — creates card with correct code format
 *  2.  createGiftCard — sets currentBalance = originalValue
 *  3.  listGiftCards — returns paginated results
 *  4.  listGiftCards — returns empty when no cards
 *  5.  getGiftCardByCode — returns card info for valid code
 *  6.  getGiftCardByCode — throws 404 for unknown code
 *  7.  getGiftCardByCode — throws 403 when wrong tenant
 *  8.  getGiftCardByCode — throws 403 when card has null tenantId
 *  9.  getGiftCardByCode — throws 410 when card is expired
 * 10.  redeemGiftCard — deducts amount and returns new balance
 * 11.  redeemGiftCard — marks card fully redeemed when balance reaches zero
 * 12.  redeemGiftCard — throws 404 for unknown code
 * 13.  redeemGiftCard — throws 403 for wrong tenant
 * 14.  redeemGiftCard — throws 409 when already fully redeemed
 * 15.  redeemGiftCard — throws 410 when expired
 * 16.  redeemGiftCard — throws 400 when amount exceeds balance
 *
 * Total: 16 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    giftCard: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';
import {
  createGiftCard,
  listGiftCards,
  getGiftCardByCode,
  redeemGiftCard,
} from './gift-cards.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    id:             'gc-1',
    tenantId:       'tenant-1',
    code:           'ABCDEF123456',
    originalValue:  50,
    currentBalance: 50,
    issuedTo:       'user@example.com',
    purchasedById:  null,
    expiresAt:      null,
    isRedeemed:     false,
    createdAt:      new Date('2024-01-01'),
    updatedAt:      new Date('2024-01-01'),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('gift-cards.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createGiftCard ────────────────────────────────────────────────────────

  describe('createGiftCard', () => {
    it('creates card with a 12-character uppercase code', async () => {
      (prisma.giftCard.create as jest.Mock).mockResolvedValue(makeCard());

      const result = await createGiftCard('tenant-1', {
        originalValue: 50,
        issuedTo:      'user@example.com',
      });

      expect(prisma.giftCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId:       'tenant-1',
            originalValue:  50,
            currentBalance: 50,
            issuedTo:       'user@example.com',
            code:           expect.stringMatching(/^[A-F0-9]{12}$/),
          }),
        }),
      );
      expect(result.id).toBe('gc-1');
    });

    it('sets currentBalance equal to originalValue', async () => {
      (prisma.giftCard.create as jest.Mock).mockResolvedValue(makeCard({ originalValue: 100, currentBalance: 100 }));

      await createGiftCard('tenant-1', { originalValue: 100 });

      expect(prisma.giftCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            originalValue:  100,
            currentBalance: 100,
          }),
        }),
      );
    });
  });

  // ── listGiftCards ─────────────────────────────────────────────────────────

  describe('listGiftCards', () => {
    it('returns paginated results', async () => {
      (prisma.giftCard.findMany as jest.Mock).mockResolvedValue([makeCard()]);
      (prisma.giftCard.count as jest.Mock).mockResolvedValue(1);

      const result = await listGiftCards('tenant-1', { page: 1, limit: 20 });

      expect(result.giftCards).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(prisma.giftCard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' }, skip: 0, take: 20 }),
      );
    });

    it('returns empty when no cards', async () => {
      (prisma.giftCard.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.giftCard.count as jest.Mock).mockResolvedValue(0);

      const result = await listGiftCards('tenant-1', { page: 1, limit: 20 });

      expect(result.giftCards).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ── getGiftCardByCode ─────────────────────────────────────────────────────

  describe('getGiftCardByCode', () => {
    it('returns card info for valid code', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(makeCard());

      const result = await getGiftCardByCode('ABCDEF123456');

      expect(result.code).toBe('ABCDEF123456');
      expect(Number(result.currentBalance)).toBe(50);
    });

    it('throws 404 for unknown code', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getGiftCardByCode('BADCODE')).rejects.toMatchObject({
        statusCode: 404,
        code: 'GIFT_CARD_NOT_FOUND',
      });
    });

    it('throws 403 when wrong tenant provided', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(makeCard({ tenantId: 'tenant-other' }));

      await expect(getGiftCardByCode('ABCDEF123456', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('throws 403 when card has null tenantId and tenantId provided', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(makeCard({ tenantId: null }));

      await expect(getGiftCardByCode('ABCDEF123456', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('throws 410 when card is expired', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(
        makeCard({ expiresAt: new Date('2020-01-01') }),
      );

      await expect(getGiftCardByCode('ABCDEF123456')).rejects.toMatchObject({
        statusCode: 410,
        code: 'GIFT_CARD_EXPIRED',
      });
    });
  });

  // ── redeemGiftCard ────────────────────────────────────────────────────────

  describe('redeemGiftCard', () => {
    it('deducts amount and returns new balance', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(makeCard({ currentBalance: 50 }));
      (prisma.giftCard.update as jest.Mock).mockResolvedValue(
        makeCard({ currentBalance: 30, isRedeemed: false }),
      );

      const result = await redeemGiftCard('ABCDEF123456', 'tenant-1', 20);

      expect(result.amountRedeemed).toBe(20);
      expect(result.newBalance).toBe(30);
      expect(result.isRedeemed).toBe(false);
      expect(prisma.giftCard.update).toHaveBeenCalledWith({
        where: { code: 'ABCDEF123456' },
        data:  { currentBalance: 30, isRedeemed: false },
      });
    });

    it('marks card fully redeemed when balance reaches zero', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(makeCard({ currentBalance: 20 }));
      (prisma.giftCard.update as jest.Mock).mockResolvedValue(
        makeCard({ currentBalance: 0, isRedeemed: true }),
      );

      const result = await redeemGiftCard('ABCDEF123456', 'tenant-1', 20);

      expect(result.isRedeemed).toBe(true);
      expect(prisma.giftCard.update).toHaveBeenCalledWith({
        where: { code: 'ABCDEF123456' },
        data:  { currentBalance: 0, isRedeemed: true },
      });
    });

    it('throws 404 for unknown code', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(redeemGiftCard('BADCODE', 'tenant-1', 10)).rejects.toMatchObject({
        statusCode: 404,
        code: 'GIFT_CARD_NOT_FOUND',
      });
    });

    it('throws 403 for wrong tenant', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(makeCard({ tenantId: 'tenant-other' }));

      await expect(redeemGiftCard('ABCDEF123456', 'tenant-1', 10)).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('throws 409 when card already fully redeemed', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(makeCard({ isRedeemed: true }));

      await expect(redeemGiftCard('ABCDEF123456', 'tenant-1', 10)).rejects.toMatchObject({
        statusCode: 409,
        code: 'GIFT_CARD_FULLY_REDEEMED',
      });
    });

    it('throws 410 when card is expired', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(
        makeCard({ expiresAt: new Date('2020-01-01') }),
      );

      await expect(redeemGiftCard('ABCDEF123456', 'tenant-1', 10)).rejects.toMatchObject({
        statusCode: 410,
        code: 'GIFT_CARD_EXPIRED',
      });
    });

    it('throws 400 when redemption amount exceeds balance', async () => {
      (prisma.giftCard.findUnique as jest.Mock).mockResolvedValue(makeCard({ currentBalance: 10 }));

      await expect(redeemGiftCard('ABCDEF123456', 'tenant-1', 50)).rejects.toMatchObject({
        statusCode: 400,
        code: 'INSUFFICIENT_BALANCE',
      });
    });
  });
});
