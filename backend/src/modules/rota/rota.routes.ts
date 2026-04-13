/**
 * Rota router — Phase 6.1
 *
 * | Method | Path                          | Auth  | Description                          |
 * |--------|-------------------------------|-------|--------------------------------------|
 * | GET    | /api/rota/week                | ADMIN | Weekly rota grid for all artists     |
 * | GET    | /api/rota/shifts              | ADMIN | List shifts (optionally by artist)   |
 * | POST   | /api/rota/shifts              | ADMIN | Create a new shift                   |
 * | GET    | /api/rota/shifts/:id          | ADMIN | Get a shift with overrides           |
 * | PATCH  | /api/rota/shifts/:id          | ADMIN | Update a shift                       |
 * | DELETE | /api/rota/shifts/:id          | ADMIN | Delete a shift                       |
 * | POST   | /api/rota/shifts/:id/override | ADMIN | Create / replace a one-off override  |
 *
 * All routes require ADMIN role and ROTA_ENABLED feature flag.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './rota.controller';
import {
  weekRotaQuerySchema,
  listShiftsQuerySchema,
  createShiftSchema,
  shiftIdParamSchema,
  updateShiftSchema,
  createOverrideSchema,
} from './rota.schema';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'), requireFeature('ROTA_ENABLED'));

// ── Weekly rota grid ──────────────────────────────────────────────────────────

router.get(
  '/week',
  validate(weekRotaQuerySchema),
  ctrl.getWeekRota,
);

// ── Shift CRUD ────────────────────────────────────────────────────────────────

router.get(
  '/shifts',
  validate(listShiftsQuerySchema),
  ctrl.listShifts,
);

router.post(
  '/shifts',
  validate(createShiftSchema),
  ctrl.createShift,
);

// ── Override (must come BEFORE /:id routes to avoid slug collision) ───────────

router.post(
  '/shifts/:id/override',
  validate(createOverrideSchema),
  ctrl.createOverride,
);

// ── Single shift ──────────────────────────────────────────────────────────────

router.get(
  '/shifts/:id',
  validate(shiftIdParamSchema),
  ctrl.getShift,
);

router.patch(
  '/shifts/:id',
  validate(updateShiftSchema),
  ctrl.updateShift,
);

router.delete(
  '/shifts/:id',
  validate(shiftIdParamSchema),
  ctrl.deleteShift,
);

export { router as rotaRoutes };
