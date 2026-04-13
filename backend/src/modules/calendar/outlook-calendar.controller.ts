/**
 * Outlook Calendar controller — Phase 7.1
 *
 * HTTP handlers for the Microsoft Outlook Calendar OAuth endpoints.
 * Delegates to outlook-calendar.service and formats the response.
 */
import { Request, Response, NextFunction } from 'express';
import * as svc from './outlook-calendar.service';
import { success } from '../../utils/apiResponse';
import type { GetAuthUrlQuery, CallbackQuery, GetStatusQuery } from './calendar.schema';

// ─── getOutlookAuthUrl ────────────────────────────────────────────────────────

export async function getOutlookAuthUrlHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as GetAuthUrlQuery;
    const result = await svc.getOutlookOAuthUrl(
      query.artistId,
      req.user!.id,
      req.user!.role as 'ADMIN' | 'ARTIST',
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── handleOutlookCallback ────────────────────────────────────────────────────

export async function handleOutlookCallbackHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as CallbackQuery;
    const { code, state, error } = query;

    if (error) {
      res.status(400).json({ success: false, error: 'ACCESS_DENIED', message: 'Outlook Calendar access was denied.' });
      return;
    }

    if (!code) {
      res.status(400).json({ success: false, error: 'MISSING_CODE', message: 'Authorization code is missing.' });
      return;
    }

    await svc.handleOutlookCallback(code, state);
    res.json(success({ connected: true }));
  } catch (err) {
    next(err);
  }
}

// ─── getOutlookStatus ─────────────────────────────────────────────────────────

export async function getOutlookStatusHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as GetStatusQuery;
    const result = await svc.getOutlookStatus(
      query.artistId,
      req.user!.id,
      req.user!.role as 'ADMIN' | 'ARTIST',
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── disconnectOutlook ────────────────────────────────────────────────────────

export async function disconnectOutlookHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as GetStatusQuery;
    await svc.disconnectOutlook(
      query.artistId,
      req.user!.id,
      req.user!.role as 'ADMIN' | 'ARTIST',
    );
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}

