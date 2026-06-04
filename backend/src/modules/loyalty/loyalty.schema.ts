/**
 * Loyalty module — Zod validation schemas — Phase 5.3
 *
 * Endpoints:
 *   GET  /api/me/loyalty                    — customer's own loyalty account
 *   GET  /api/customers/:customerId/loyalty — ADMIN view of customer loyalty
 *   POST /api/loyalty/redeem                — redeem points at checkout (ADMIN)
 */
import { z } from 'zod';

// ─── GET /api/customers/:customerId/loyalty ───────────────────────────────────

export const customerLoyaltyParamSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'customerId is required'),
  }),
});

// ─── POST /api/loyalty/redeem ─────────────────────────────────────────────────

export const redeemPointsSchema = z.object({
  body: z.object({
    customerId:  z.string().min(1, 'customerId is required'),
    pointsToUse: z.number().int().min(1, 'pointsToUse must be at least 1'),
    bookingId:   z.string().min(1).optional(),
  }),
});

export type RedeemPointsBody = z.infer<typeof redeemPointsSchema>['body'];

// ─── (Internal) Award points ──────────────────────────────────────────────────
// Used by bookings.service — no HTTP schema needed.

export interface AwardPointsParams {
  customerId:  string;
  tenantId:    string;
  points:      number;
  reason:      string;
  bookingId?:  string;
}
