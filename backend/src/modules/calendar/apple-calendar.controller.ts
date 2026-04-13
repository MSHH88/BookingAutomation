/**
 * Apple Calendar controller — Phase 7.2
 *
 * HTTP handlers for the Apple iCloud CalDAV endpoints.
 * Delegates to apple-calendar.service and formats the response.
 */
import { Request, Response, NextFunction } from 'express';
import { z }      from 'zod';
import * as svc   from './apple-calendar.service';
import { success } from '../../utils/apiResponse';
import type { GetStatusQuery } from './calendar.schema';

// ─── Schema ───────────────────────────────────────────────────────────────────

/**
 * POST /api/calendar/apple/connect body schema.
 * Artist provides their iCloud email + app-specific password.
 */
export const appleConnectSchema = z.object({
  query: z.object({
    artistId: z.string().optional(),
  }),
  body: z.object({
    username: z.string({ required_error: 'username (iCloud email) is required' }).email(),
    password: z.string({ required_error: 'password (app-specific password) is required' }).min(1),
  }),
});

export type AppleConnectBody  = z.infer<typeof appleConnectSchema>['body'];
export type AppleConnectQuery = z.infer<typeof appleConnectSchema>['query'];

// ─── connectApple ─────────────────────────────────────────────────────────────

export async function connectAppleHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as AppleConnectQuery;
    const body  = req.body  as unknown as AppleConnectBody;
    const result = await svc.connectAppleCalendar(
      query.artistId,
      req.user!.id,
      req.user!.role as 'ADMIN' | 'ARTIST',
      body.username,
      body.password,
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── getAppleStatus ───────────────────────────────────────────────────────────

export async function getAppleStatusHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as GetStatusQuery;
    const result = await svc.getAppleStatus(
      query.artistId,
      req.user!.id,
      req.user!.role as 'ADMIN' | 'ARTIST',
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── disconnectApple ──────────────────────────────────────────────────────────

export async function disconnectAppleHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as GetStatusQuery;
    await svc.disconnectApple(
      query.artistId,
      req.user!.id,
      req.user!.role as 'ADMIN' | 'ARTIST',
    );
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}

