/**
 * Availability router — Step 1.12
 *
 * | Method | Path                           | Auth         | Feature Flag    | Description                                      |
 * |--------|-------------------------------|--------------|-----------------|--------------------------------------------------|
 * | GET    | /api/availability             | ARTIST/ADMIN | BOOKING_ENABLED | List artist weekly schedule                      |
 * | PUT    | /api/availability             | ARTIST/ADMIN | BOOKING_ENABLED | Full-replace upsert of weekly schedule           |
 * | GET    | /api/availability/blocks      | ARTIST/ADMIN | BOOKING_ENABLED | List availability blocks (paginated)             |
 * | POST   | /api/availability/blocks      | ARTIST/ADMIN | BOOKING_ENABLED | Create an availability block                     |
 * | DELETE | /api/availability/blocks/:id  | ARTIST/ADMIN | BOOKING_ENABLED | Delete an availability block                     |
 * | GET    | /api/availability/slots       | PUBLIC       | BOOKING_ENABLED | Compute available booking slots for a date       |
 *
 * Auth notes:
 *   - GET /slots is PUBLIC — no requireAuth or requireRole middleware.
 *   - All other routes require a valid JWT + ARTIST or ADMIN role.
 *   - All routes are gated by the BOOKING_ENABLED feature flag.
 *
 * Route ordering:
 *   /blocks and /slots are registered BEFORE the root / route to prevent
 *   them being swallowed by any future wildcard or parameterised sub-path.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './availability.controller';
import {
  listScheduleSchema,
  upsertScheduleSchema,
  listBlocksSchema,
  createBlockSchema,
  deleteBlockSchema,
  getSlotsSchema,
} from './availability.schema';

const router = Router();

// ── Feature flag gate (all routes) ────────────────────────────────────────────
router.use(requireFeature('BOOKING_ENABLED'));

// ─── Public slot computation (no auth required) ────────────────────────────────

/**
 * GET /api/availability/slots
 *
 * Returns available booking slots for a given artist + date.
 * Used by the public booking widget.
 */
router.get(
  '/slots',
  validate(getSlotsSchema),
  ctrl.getAvailableSlots,
);

// ─── Block routes (auth required, ARTIST/ADMIN) ────────────────────────────────

/**
 * GET /api/availability/blocks
 *
 * Returns paginated availability blocks.
 * ARTIST sees own; ADMIN supplies ?artistId=<id>.
 */
router.get(
  '/blocks',
  requireAuth,
  requireRole('ARTIST'),
  validate(listBlocksSchema),
  ctrl.listBlocks,
);

/**
 * POST /api/availability/blocks
 *
 * Creates a new availability block (holiday, early close, vacation, etc.).
 */
router.post(
  '/blocks',
  requireAuth,
  requireRole('ARTIST'),
  validate(createBlockSchema),
  ctrl.createBlock,
);

/**
 * DELETE /api/availability/blocks/:id
 *
 * Deletes an availability block.
 * ARTIST: own blocks only. ADMIN: any block.
 */
router.delete(
  '/blocks/:id',
  requireAuth,
  requireRole('ARTIST'),
  validate(deleteBlockSchema),
  ctrl.deleteBlock,
);

// ─── Weekly schedule routes (auth required, ARTIST/ADMIN) ─────────────────────

/**
 * GET /api/availability
 *
 * Returns the weekly recurring schedule for an artist.
 */
router.get(
  '/',
  requireAuth,
  requireRole('ARTIST'),
  validate(listScheduleSchema),
  ctrl.listSchedule,
);

/**
 * PUT /api/availability
 *
 * Full-replace upsert of an artist's weekly schedule.
 * Accepts up to 7 day entries; replaces all existing schedule rows atomically.
 */
router.put(
  '/',
  requireAuth,
  requireRole('ARTIST'),
  validate(upsertScheduleSchema),
  ctrl.upsertSchedule,
);

export { router as availabilityRoutes };
