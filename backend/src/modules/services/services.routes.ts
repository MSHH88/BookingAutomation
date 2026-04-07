/**
 * Services router — Step 1.13
 *
 * | Method | Path                              | Auth         | Feature Flag        | Description                              |
 * |--------|-----------------------------------|--------------|---------------------|------------------------------------------|
 * | GET    | /api/services/categories          | PUBLIC       | SERVICE_MENU_ENABLED| List service categories                  |
 * | POST   | /api/services/categories          | ADMIN        | SERVICE_MENU_ENABLED| Create a service category                |
 * | PATCH  | /api/services/categories/:id      | ADMIN        | SERVICE_MENU_ENABLED| Update a service category                |
 * | DELETE | /api/services/categories/:id      | ADMIN        | SERVICE_MENU_ENABLED| Delete a service category                |
 * | GET    | /api/services                     | PUBLIC       | SERVICE_MENU_ENABLED| List services (paginated + filtered)     |
 * | POST   | /api/services                     | ADMIN        | SERVICE_MENU_ENABLED| Create a service                         |
 * | GET    | /api/services/:id                 | PUBLIC       | SERVICE_MENU_ENABLED| Get a single service (with artist roster)|
 * | PATCH  | /api/services/:id                 | ADMIN        | SERVICE_MENU_ENABLED| Update a service                         |
 * | DELETE | /api/services/:id                 | ADMIN        | SERVICE_MENU_ENABLED| Deactivate a service                     |
 * | POST   | /api/services/:id/link            | ARTIST/ADMIN | SERVICE_MENU_ENABLED| Link an artist to a service              |
 * | DELETE | /api/services/:id/link            | ARTIST/ADMIN | SERVICE_MENU_ENABLED| Unlink an artist from a service          |
 *
 * Route ordering:
 *   /categories/* and /:id/link are registered BEFORE /:id routes to ensure
 *   they are not mistakenly captured by the parameterised /:id handler.
 *
 * Auth notes:
 *   - GET /categories, GET /, GET /:id are PUBLIC — no requireAuth.
 *   - POST/PATCH/DELETE on categories and services require ADMIN.
 *   - POST/DELETE /:id/link require at least ARTIST role.
 *   - All routes are gated by the SERVICE_MENU_ENABLED feature flag.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './services.controller';
import {
  listCategoriesSchema,
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  listServicesSchema,
  getServiceSchema,
  createServiceSchema,
  updateServiceSchema,
  deleteServiceSchema,
  linkServiceSchema,
  unlinkServiceSchema,
} from './services.schema';

const router = Router();

// ── Feature flag gate (applied to every route in this router) ─────────────────
router.use(requireFeature('SERVICE_MENU_ENABLED'));

// ─── Category routes ──────────────────────────────────────────────────────────

/**
 * GET /api/services/categories
 *
 * Public — returns the list of service categories sorted by sortOrder.
 * Powers category filter menus on the booking widget.
 */
router.get(
  '/categories',
  validate(listCategoriesSchema),
  ctrl.listCategories,
);

/**
 * POST /api/services/categories
 *
 * Creates a new service category (ADMIN only).
 */
router.post(
  '/categories',
  requireAuth,
  requireRole('ADMIN'),
  validate(createCategorySchema),
  ctrl.createCategory,
);

/**
 * PATCH /api/services/categories/:id
 *
 * Partially updates a service category (ADMIN only).
 */
router.patch(
  '/categories/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateCategorySchema),
  ctrl.updateCategory,
);

/**
 * DELETE /api/services/categories/:id
 *
 * Deletes a service category (ADMIN only).
 * Returns 409 if the category still contains services.
 */
router.delete(
  '/categories/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(deleteCategorySchema),
  ctrl.deleteCategory,
);

// ─── Service list + create (no :id param) ────────────────────────────────────

/**
 * GET /api/services
 *
 * Public — returns paginated service list.
 * Supports filters: categoryId, artistId, isActive, search.
 */
router.get(
  '/',
  validate(listServicesSchema),
  ctrl.listServices,
);

/**
 * POST /api/services
 *
 * Creates a new service (ADMIN only).
 */
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createServiceSchema),
  ctrl.createService,
);

// ─── Artist-service link routes (must come BEFORE /:id to avoid collision) ───

/**
 * POST /api/services/:id/link
 *
 * ARTIST: links their own profile to this service.
 * ADMIN:  requires artistId in the request body.
 */
router.post(
  '/:id/link',
  requireAuth,
  requireRole('ARTIST'),
  validate(linkServiceSchema),
  ctrl.linkService,
);

/**
 * DELETE /api/services/:id/link
 *
 * ARTIST: unlinks their own profile from this service.
 * ADMIN:  requires artistId in the request body.
 */
router.delete(
  '/:id/link',
  requireAuth,
  requireRole('ARTIST'),
  validate(unlinkServiceSchema),
  ctrl.unlinkService,
);

// ─── Single service routes ────────────────────────────────────────────────────

/**
 * GET /api/services/:id
 *
 * Public — returns a single service with full artist roster.
 */
router.get(
  '/:id',
  validate(getServiceSchema),
  ctrl.getService,
);

/**
 * PATCH /api/services/:id
 *
 * Partially updates a service (ADMIN only).
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateServiceSchema),
  ctrl.updateService,
);

/**
 * DELETE /api/services/:id
 *
 * Deactivates a service (soft-delete, ADMIN only).
 * Returns 409 if the service has active bookings.
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(deleteServiceSchema),
  ctrl.deleteService,
);

export { router as serviceRoutes };
