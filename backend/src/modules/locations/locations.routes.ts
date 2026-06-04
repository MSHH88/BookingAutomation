/**
 * Locations router — Phase 9.1
 *
 * | Method | Path                   | Auth  | Feature Flag            | Description               |
 * |--------|------------------------|-------|-------------------------|---------------------------|
 * | GET    | /api/locations         | ADMIN | MULTI_LOCATION_ENABLED  | List all locations        |
 * | POST   | /api/locations         | ADMIN | MULTI_LOCATION_ENABLED  | Create a new location     |
 * | GET    | /api/locations/:id     | ADMIN | MULTI_LOCATION_ENABLED  | Get a single location     |
 * | PATCH  | /api/locations/:id     | ADMIN | MULTI_LOCATION_ENABLED  | Update a location         |
 * | DELETE | /api/locations/:id     | ADMIN | MULTI_LOCATION_ENABLED  | Delete a location         |
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl          from './locations.controller';
import {
  createLocationSchema,
  updateLocationSchema,
  locationIdSchema,
  listLocationsSchema,
} from './locations.schema';

const router = Router();

// All routes require ADMIN + feature flag
router.use(requireAuth, requireRole('ADMIN'), requireFeature('MULTI_LOCATION_ENABLED'));

/**
 * GET /api/locations
 * List all locations for this tenant.
 */
router.get(
  '/',
  validate(listLocationsSchema),
  ctrl.listLocationsHandler,
);

/**
 * POST /api/locations
 * Create a new location.
 */
router.post(
  '/',
  validate(createLocationSchema),
  ctrl.createLocationHandler,
);

/**
 * GET /api/locations/:id
 * Get a single location.
 */
router.get(
  '/:id',
  validate(locationIdSchema),
  ctrl.getLocationHandler,
);

/**
 * PATCH /api/locations/:id
 * Update an existing location.
 */
router.patch(
  '/:id',
  validate(updateLocationSchema),
  ctrl.updateLocationHandler,
);

/**
 * DELETE /api/locations/:id
 * Delete a location.
 */
router.delete(
  '/:id',
  validate(locationIdSchema),
  ctrl.deleteLocationHandler,
);

export { router as locationRoutes };
