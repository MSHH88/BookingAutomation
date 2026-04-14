/**
 * Settings controller — Step 1.29
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic and DB/cache access lives in settings.service.ts.
 *
 * Route-level auth is enforced in settings.routes.ts:
 *   GET  /api/settings  — no auth required (public)
 *   PATCH /api/settings — requireAuth + requireRole('ADMIN')
 */
import { Request, Response, NextFunction } from 'express';

import * as settingsService from './settings.service';
import { success } from '../../utils/apiResponse';
import type { UpdateSettingsBody } from './settings.schema';
import { extractTenantId } from '../../utils/extractTenantId';

// ─── GET /api/settings ────────────────────────────────────────────────────────

/**
 * Returns the public-safe studio settings (served from Redis cache when warm).
 *
 * Response:  { success: true, data: PublicSettingsResult | null }
 * HTTP 200 even when settings have not been seeded yet — `data` will be null.
 */
export async function getSettings(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    // For public endpoint, derive tenantId from req.user if authenticated,
    // otherwise use null (falls back to single-tenant legacy row).
    const tenantId = req.user?.tenantId ?? null;
    const settings = await settingsService.getCachedSettings(tenantId);
    res.json(success(settings));
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/settings ──────────────────────────────────────────────────────

/**
 * Creates or updates the studio settings row and invalidates the Redis cache.
 *
 * Request body: UpdateSettingsBody (all fields optional; at least one required)
 * Response:     { success: true, data: FullSettingsResult }
 */
export async function patchSettings(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId ?? null;
    const body     = req.body as UpdateSettingsBody;
    const settings = await settingsService.updateSettings(tenantId, body);
    res.json(success(settings));
  } catch (err) {
    next(err);
  }
}
