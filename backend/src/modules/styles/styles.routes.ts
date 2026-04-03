/**
 * Styles router — Step 1.6
 *
 * | Method | Path             | Auth  | Description                              |
 * |--------|------------------|-------|------------------------------------------|
 * | GET    | /api/styles      | Public | List active styles (filter: ?isActive)   |
 * | GET    | /api/styles/:id  | Public | Single style by ID                       |
 * | POST   | /api/styles      | ADMIN  | Create style                             |
 * | PATCH  | /api/styles/:id  | ADMIN  | Update style fields                      |
 * | DELETE | /api/styles/:id  | ADMIN  | Soft-delete style (isActive = false)     |
 *
 * Works for ALL business types. The frontend renders the correct label
 * ("Tattoo Styles", "Hair Styles", "Cuts & Styles", etc.) using the
 * LabelKey system — no separate per-type route is needed.
 */
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import * as ctrl from './styles.controller';
import {
  createStyleSchema,
  updateStyleSchema,
  deleteStyleSchema,
  getStyleByIdSchema,
  listStylesSchema,
} from './styles.schema';

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────

router.get(
  '/',
  validate(listStylesSchema),
  ctrl.listStyles,
);

router.get(
  '/:id',
  validate(getStyleByIdSchema),
  ctrl.getStyleById,
);

// ── Admin-only routes ─────────────────────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createStyleSchema),
  ctrl.createStyle,
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateStyleSchema),
  ctrl.updateStyle,
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(deleteStyleSchema),
  ctrl.deleteStyle,
);

export { router as styleRoutes };
