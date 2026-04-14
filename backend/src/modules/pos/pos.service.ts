/**
 * POS (Point of Sale) service — Phase 4.4
 *
 * Business logic for walk-in checkout and POS reporting.
 *
 * ─── What this module does ───────────────────────────────────────────────────
 *
 *   checkout(tenantId, operatorId, data)
 *     Processes a walk-in sale:
 *       1. Validates gift card (when provided) and checks balance.
 *       2. Creates a COMPLETED Booking (source = POS).
 *       3. Deducts product stock (when products are sold).
 *       4. Creates a Payment record for the transaction.
 *       5. Applies gift card redemption (when provided).
 *       6. Returns { booking, payment }.
 *
 *   listTransactions(tenantId, query)
 *     Paginated list of POS Payment records for a tenant.
 *
 *   getDailySummary(tenantId, date)
 *     Aggregates revenue, tip, and transaction count for a given day.
 */
import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { logger }   from '../../utils/logger';
import {
  createTerminalConnectionToken as stripeCreateConnectionToken,
  createTerminalPaymentIntent as stripeCreatePaymentIntent,
} from '../../lib/stripe';
import type { PosCheckoutBody, PosListTransactionsQuery, PosSummaryQuery, TerminalPaymentIntentBody } from './pos.schema';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * POST /api/pos/checkout
 * Creates a walk-in booking + payment record in a single atomic operation.
 */
export async function checkout(tenantId: string | null, operatorId: string, data: PosCheckoutBody) {
  const now = new Date();

  // 1. Validate gift card if provided
  let giftCard = null;
  if (data.giftCardCode) {
    giftCard = await prisma.giftCard.findUnique({ where: { code: data.giftCardCode } });

    if (!giftCard) {
      throw new AppError(404, 'GIFT_CARD_NOT_FOUND', 'Gift card not found');
    }

    if (giftCard.tenantId !== tenantId) {
      throw new AppError(403, 'FORBIDDEN', 'Gift card does not belong to this tenant');
    }

    if (giftCard.isRedeemed) {
      throw new AppError(409, 'GIFT_CARD_FULLY_REDEEMED', 'Gift card has been fully redeemed');
    }

    if (giftCard.expiresAt && giftCard.expiresAt < now) {
      throw new AppError(410, 'GIFT_CARD_EXPIRED', 'Gift card has expired');
    }

    const giftCardBalance = Number(giftCard.currentBalance);
    const totalDue        = data.amount + (data.tipAmount ?? 0);

    if (giftCardBalance < totalDue) {
      throw new AppError(
        400,
        'INSUFFICIENT_GIFT_CARD_BALANCE',
        `Gift card balance (${giftCardBalance}) is insufficient for total (${totalDue})`,
      );
    }
  }

  // 2. Validate artist exists (required field on Booking)
  const artist = await prisma.artist.findUnique({
    where:  { id: data.artistId },
    select: { id: true },
  });

  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist not found');
  }

  // 3. Create a COMPLETED Booking for the walk-in
  const booking = await prisma.booking.create({
    data: {
      tenantId,
      artistId:   data.artistId,
      serviceId:  data.serviceId ?? null,
      startAt:    now,
      endAt:      now,
      status:     'COMPLETED',
      source:     'POS',
      totalAmount: data.amount,
      notes:       data.notes ?? null,
      completedAt: now,
    },
  });

  // 4. Deduct product stock for any sold items
  if (data.products && data.products.length > 0) {
    for (const item of data.products) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });

      if (!product) {
        logger.warn('POS checkout: product not found for stock deduction', {
          productId: item.productId,
          bookingId: booking.id,
        });
        continue;
      }

      if (product.tenantId !== tenantId) {
        logger.warn('POS checkout: product belongs to different tenant — skipping', {
          productId: item.productId,
          bookingId: booking.id,
        });
        continue;
      }

      const newStock = product.stockLevel - item.quantity;

      if (newStock < 0) {
        throw new AppError(
          400,
          'INSUFFICIENT_STOCK',
          `Insufficient stock for product ${product.name} (available: ${product.stockLevel}, requested: ${item.quantity})`,
        );
      }

      await Promise.all([
        prisma.product.update({
          where: { id: item.productId },
          data:  { stockLevel: newStock },
        }),
        prisma.stockMovement.create({
          data: {
            productId: item.productId,
            tenantId,
            quantity:  -item.quantity,
            reason:    'SALE',
            bookingId: booking.id,
            notes:     `POS sale — ${data.customerName}`,
          },
        }),
      ]);

      // Log low-stock warning
      if (newStock <= product.lowStockThreshold) {
        logger.warn('LOW_STOCK alert: product stock is at or below threshold after POS sale', {
          productId:        item.productId,
          productName:      product.name,
          currentStock:     newStock,
          lowStockThreshold: product.lowStockThreshold,
        });
      }
    }
  }

  // 5. Create a Payment record
  const effectiveMethod = data.giftCardCode ? 'GIFT_CARD' : data.method;
  const isTerminal = effectiveMethod === 'TERMINAL';

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      bookingId: booking.id,
      amount:    data.amount,
      tipAmount: data.tipAmount ?? null,
      currency:  data.currency,
      status:    isTerminal ? 'PENDING' : 'SUCCEEDED',
      method:    effectiveMethod,
      paidAt:    now,
      notes:     data.notes ?? null,
    },
  });

  // 6. Redeem gift card if provided
  if (giftCard) {
    const totalPaid      = data.amount + (data.tipAmount ?? 0);
    const newBalance     = Number(giftCard.currentBalance) - totalPaid;
    const isNowRedeemed  = newBalance <= 0;

    await prisma.giftCard.update({
      where: { code: data.giftCardCode! },
      data:  {
        currentBalance: Math.max(0, newBalance),
        isRedeemed:     isNowRedeemed,
      },
    });
  }

  logger.info('POS checkout completed', {
    tenantId,
    operatorId,
    bookingId:  booking.id,
    paymentId:  payment.id,
    amount:     data.amount,
    tipAmount:  data.tipAmount,
    method:     effectiveMethod,
  });

  return { booking, payment };
}

/**
 * GET /api/pos/transactions
 * Paginated list of POS Payment records for a tenant.
 */
export async function listTransactions(tenantId: string | null, query: PosListTransactionsQuery) {
  const { page = 1, limit = 20, date } = query;
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    tenantId,
    booking: { source: 'POS' },
  };

  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end   = new Date(`${date}T23:59:59.999Z`);
    where.createdAt = { gte: start, lte: end };
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take:    limit,
      include: { booking: { select: { id: true, startAt: true, serviceId: true, source: true } } },
    }),
    prisma.payment.count({ where }),
  ]);

  return { payments, total, page, limit };
}

/**
 * GET /api/pos/summary
 * Aggregates POS revenue, tips, and transaction count for a given date.
 * Defaults to today when no date is provided.
 */
export async function getDailySummary(tenantId: string | null, query: PosSummaryQuery) {
  const dateStr = query.date ?? new Date().toISOString().slice(0, 10);
  const start   = new Date(`${dateStr}T00:00:00.000Z`);
  const end     = new Date(`${dateStr}T23:59:59.999Z`);

  const payments = await prisma.payment.findMany({
    where: {
      tenantId,
      status:    'SUCCEEDED',
      createdAt: { gte: start, lte: end },
      booking:   { source: 'POS' },
    },
    select: {
      amount:    true,
      tipAmount: true,
      method:    true,
    },
  });

  const totalRevenue     = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalTips        = payments.reduce((sum, p) => sum + Number(p.tipAmount ?? 0), 0);
  const transactionCount = payments.length;

  // Breakdown by payment method
  const byMethod: Record<string, { count: number; revenue: number }> = {};
  for (const p of payments) {
    const method = p.method as string;
    if (!byMethod[method]) {
      byMethod[method] = { count: 0, revenue: 0 };
    }
    byMethod[method].count   += 1;
    byMethod[method].revenue += Number(p.amount);
  }

  return {
    date:             dateStr,
    totalRevenue:     Math.round(totalRevenue * 100) / 100,
    totalTips:        Math.round(totalTips * 100) / 100,
    grandTotal:       Math.round((totalRevenue + totalTips) * 100) / 100,
    transactionCount,
    byMethod,
  };
}

/**
 * GET /api/pos/terminal/connection-token
 * Generates a Stripe Terminal connection token for the frontend SDK.
 */
export async function getTerminalConnectionToken(_tenantId: string | null): Promise<{ secret: string }> {
  const secret = await stripeCreateConnectionToken();
  return { secret };
}

/**
 * POST /api/pos/terminal/payment-intent
 * Creates a Stripe PaymentIntent for Terminal capture (capture_method: manual).
 */
export async function createTerminalPaymentIntent(
  tenantId: string | null,
  data: TerminalPaymentIntentBody,
): Promise<{ paymentIntentId: string; clientSecret: string | null }> {
  const metadata: Record<string, string> = {};
  if (tenantId) metadata['tenantId'] = tenantId;
  if (data.bookingId) metadata['bookingId'] = data.bookingId;

  const intent = await stripeCreatePaymentIntent(data.amount, data.currency, metadata);

  logger.info('Terminal PaymentIntent created', {
    tenantId,
    paymentIntentId: intent.id,
    amount:          data.amount,
    currency:        data.currency,
  });

  return {
    paymentIntentId: intent.id,
    clientSecret:    intent.client_secret,
  };
}
