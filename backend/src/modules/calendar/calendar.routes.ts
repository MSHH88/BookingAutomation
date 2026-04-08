/**
 * Calendar router — Step 1.28
 *
 * Mounts the Google Calendar OAuth and sync-status endpoints.
 *
 * | Method | Path                       | Auth              | Feature Flag      | Description                              |
 * |--------|----------------------------|-------------------|-------------------|------------------------------------------|
 * | GET    | /api/calendar/auth-url     | ADMIN or ARTIST   | CALENDAR_ENABLED  | Get OAuth consent URL                    |
 * | GET    | /api/calendar/callback     | none (public)     | —                 | OAuth2 callback — exchanges code, stores tokens |
 * | GET    | /api/calendar/status       | ADMIN or ARTIST   | CALENDAR_ENABLED  | Check if calendar is connected           |
 * | DELETE | /api/calendar/disconnect   | ADMIN or ARTIST   | CALENDAR_ENABLED  | Remove stored tokens (disconnect)        |
 *
 * Notes:
 *  - The `/callback` route is intentionally **public** (no `requireAuth`).
 *    Google redirects the user's browser to this URL after the consent screen;
 *    there is no Authorization header available at that point.  The `state`
 *    parameter (encoded artistId) provides the binding between the callback
 *    and the correct Artist record — no session cookie required.
 *
 *  - The `CALENDAR_ENABLED` feature flag gates the three authenticated
 *    endpoints.  The callback is excluded so that an in-flight OAuth flow
 *    can still complete even if the flag is toggled off mid-flow.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl          from './calendar.controller';
import {
  getAuthUrlSchema,
  callbackSchema,
  getStatusSchema,
} from './calendar.schema';

const router = Router();

/**
 * GET /api/calendar/auth-url
 * Returns the Google OAuth2 consent URL for the artist.
 * ADMIN: must supply ?artistId=<artist.id>
 * ARTIST: uses their own artist profile
 */
router.get(
  '/auth-url',
  requireAuth,
  requireRole('ARTIST'),
  requireFeature('CALENDAR_ENABLED'),
  validate(getAuthUrlSchema),
  ctrl.getAuthUrl,
);

/**
 * GET /api/calendar/callback
 * Public — Google redirects here after user grants/denies consent.
 * No auth middleware. State parameter identifies the artist.
 */
router.get(
  '/callback',
  validate(callbackSchema),
  ctrl.handleCallback,
);

/**
 * GET /api/calendar/status
 * Returns whether the artist has a connected Google Calendar.
 */
router.get(
  '/status',
  requireAuth,
  requireRole('ARTIST'),
  requireFeature('CALENDAR_ENABLED'),
  validate(getStatusSchema),
  ctrl.getStatus,
);

/**
 * DELETE /api/calendar/disconnect
 * Removes stored OAuth tokens — artist must re-connect to resume sync.
 */
router.delete(
  '/disconnect',
  requireAuth,
  requireRole('ARTIST'),
  requireFeature('CALENDAR_ENABLED'),
  validate(getStatusSchema),
  ctrl.disconnectCalendarHandler,
);

export { router as calendarRoutes };
