/**
 * Calendar router — Step 1.28 + Phase 7.1 + Phase 7.2
 *
 * Mounts the Google Calendar OAuth, Outlook Calendar OAuth, and Apple iCloud
 * CalDAV endpoints alongside sync-status handlers.
 *
 * | Method | Path                            | Auth            | Feature Flag              | Description                              |
 * |--------|---------------------------------|-----------------|---------------------------|------------------------------------------|
 * | GET    | /api/calendar/auth-url          | ADMIN or ARTIST | CALENDAR_ENABLED          | Get Google OAuth consent URL             |
 * | GET    | /api/calendar/callback          | none (public)   | —                         | Google OAuth2 callback                   |
 * | GET    | /api/calendar/status            | ADMIN or ARTIST | CALENDAR_ENABLED          | Check Google Calendar connection         |
 * | DELETE | /api/calendar/disconnect        | ADMIN or ARTIST | CALENDAR_ENABLED          | Disconnect Google Calendar               |
 * | GET    | /api/calendar/outlook/auth-url  | ADMIN or ARTIST | OUTLOOK_CALENDAR_ENABLED  | Get Microsoft OAuth consent URL          |
 * | GET    | /api/calendar/outlook/callback  | none (public)   | —                         | Microsoft OAuth2 callback                |
 * | GET    | /api/calendar/outlook/status    | ADMIN or ARTIST | OUTLOOK_CALENDAR_ENABLED  | Check Outlook Calendar connection        |
 * | DELETE | /api/calendar/outlook/disconnect| ADMIN or ARTIST | OUTLOOK_CALENDAR_ENABLED  | Disconnect Outlook Calendar              |
 * | POST   | /api/calendar/apple/connect     | ADMIN or ARTIST | APPLE_CALENDAR_ENABLED    | Connect Apple iCloud CalDAV              |
 * | GET    | /api/calendar/apple/status      | ADMIN or ARTIST | APPLE_CALENDAR_ENABLED    | Check Apple Calendar connection          |
 * | DELETE | /api/calendar/apple/disconnect  | ADMIN or ARTIST | APPLE_CALENDAR_ENABLED    | Disconnect Apple Calendar                |
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl          from './calendar.controller';
import * as outlookCtrl   from './outlook-calendar.controller';
import * as appleCtrl     from './apple-calendar.controller';
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

// ─── Outlook Calendar — Phase 7.1 ────────────────────────────────────────────

/**
 * GET /api/calendar/outlook/auth-url
 * Returns the Microsoft OAuth2 consent URL for the artist.
 */
router.get(
  '/outlook/auth-url',
  requireAuth,
  requireRole('ARTIST'),
  requireFeature('OUTLOOK_CALENDAR_ENABLED'),
  validate(getAuthUrlSchema),
  outlookCtrl.getOutlookAuthUrlHandler,
);

/**
 * GET /api/calendar/outlook/callback
 * Public — Microsoft redirects here after consent.
 */
router.get(
  '/outlook/callback',
  validate(callbackSchema),
  outlookCtrl.handleOutlookCallbackHandler,
);

/**
 * GET /api/calendar/outlook/status
 * Returns whether the artist has a connected Outlook Calendar.
 */
router.get(
  '/outlook/status',
  requireAuth,
  requireRole('ARTIST'),
  requireFeature('OUTLOOK_CALENDAR_ENABLED'),
  validate(getStatusSchema),
  outlookCtrl.getOutlookStatusHandler,
);

/**
 * DELETE /api/calendar/outlook/disconnect
 * Removes stored Microsoft tokens.
 */
router.delete(
  '/outlook/disconnect',
  requireAuth,
  requireRole('ARTIST'),
  requireFeature('OUTLOOK_CALENDAR_ENABLED'),
  validate(getStatusSchema),
  outlookCtrl.disconnectOutlookHandler,
);

// ─── Apple iCloud Calendar — Phase 7.2 ───────────────────────────────────────

/**
 * POST /api/calendar/apple/connect
 * Stores Apple CalDAV credentials (iCloud email + app-specific password).
 */
router.post(
  '/apple/connect',
  requireAuth,
  requireRole('ARTIST'),
  requireFeature('APPLE_CALENDAR_ENABLED'),
  validate(appleCtrl.appleConnectSchema),
  appleCtrl.connectAppleHandler,
);

/**
 * GET /api/calendar/apple/status
 * Returns whether the artist has a connected Apple iCloud Calendar.
 */
router.get(
  '/apple/status',
  requireAuth,
  requireRole('ARTIST'),
  requireFeature('APPLE_CALENDAR_ENABLED'),
  validate(getStatusSchema),
  appleCtrl.getAppleStatusHandler,
);

/**
 * DELETE /api/calendar/apple/disconnect
 * Removes stored Apple CalDAV credentials.
 */
router.delete(
  '/apple/disconnect',
  requireAuth,
  requireRole('ARTIST'),
  requireFeature('APPLE_CALENDAR_ENABLED'),
  validate(getStatusSchema),
  appleCtrl.disconnectAppleHandler,
);

export { router as calendarRoutes };
