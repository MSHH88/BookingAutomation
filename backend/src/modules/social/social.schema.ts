/**
 * Social booking link schemas — Phase 2.4
 *
 * Zod validation schemas for the social booking link API.
 *
 * Endpoints:
 *   GET  /api/social/booking-link    — generate shareable booking URL
 *   GET  /api/social/sources         — list booking source statistics
 */
import { z } from 'zod';

// ─── GET /api/social/booking-link ─────────────────────────────────────────────

export const getBookingLinkSchema = z.object({
  query: z.object({
    /** Target social platform — determines UTM and URL format. */
    platform: z.enum(['instagram', 'facebook', 'generic']).optional(),
  }),
});

export type GetBookingLinkQuery = z.infer<typeof getBookingLinkSchema>['query'];

// ─── GET /api/social/sources ──────────────────────────────────────────────────

export const getBookingSourcesSchema = z.object({
  query: z.object({
    from: z.string().optional(),
    to:   z.string().optional(),
  }),
});

export type GetBookingSourcesQuery = z.infer<typeof getBookingSourcesSchema>['query'];
