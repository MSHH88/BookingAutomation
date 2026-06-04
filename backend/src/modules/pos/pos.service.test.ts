/**
 * POS service — unit tests — Phase 4.4
 *
 * Tests:
 *  1.  checkout — creates booking and payment for cash transaction
 *  2.  checkout — includes tip in payment record
 *  3.  checkout — applies gift card and updates balance
 *  4.  checkout — throws 404 when artist not found
 *  5.  checkout — throws 404 when gift card not found
 *  6.  checkout — throws 409 when gift card already redeemed
 *  7.  checkout — throws 410 when gift card expired
 *  8.  checkout — throws 400 when gift card balance insufficient
 *  9.  checkout — deducts product stock on sale
 * 10.  checkout — throws 400 when product stock insufficient
 * 11.  listTransactions — returns paginated POS transactions
 * 12.  getDailySummary — returns daily revenue totals
 * 13.  getDailySummary — returns zero totals for day with no transactions
 *
 * Total: 13 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockGiftCardFindUnique  = jest.fn();
const mockGiftCardUpdate      = jest.fn();
const mockArtistFindUnique    = jest.fn();
const mockBookingCreate       = jest.fn();
const mockProductFindUnique   = jest.fn();
const mockProductUpdate       = jest.fn();
const mockStockMovCreate      = jest.fn();
const mockPaymentCreate       = jest.fn();
const mockPaymentFindMany     = jest.fn();
const mockPaymentCount        = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    giftCard: {
      findUnique: (...a: unknown[]) => mockGiftCardFindUnique(...a),
      update:     (...a: unknown[]) => mockGiftCardUpdate(...a),
    },
    artist: {
      findUnique: (...a: unknown[]) => mockArtistFindUnique(...a),
    },
    booking: {
      create: (...a: unknown[]) => mockBookingCreate(...a),
    },
    product: {
      findUnique: (...a: unknown[]) => mockProductFindUnique(...a),
      update:     (...a: unknown[]) => mockProductUpdate(...a),
    },
    stockMovement: {
      create: (...a: unknown[]) => mockStockMovCreate(...a),
    },
    payment: {
      create:   (...a: unknown[]) => mockPaymentCreate(...a),
      findMany: (...a: unknown[]) => mockPaymentFindMany(...a),
      count:    (...a: unknown[]) => mockPaymentCount(...a),
    },
  },
}));

import { checkout, listTransactions, getDailySummary } from './pos.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeBooking(id = 'book-1') {
  return {
    id,
    tenantId:    'tenant-1',
    artistId:    'artist-1',
    status:      'COMPLETED',
    source:      'POS',
    totalAmount: 45,
    createdAt:   new Date('2024-06-01T10:00:00Z'),
  };
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id:        'pay-1',
    tenantId:  'tenant-1',
    bookingId: 'book-1',
    amount:    45,
    tipAmount: null,
    currency:  'GBP',
    status:    'SUCCEEDED',
    method:    'CARD',
    paidAt:    new Date('2024-06-01T10:00:00Z'),
    createdAt: new Date('2024-06-01T10:00:00Z'),
    ...overrides,
  };
}

function makeGiftCard(overrides: Record<string, unknown> = {}) {
  return {
    id:             'gc-1',
    tenantId:       'tenant-1',
    code:           'GCTEST123456',
    originalValue:  100,
    currentBalance: 100,
    isRedeemed:     false,
    expiresAt:      null,
    ...overrides,
  };
}

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id:                'prod-1',
    tenantId:          'tenant-1',
    name:              'Blue Ink',
    stockLevel:        20,
    lowStockThreshold: 5,
    ...overrides,
  };
}

const BASE_CHECKOUT: Parameters<typeof checkout>[2] = {
  artistId:      'artist-1',
  customerName:  'Walk-in Customer',
  amount:        45,
  method:        'CARD',
  currency:      'GBP',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('pos.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockArtistFindUnique.mockResolvedValue({ id: 'artist-1', tenantId: 'tenant-1' });
    mockBookingCreate.mockResolvedValue(makeBooking());
    mockPaymentCreate.mockResolvedValue(makePayment());
  });

  // ── checkout ──────────────────────────────────────────────────────────────

  describe('checkout', () => {
    it('creates booking and payment for a standard card transaction', async () => {
      const result = await checkout('tenant-1', 'op-1', BASE_CHECKOUT);

      expect(result.booking.id).toBe('book-1');
      expect(result.payment.id).toBe('pay-1');
      expect(mockBookingCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            artistId: 'artist-1',
            status:   'COMPLETED',
            source:   'POS',
          }),
        }),
      );
      expect(mockPaymentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 45,
            status: 'SUCCEEDED',
            method: 'CARD',
          }),
        }),
      );
    });

    it('includes tip in the payment record', async () => {
      mockPaymentCreate.mockResolvedValue(makePayment({ tipAmount: 5 }));

      const result = await checkout('tenant-1', 'op-1', { ...BASE_CHECKOUT, tipAmount: 5 });

      expect(mockPaymentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tipAmount: 5 }),
        }),
      );
      expect(result.payment.tipAmount).toBe(5);
    });

    it('applies gift card, deducts balance, and sets method to GIFT_CARD', async () => {
      mockGiftCardFindUnique.mockResolvedValue(makeGiftCard({ currentBalance: 100 }));
      mockGiftCardUpdate.mockResolvedValue({});

      await checkout('tenant-1', 'op-1', {
        ...BASE_CHECKOUT,
        giftCardCode: 'GCTEST123456',
        method:       'CARD',
      });

      expect(mockGiftCardUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: 'GCTEST123456' },
          data:  expect.objectContaining({ currentBalance: 55, isRedeemed: false }),
        }),
      );
      expect(mockPaymentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ method: 'GIFT_CARD' }),
        }),
      );
    });

    it('throws 404 when artist not found', async () => {
      mockArtistFindUnique.mockResolvedValue(null);

      await expect(checkout('tenant-1', 'op-1', BASE_CHECKOUT)).rejects.toMatchObject({
        statusCode: 404,
        code: 'ARTIST_NOT_FOUND',
      });
    });

    it('throws 404 when gift card not found', async () => {
      mockGiftCardFindUnique.mockResolvedValue(null);

      await expect(
        checkout('tenant-1', 'op-1', { ...BASE_CHECKOUT, giftCardCode: 'BAD' }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'GIFT_CARD_NOT_FOUND',
      });
    });

    it('throws 409 when gift card already fully redeemed', async () => {
      mockGiftCardFindUnique.mockResolvedValue(makeGiftCard({ isRedeemed: true }));

      await expect(
        checkout('tenant-1', 'op-1', { ...BASE_CHECKOUT, giftCardCode: 'GCTEST123456' }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'GIFT_CARD_FULLY_REDEEMED',
      });
    });

    it('throws 410 when gift card has expired', async () => {
      mockGiftCardFindUnique.mockResolvedValue(makeGiftCard({ expiresAt: new Date('2020-01-01') }));

      await expect(
        checkout('tenant-1', 'op-1', { ...BASE_CHECKOUT, giftCardCode: 'GCTEST123456' }),
      ).rejects.toMatchObject({
        statusCode: 410,
        code: 'GIFT_CARD_EXPIRED',
      });
    });

    it('throws 400 when gift card balance is insufficient', async () => {
      mockGiftCardFindUnique.mockResolvedValue(makeGiftCard({ currentBalance: 10 }));

      await expect(
        checkout('tenant-1', 'op-1', { ...BASE_CHECKOUT, giftCardCode: 'GCTEST123456', amount: 50 }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INSUFFICIENT_GIFT_CARD_BALANCE',
      });
    });

    it('deducts product stock when products are sold at POS', async () => {
      mockProductFindUnique.mockResolvedValue(makeProduct({ stockLevel: 10 }));
      mockProductUpdate.mockResolvedValue({});
      mockStockMovCreate.mockResolvedValue({});

      await checkout('tenant-1', 'op-1', {
        ...BASE_CHECKOUT,
        products: [{ productId: 'prod-1', quantity: 2 }],
      });

      expect(mockProductUpdate).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data:  { stockLevel: 8 },
      });
      expect(mockStockMovCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ productId: 'prod-1', quantity: -2, reason: 'SALE' }),
        }),
      );
    });

    it('throws 400 when product has insufficient stock', async () => {
      mockProductFindUnique.mockResolvedValue(makeProduct({ stockLevel: 1 }));

      await expect(
        checkout('tenant-1', 'op-1', {
          ...BASE_CHECKOUT,
          products: [{ productId: 'prod-1', quantity: 5 }],
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INSUFFICIENT_STOCK',
      });
    });
  });

  // ── listTransactions ──────────────────────────────────────────────────────

  describe('listTransactions', () => {
    it('returns paginated POS transactions', async () => {
      mockPaymentFindMany.mockResolvedValue([makePayment()]);
      mockPaymentCount.mockResolvedValue(1);

      const result = await listTransactions('tenant-1', { page: 1, limit: 20 });

      expect(result.payments).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ── getDailySummary ───────────────────────────────────────────────────────

  describe('getDailySummary', () => {
    it('returns aggregated revenue, tips, and transaction count', async () => {
      mockPaymentFindMany.mockResolvedValue([
        makePayment({ amount: 45, tipAmount: 5,    method: 'CARD' }),
        makePayment({ amount: 30, tipAmount: null, method: 'CASH' }),
      ]);

      const result = await getDailySummary('tenant-1', { date: '2024-06-01' });

      expect(result.totalRevenue).toBe(75);
      expect(result.totalTips).toBe(5);
      expect(result.grandTotal).toBe(80);
      expect(result.transactionCount).toBe(2);
      expect(result.byMethod['CARD'].count).toBe(1);
      expect(result.byMethod['CASH'].count).toBe(1);
    });

    it('returns zero totals when no transactions on date', async () => {
      mockPaymentFindMany.mockResolvedValue([]);

      const result = await getDailySummary('tenant-1', { date: '2024-01-01' });

      expect(result.totalRevenue).toBe(0);
      expect(result.totalTips).toBe(0);
      expect(result.transactionCount).toBe(0);
    });
  });

  // ── BUG 22 — artist tenant validation ─────────────────────────────────────

  describe('BUG 22 — checkout artist tenant validation', () => {
    it('throws 403 when artist belongs to a different tenant', async () => {
      mockArtistFindUnique.mockResolvedValue({ id: 'artist-1', tenantId: 'tenant-B' });

      await expect(checkout('tenant-A', 'op-1', BASE_CHECKOUT)).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('allows checkout when artist belongs to the same tenant', async () => {
      mockArtistFindUnique.mockResolvedValue({ id: 'artist-1', tenantId: 'tenant-1' });

      const result = await checkout('tenant-1', 'op-1', BASE_CHECKOUT);
      expect(result.booking.id).toBe('book-1');
    });

    it('allows checkout when tenantId is null (SUPER_ADMIN context)', async () => {
      mockArtistFindUnique.mockResolvedValue({ id: 'artist-1', tenantId: 'any-tenant' });

      const result = await checkout(null, 'op-1', BASE_CHECKOUT);
      expect(result.booking.id).toBe('book-1');
    });
  });
});
