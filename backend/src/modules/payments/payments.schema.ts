/**
 * Payments module — Zod validation schemas — Step 1.23 / Phase 4.1
 *
 * All request bodies validated here before they reach the service layer.
 */
import { z } from 'zod';

// ─── Create PaymentIntent ─────────────────────────────────────────────────────

export const CreatePaymentIntentSchema = z.object({
  /** The booking ID for which to collect a deposit. */
  bookingId: z.string().min(1, 'bookingId is required'),
  /** ISO-4217 three-letter currency code. Defaults to GBP. */
  currency: z
    .string()
    .length(3, 'currency must be a 3-letter ISO-4217 code')
    .toUpperCase()
    .default('GBP'),
  /**
   * Whether to save the card for future off-session charges
   * (e.g. cancellation fee collection without customer present).
   */
  saveCard: z.boolean().default(false),
  /**
   * Optional tip amount in major currency units (e.g. 5.00 = £5).
   * Added to the PaymentIntent amount when TIPS_ENABLED.
   */
  tipAmount: z.number().min(0, 'tipAmount must be non-negative').optional(),
});

export type CreatePaymentIntentBody = z.infer<typeof CreatePaymentIntentSchema>;

// ─── Refund ───────────────────────────────────────────────────────────────────

export const RefundSchema = z.object({
  /** The booking whose deposit should be refunded. */
  bookingId: z.string().min(1, 'bookingId is required'),
  /**
   * Stripe-accepted refund reason.  Optional — if omitted Stripe records the
   * reason as "null" which is perfectly valid.
   */
  reason: z
    .enum(['duplicate', 'fraudulent', 'requested_by_customer'])
    .optional(),
  /**
   * Partial refund amount in the booking's currency (major units, e.g. £12.50).
   * Omit to refund the full charge.
   */
  amount: z.number().positive('amount must be positive').optional(),
});

export type RefundBody = z.infer<typeof RefundSchema>;
