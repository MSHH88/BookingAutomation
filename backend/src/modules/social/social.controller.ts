/**
 * Social booking link controller — Phase 2.4
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';

import * as socialService from './social.service';
import { success }        from '../../utils/apiResponse';
import type { GetBookingLinkQuery, GetBookingSourcesQuery } from './social.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/social/booking-link
 * Generates a shareable booking URL with platform-specific UTM.
 */
export async function getBookingLink(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const query    = req.query as unknown as GetBookingLinkQuery;
    const result   = await socialService.getBookingLink(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/social/sources
 * Returns booking source attribution statistics.
 */
export async function getBookingSources(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const query    = req.query as unknown as GetBookingSourcesQuery;
    const result   = await socialService.getBookingSources(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
