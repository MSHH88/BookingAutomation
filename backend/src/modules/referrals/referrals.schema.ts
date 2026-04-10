/**
 * Referral tracking schemas — Phase 3.5
 *
 * Zod validation schemas for the Referral Tracking API.
 *
 * Endpoints:
 *   GET    /api/referrals              — list all referrals (paginated)
 *   GET    /api/referrals/:id          — get referral details
 *   POST   /api/referrals/generate-code — generate/get referral code
 *   GET    /api/referrals/lookup/:code — look up referrer by code (public)
 *   POST   /api/referrals/link         — link referee to referrer
 *   POST   /api/referrals/:id/process-reward — process reward
 */
import { z } from 'zod';

// ─── GET /api/referrals ───────────────────────────────────────────────────────

export const listReferralsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export type ListReferralsQuery = z.infer<typeof listReferralsSchema>['query'];

// ─── GET /api/referrals/:id ───────────────────────────────────────────────────

export const getReferralSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── GET /api/referrals/lookup/:code ──────────────────────────────────────────

export const lookupReferralCodeSchema = z.object({
  params: z.object({
    code: z.string().min(1, 'code is required'),
  }),
});

// ─── POST /api/referrals/link ─────────────────────────────────────────────────

export const linkReferralSchema = z.object({
  body: z.object({
    referrerCode: z.string().min(1, 'referrerCode is required'),
    refereeId: z.string().min(1, 'refereeId is required'),
  }),
});

export type LinkReferralBody = z.infer<typeof linkReferralSchema>['body'];

// ─── POST /api/referrals/:id/process-reward ───────────────────────────────────

export const processRewardSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    rewardAmount: z.number().positive('rewardAmount must be positive'),
  }),
});

export type ProcessRewardBody = z.infer<typeof processRewardSchema>['body'];
