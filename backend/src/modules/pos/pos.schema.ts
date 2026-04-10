/**
 * POS (Point of Sale) module — Zod validation schemas — Phase 4.4
 *
 * Endpoints:
 *   POST   /api/pos/checkout          — walk-in checkout (creates booking + payment record)
 *   GET    /api/pos/transactions      — list POS transactions (paginated)
 *   GET    /api/pos/summary           — daily revenue summary
 */
import { z } from 'zod';

// ─── POST /api/pos/checkout ───────────────────────────────────────────────────

export const posCheckoutSchema = z.object({
  body: z.object({
    /** The artist/staff member performing the service. */
    artistId:  z.string().min(1, 'artistId is required'),
    /** Optional service ID for the service being rendered. */
    serviceId: z.string().optional(),
    /** Customer name (for walk-in customers without an account). */
    customerName: z.string().min(1, 'customerName is required').max(200),
    /** Customer email (optional for walk-ins). */
    customerEmail: z.string().email().optional(),
    /** Total service amount in major currency units (e.g. 45.00). */
    amount: z.number().positive('amount must be positive'),
    /** Optional tip amount in major currency units. */
    tipAmount: z.number().min(0, 'tipAmount must be non-negative').optional(),
    /** Optional gift card code to apply. */
    giftCardCode: z.string().optional(),
    /** Payment method used. */
    method: z.enum(['CARD', 'CASH', 'TERMINAL', 'GIFT_CARD']).default('CARD'),
    /** Currency code (ISO-4217). */
    currency: z.string().length(3).toUpperCase().default('GBP'),
    /** Optional notes. */
    notes: z.string().optional(),
    /** Products sold at POS (inventory deduction). */
    products: z
      .array(
        z.object({
          productId: z.string().min(1, 'productId is required'),
          quantity:  z.number().int().min(1, 'quantity must be at least 1'),
        }),
      )
      .optional(),
  }),
});

export type PosCheckoutBody = z.infer<typeof posCheckoutSchema>['body'];

// ─── GET /api/pos/transactions ────────────────────────────────────────────────

export const posListTransactionsSchema = z.object({
  query: z.object({
    page:  z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    date:  z.string().optional(), // filter by date YYYY-MM-DD
  }),
});

export type PosListTransactionsQuery = z.infer<typeof posListTransactionsSchema>['query'];

// ─── GET /api/pos/summary ─────────────────────────────────────────────────────

export const posSummarySchema = z.object({
  query: z.object({
    date: z.string().optional(), // YYYY-MM-DD; defaults to today
  }),
});

export type PosSummaryQuery = z.infer<typeof posSummarySchema>['query'];

// ─── GET /api/pos/terminal/connection-token ───────────────────────────────────

export const terminalConnectionTokenSchema = z.object({});
export type TerminalConnectionTokenQuery = Record<string, never>;

// ─── POST /api/pos/terminal/payment-intent ────────────────────────────────────

export const terminalPaymentIntentSchema = z.object({
  body: z.object({
    /** Amount in major currency units (e.g. 45.00). */
    amount:   z.number().positive('amount must be positive'),
    /** ISO-4217 currency code. */
    currency: z.string().length(3).toUpperCase().default('GBP'),
    /** Booking ID to associate with the payment intent. */
    bookingId: z.string().optional(),
  }),
});

export type TerminalPaymentIntentBody = z.infer<typeof terminalPaymentIntentSchema>['body'];
