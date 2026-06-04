/**
 * Tables router — Step 1.24
 *
 * All routes are gated by the TABLE_SELECTION_ENABLED feature flag.
 * Restaurant-type deployments set this flag to true.
 *
 * | Method | Path                       | Auth   | Description                                     |
 * |--------|----------------------------|--------|-------------------------------------------------|
 * | GET    | /api/tables                | Public | List active tables                              |
 * | GET    | /api/tables/availability   | Public | Tables available for ?date=&time=&partySize=    |
 * | POST   | /api/tables                | ADMIN  | Create a new table                              |
 * | PATCH  | /api/tables/:id            | ADMIN  | Update a table (partial)                        |
 * | DELETE | /api/tables/:id            | ADMIN  | Soft-delete a table                             |
 *
 * Route ordering notes:
 *   /availability must be registered BEFORE /:id to prevent Express treating
 *   "availability" as an :id parameter.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './tables.controller';
import {
  listTablesSchema,
  listTableAvailabilitySchema,
  createTableSchema,
  updateTableSchema,
  deleteTableSchema,
} from './tables.schema';

const router = Router();

// ── Feature flag gate (applied to every route in this router) ─────────────────
router.use(requireFeature('TABLE_SELECTION_ENABLED'));

// ─── Public routes ────────────────────────────────────────────────────────────

/**
 * GET /api/tables
 *
 * Public — list tables. Defaults to isActive=true.
 * Admins can pass ?isActive=false to include deactivated tables.
 */
router.get(
  '/',
  validate(listTablesSchema),
  ctrl.listTables,
);

/**
 * GET /api/tables/availability
 *
 * Public — returns tables available for a given date, time, and party size.
 * Required: date (YYYY-MM-DD), time (HH:MM), partySize.
 * Optional: durationMinutes (default 120).
 *
 * IMPORTANT: registered before /:id to avoid routing collision.
 */
router.get(
  '/availability',
  validate(listTableAvailabilitySchema),
  ctrl.getTableAvailability,
);

// ─── ADMIN routes ─────────────────────────────────────────────────────────────

/**
 * POST /api/tables
 *
 * Creates a new table (ADMIN only).
 */
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createTableSchema),
  ctrl.createTable,
);

/**
 * PATCH /api/tables/:id
 *
 * Partially updates a table (ADMIN only).
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateTableSchema),
  ctrl.updateTable,
);

/**
 * DELETE /api/tables/:id
 *
 * Soft-deletes a table (isActive = false, ADMIN only).
 * Returns 409 if the table has active bookings.
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(deleteTableSchema),
  ctrl.deleteTable,
);

export { router as tableRoutes };
