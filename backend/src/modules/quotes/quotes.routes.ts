/**
 * Quotes router — Step 1.8
 *
 * | Method | Path                     | Auth         | Feature Flag           | Description                                        |
 * |--------|--------------------------|--------------|------------------------|----------------------------------------------------|
 * | POST   | /api/quotes              | ARTIST/ADMIN | QUOTE_SYSTEM_ENABLED   | Create DRAFT quote for a lead                      |
 * | GET    | /api/quotes              | ARTIST/ADMIN | QUOTE_SYSTEM_ENABLED   | List quotes (ARTISTs: own only; ADMIN: all)        |
 * | GET    | /api/quotes/:id          | ARTIST/ADMIN | QUOTE_SYSTEM_ENABLED   | Quote detail (ARTISTs: own only)                   |
 * | PATCH  | /api/quotes/:id          | ARTIST/ADMIN | QUOTE_SYSTEM_ENABLED   | Edit DRAFT quote                                   |
 * | PATCH  | /api/quotes/:id/send     | ARTIST/ADMIN | QUOTE_SYSTEM_ENABLED   | Send DRAFT quote → SENT + lead → QUOTED + email    |
 * | PATCH  | /api/quotes/:id/accept   | ADMIN        | QUOTE_SYSTEM_ENABLED   | Accept SENT quote → creates Booking + lead → BOOKED|
 * | PATCH  | /api/quotes/:id/reject   | ADMIN        | QUOTE_SYSTEM_ENABLED   | Reject SENT quote                                  |
 *
 * All routes are gated by QUOTE_SYSTEM_ENABLED (defaults to true for tattoo_studio,
 * false for all other business types). Disabled returns 503 Feature Disabled.
 *
 * IMPORTANT — route order:
 *   Literal sub-routes (/send, /accept, /reject) MUST be registered BEFORE /:id
 *   to prevent them being matched as the `id` parameter.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './quotes.controller';
import {
  createQuoteSchema,
  listQuotesSchema,
  getQuoteByIdSchema,
  updateQuoteSchema,
  sendQuoteSchema,
  acceptQuoteSchema,
  rejectQuoteSchema,
} from './quotes.schema';

const router = Router();

// ── All quote routes require authentication and the QUOTE_SYSTEM feature flag ──
// Applying these two middlewares at router level avoids repetition on each route.
router.use(requireAuth);
router.use(requireFeature('QUOTE_SYSTEM_ENABLED'));

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * POST /api/quotes
 * ARTIST creates a quote for a lead they are managing.
 * ADMIN creates a quote on behalf of any artist (must supply artistId in body).
 */
router.post(
  '/',
  requireRole('ARTIST'),
  validate(createQuoteSchema),
  ctrl.createQuote,
);

// ─── List / Read ──────────────────────────────────────────────────────────────

router.get(
  '/',
  requireRole('ARTIST'),
  validate(listQuotesSchema),
  ctrl.listQuotes,
);

// ─── Literal sub-routes MUST come before /:id ─────────────────────────────────

/**
 * PATCH /api/quotes/:id/send
 * Send a DRAFT quote → transitions to SENT + fires email stub.
 */
router.patch(
  '/:id/send',
  requireRole('ARTIST'),
  validate(sendQuoteSchema),
  ctrl.sendQuote,
);

/**
 * PATCH /api/quotes/:id/accept
 * ADMIN only. Accept a SENT quote → creates Booking atomically.
 * Body: { startAt, endAt, notes? }
 */
router.patch(
  '/:id/accept',
  requireRole('ADMIN'),
  validate(acceptQuoteSchema),
  ctrl.acceptQuote,
);

/**
 * PATCH /api/quotes/:id/reject
 * ADMIN only. Reject a SENT quote.
 */
router.patch(
  '/:id/reject',
  requireRole('ADMIN'),
  validate(rejectQuoteSchema),
  ctrl.rejectQuote,
);

// ─── Single resource (must come after literal sub-routes) ─────────────────────

router.get(
  '/:id',
  requireRole('ARTIST'),
  validate(getQuoteByIdSchema),
  ctrl.getQuoteById,
);

/**
 * PATCH /api/quotes/:id
 * Edit a DRAFT quote (price, hours, notes, validUntil).
 * ARTIST can only edit their own quotes; ADMIN can edit any.
 */
router.patch(
  '/:id',
  requireRole('ARTIST'),
  validate(updateQuoteSchema),
  ctrl.updateQuote,
);

export { router as quoteRoutes };
