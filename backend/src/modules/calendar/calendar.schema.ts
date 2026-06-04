/**
 * Calendar schema — Step 1.28
 *
 * Zod schemas for the Google Calendar OAuth endpoints.
 */
import { z } from 'zod';

// ─── Request schemas ──────────────────────────────────────────────────────────

/**
 * Query string for GET /api/calendar/auth-url
 *
 * ADMIN may specify an `artistId` to generate the URL on behalf of any artist.
 * ARTIST role omits the field — the URL is generated for their own artist profile.
 */
export const getAuthUrlSchema = z.object({
  query: z.object({
    artistId: z.string().optional(),
  }),
});

/**
 * Query string for GET /api/calendar/callback
 *
 * Google sends `code` and `state` (which encodes the artistUserId) back to this
 * endpoint after the user grants / denies consent.
 */
export const callbackSchema = z.object({
  query: z.object({
    // `code` is optional: Google omits it when the user denies consent
    // and sends only `error=access_denied&state=...` instead.
    code:  z.string().optional(),
    state: z.string({ required_error: 'state is required' }).min(1),
    error: z.string().optional(),
  }),
});

/**
 * Query string for GET /api/calendar/status
 *
 * ADMIN may check any artist's connection status by passing artistId.
 * ARTIST sees only their own status.
 */
export const getStatusSchema = z.object({
  query: z.object({
    artistId: z.string().optional(),
  }),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type GetAuthUrlQuery = z.infer<typeof getAuthUrlSchema>['query'];
export type CallbackQuery   = z.infer<typeof callbackSchema>['query'];
export type GetStatusQuery  = z.infer<typeof getStatusSchema>['query'];
