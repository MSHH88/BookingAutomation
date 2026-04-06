/**
 * Capture router — Step 1.11
 *
 * | Method | Path          | Auth   | Feature Flag         | Description                    |
 * |--------|---------------|--------|----------------------|--------------------------------|
 * | POST   | /api/capture  | Public | LEAD_CAPTURE_ENABLED | Submit inquiry (all biz types) |
 *
 * This endpoint deliberately runs behind a TIGHTER rate limiter than the global
 * one (5 requests per 15 minutes per IP vs the global 100). Public form embeds
 * on customer websites must never be able to flood the leads table.
 *
 * The feature-flag gate ensures that business types with LEAD_CAPTURE_ENABLED=false
 * (e.g., restaurant deployments that take direct reservations) receive a clean 503
 * without any controller changes.
 */
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './capture.controller';
import { captureLeadSchema } from './capture.schema';

const router = Router();

// ── Capture-specific rate limiter ─────────────────────────────────────────────
// Separate from the global limiter on app.ts.
// 5 submissions per 15 minutes per IP — stops individual IPs from spamming the
// leads table while allowing legitimate burst activity (e.g., a shared office IP
// where multiple people book simultaneously).
const captureRateLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 minutes
  max:            5,               // max submissions per window per IP
  standardHeaders: 'draft-7',
  legacyHeaders:  false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      data:    null,
      meta:    null,
      error: {
        code:    'CAPTURE_RATE_LIMIT',
        message: 'Too many enquiries from this IP address. Please try again later.',
        details: null,
      },
    });
  },
});

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/capture
 * Public form-submission endpoint for all six business types.
 *
 * Middleware chain (left to right):
 *   1. captureRateLimiter  — 5 req / 15 min per IP
 *   2. requireFeature      — 503 when LEAD_CAPTURE_ENABLED is off
 *   3. validate            — Zod schema validation + sanitisation
 *   4. captureLead         — business logic (bot check, dedup, score, create)
 */
router.post(
  '/',
  captureRateLimiter,
  requireFeature('LEAD_CAPTURE_ENABLED'),
  validate(captureLeadSchema),
  ctrl.captureLead,
);

export { router as captureRoutes };
