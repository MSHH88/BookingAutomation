/**
 * Calendar controller — Step 1.28
 *
 * HTTP handlers for the Google Calendar OAuth endpoints.
 * All handlers delegate to calendar.service and format the response.
 */
import { Request, Response, NextFunction } from 'express';
import * as svc from './calendar.service';
import { success } from '../../utils/apiResponse';
import type { GetAuthUrlQuery, CallbackQuery, GetStatusQuery } from './calendar.schema';

// ─── getAuthUrl ───────────────────────────────────────────────────────────────

/**
 * GET /api/calendar/auth-url
 *
 * Returns the Google OAuth2 consent URL for the requesting artist (ARTIST role)
 * or a specified artist (ADMIN role, must supply ?artistId=).
 *
 * Response: { success: true, data: { url: string } }
 */
export async function getAuthUrl(
  req: Request<object, object, object, GetAuthUrlQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await svc.getOAuthUrl(
      req.query.artistId,
      req.user!.id,
      req.user!.role as 'ADMIN' | 'ARTIST',
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── handleCallback ───────────────────────────────────────────────────────────

/**
 * GET /api/calendar/callback
 *
 * Public endpoint — Google redirects here after the user grants or denies
 * consent.  Exchanges the auth code for tokens and persists them.
 *
 * On success: returns JSON `{ success: true, data: { connected: true } }`
 * On error:   falls through to the global error handler.
 *
 * The frontend / CRM should then close the OAuth popup and refresh the
 * calendar status widget.
 */
export async function handleCallback(
  req: Request<object, object, object, CallbackQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code, state, error } = req.query;

    if (error) {
      // User denied consent
      res.status(400).json({ success: false, error: 'ACCESS_DENIED', message: 'Google Calendar access was denied.' });
      return;
    }

    if (!code) {
      // Guard: should never happen (Google always sends code or error) but prevents a confusing 502
      res.status(400).json({ success: false, error: 'MISSING_CODE', message: 'Authorization code is missing.' });
      return;
    }

    await svc.handleOAuthCallback(code, state);
    res.json(success({ connected: true }));
  } catch (err) {
    next(err);
  }
}

// ─── getStatus ────────────────────────────────────────────────────────────────

/**
 * GET /api/calendar/status
 *
 * Returns whether the artist has a connected Google Calendar.
 * Response: { success: true, data: { connected: boolean, expiresAt: string | null } }
 */
export async function getStatus(
  req: Request<object, object, object, GetStatusQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await svc.getCalendarStatus(
      req.query.artistId,
      req.user!.id,
      req.user!.role as 'ADMIN' | 'ARTIST',
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── disconnectCalendar ───────────────────────────────────────────────────────

/**
 * DELETE /api/calendar/disconnect
 *
 * Removes the stored Google Calendar tokens from the Artist record.
 * Response: 204 No Content.
 */
export async function disconnectCalendarHandler(
  req: Request<object, object, object, GetStatusQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await svc.disconnectCalendar(
      req.query.artistId,
      req.user!.id,
      req.user!.role as 'ADMIN' | 'ARTIST',
    );
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}
