/**
 * Gift Cards module — Zod validation schemas — Phase 4.2
 *
 * Endpoints:
 *   POST  /api/gift-cards          — create/sell a gift card
 *   GET   /api/gift-cards          — list gift cards (ADMIN, paginated)
 *   GET   /api/gift-cards/:code    — check balance (public)
 *   POST  /api/gift-cards/:code/redeem — redeem (deduct balance)
 */
import { z } from 'zod';

// ─── POST /api/gift-cards ─────────────────────────────────────────────────────

export const createGiftCardSchema = z.object({
  body: z.object({
    originalValue: z.number().positive('originalValue must be positive'),
    issuedTo:      z.string().email('issuedTo must be a valid email').optional(),
    purchasedById: z.string().min(1).optional(),
    expiresAt:     z.string().datetime({ message: 'expiresAt must be ISO 8601' }).optional(),
  }),
});

export type CreateGiftCardBody = z.infer<typeof createGiftCardSchema>['body'];

// ─── GET /api/gift-cards ──────────────────────────────────────────────────────

export const listGiftCardsSchema = z.object({
  query: z.object({
    page:  z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export type ListGiftCardsQuery = z.infer<typeof listGiftCardsSchema>['query'];

// ─── GET /api/gift-cards/:code ────────────────────────────────────────────────

export const getGiftCardSchema = z.object({
  params: z.object({
    code: z.string().min(1, 'code is required'),
  }),
});

// ─── POST /api/gift-cards/:code/redeem ───────────────────────────────────────

export const redeemGiftCardSchema = z.object({
  params: z.object({
    code: z.string().min(1, 'code is required'),
  }),
  body: z.object({
    amount: z.number().positive('amount must be positive'),
  }),
});

export type RedeemGiftCardBody = z.infer<typeof redeemGiftCardSchema>['body'];
