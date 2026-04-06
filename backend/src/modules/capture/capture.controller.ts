/**
 * Capture controller — Step 1.11
 *
 * HTTP concerns only: extract request metadata, call the capture service,
 * and send the response.  All business logic lives in capture.service.ts.
 */
import { Request, Response, NextFunction } from 'express';

import * as captureService from './capture.service';
import { success }         from '../../utils/apiResponse';
import type { CaptureLeadBody } from './capture.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the real client IP, respecting X-Forwarded-For in production. */
function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) {
    return forwarded[0]?.split(',')[0]?.trim();
  }
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim();
  }
  return req.socket.remoteAddress;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/capture
 *
 * Public lead capture ingress for all business types.
 *
 * Returns 201 on a brand new capture and 200 on a duplicate submission
 * (the existing lead is returned, no duplicate record is created).
 *
 * Gated by requireFeature('LEAD_CAPTURE_ENABLED') in the router.
 */
export async function captureLead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body      = req.body as CaptureLeadBody;
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const result = await captureService.captureLeadPublic(body, ipAddress, userAgent);

    // Return 200 for duplicates (the client already has this lead), 201 for new
    const status = result.isDuplicate ? 200 : 201;
    res.status(status).json(success(result));
  } catch (err) {
    next(err);
  }
}
