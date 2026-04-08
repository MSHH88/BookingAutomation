/**
 * Admin Panel controller — Step 1.26
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic and DB access lives in admin.service.ts.
 *
 * Authentication and ADMIN role enforcement are handled at the router level
 * via requireAuth + requireRole('ADMIN').
 */
import { Request, Response, NextFunction } from 'express';

import * as adminService from './admin.service';
import { success, paginated } from '../../utils/apiResponse';
import type {
  UpdateSettingsBody,
  UpdateFeatureFlagParams,
  UpdateFeatureFlagBody,
  ListUsersQuery,
  UpdateUserParams,
  UpdateUserBody,
  ListArtistsAdminQuery,
  UpdateArtistAdminParams,
  UpdateArtistAdminBody,
} from './admin.schema';

// ─── Studio Settings ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/settings
 * Returns the current studio settings, or null if not yet configured.
 */
export async function getSettings(
  _req: Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const settings = await adminService.getStudioSettings();
    res.json(success(settings));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/settings
 * Creates or updates studio settings.
 *
 * On a fresh deployment (no settings row yet) the body must include
 * `studioName`.  All subsequent calls may omit it.
 */
export async function patchSettings(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body     = req.body as UpdateSettingsBody;
    const settings = await adminService.updateStudioSettings(body);
    res.json(success(settings));
  } catch (err) {
    next(err);
  }
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/feature-flags
 * Returns all feature flags ordered alphabetically by key.
 */
export async function getFeatureFlags(
  _req: Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const flags = await adminService.listFeatureFlags();
    res.json(success(flags));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/feature-flags/:key
 * Enables or disables a feature flag by its unique key.
 */
export async function patchFeatureFlag(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { key } = req.params as UpdateFeatureFlagParams;
    const body    = req.body as UpdateFeatureFlagBody;
    const flag    = await adminService.updateFeatureFlag(key, body);
    res.json(success(flag));
  } catch (err) {
    next(err);
  }
}

// ─── User Management ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Returns a paginated list of users, optionally filtered by role,
 * isActive status, and a free-text search.
 */
export async function getUsers(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query  = req.query as ListUsersQuery;
    const result = await adminService.listUsers(query);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/users/:id
 * Updates a user's role, active state, or display name.
 */
export async function patchUser(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as UpdateUserParams;
    const body   = req.body as UpdateUserBody;
    const user   = await adminService.updateUser(id, body);
    res.json(success(user));
  } catch (err) {
    next(err);
  }
}

// ─── Artist Management ────────────────────────────────────────────────────────

/**
 * GET /api/admin/artists
 * Returns a paginated list of artists with user info and commission config,
 * optionally filtered by active state.
 */
export async function getArtists(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query  = req.query as ListArtistsAdminQuery;
    const result = await adminService.listArtistsAdmin(query);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/artists/:id
 * Updates an artist's active state or commission configuration.
 */
export async function patchArtist(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as UpdateArtistAdminParams;
    const body   = req.body as UpdateArtistAdminBody;
    const artist = await adminService.updateArtistAdmin(id, body);
    res.json(success(artist));
  } catch (err) {
    next(err);
  }
}
