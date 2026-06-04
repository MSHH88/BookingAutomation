/**
 * Locations controller — Phase 9.1
 *
 * HTTP handlers for location management.
 */
import { Request, Response, NextFunction } from 'express';
import * as svc from './locations.service';
import { success, paginated } from '../../utils/apiResponse';
import { extractTenantId } from '../../utils/extractTenantId';
import type {
  CreateLocationBody,
  UpdateLocationBody,
  LocationIdParams,
  ListLocationsQuery,
} from './locations.schema';

// ─── listLocations ────────────────────────────────────────────────────────────

export async function listLocationsHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query    = req.query as unknown as ListLocationsQuery;
    const isActive = query.isActive === 'true'
      ? true
      : query.isActive === 'false'
        ? false
        : undefined;

    const result = await svc.listLocations(extractTenantId(req), isActive, query.page, query.limit);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

// ─── getLocation ──────────────────────────────────────────────────────────────

export async function getLocationHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as LocationIdParams;
    const location = await svc.getLocationById(extractTenantId(req), id);
    res.json(success(location));
  } catch (err) {
    next(err);
  }
}

// ─── createLocation ───────────────────────────────────────────────────────────

export async function createLocationHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as unknown as CreateLocationBody;
    const location = await svc.createLocation(extractTenantId(req), body);
    res.status(201).json(success(location));
  } catch (err) {
    next(err);
  }
}

// ─── updateLocation ───────────────────────────────────────────────────────────

export async function updateLocationHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as LocationIdParams;
    const body   = req.body  as unknown as UpdateLocationBody;
    const location = await svc.updateLocation(extractTenantId(req), id, body);
    res.json(success(location));
  } catch (err) {
    next(err);
  }
}

// ─── deleteLocation ───────────────────────────────────────────────────────────

export async function deleteLocationHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as LocationIdParams;
    await svc.deleteLocation(extractTenantId(req), id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
