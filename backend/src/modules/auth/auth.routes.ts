/**
 * Auth routes — all /api/auth/* endpoints.
 *
 * Public endpoints:   register, login, refresh, forgot-password, reset-password
 * Protected endpoints: logout, GET /me, PATCH /me  (require valid access token)
 *
 * Separate rate limiters are applied to mutation endpoints to limit abuse:
 *  - auth limiter: 10 requests per 15 min per IP (register / login / refresh)
 *  - reset limiter: 5 requests per 60 min per IP (forgot / reset password)
 */
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { error as apiError } from '../../utils/apiResponse';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateMeSchema,
} from './auth.schema';
import * as ctrl from './auth.controller';

const router = Router();

// ─── Rate limiters ────────────────────────────────────────────────────────────

/** Tighter rate limit for credential-submission endpoints. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000, // 15 minutes
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(
      apiError('RATE_LIMIT_EXCEEDED', 'Too many requests — please try again later.'),
    );
  },
});

/** Very conservative limit for password reset flows. */
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1_000, // 60 minutes
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(
      apiError('RATE_LIMIT_EXCEEDED', 'Too many password reset attempts — please try again later.'),
    );
  },
});

// ─── Public routes ────────────────────────────────────────────────────────────

/** POST /api/auth/register — create account, return tokens */
router.post('/register', authLimiter, validate(registerSchema), ctrl.register);

/** POST /api/auth/login — verify credentials, return tokens */
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);

/** POST /api/auth/refresh — exchange refresh token for new token pair */
router.post('/refresh', authLimiter, validate(refreshSchema), ctrl.refreshToken);

/** POST /api/auth/forgot-password — generate reset token and enqueue password reset email */
router.post('/forgot-password', resetLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);

/** POST /api/auth/reset-password — validate token, set new password */
router.post('/reset-password', resetLimiter, validate(resetPasswordSchema), ctrl.resetPassword);

// ─── Protected routes (require valid access token) ────────────────────────────

/** POST /api/auth/logout — revoke refresh token, clear cookie */
router.post('/logout', requireAuth, ctrl.logout);

/** GET /api/auth/me — return current user profile */
router.get('/me', requireAuth, ctrl.getMe);

/** PATCH /api/auth/me — update own name, email, or password */
router.patch('/me', requireAuth, validate(updateMeSchema), ctrl.updateMe);

export { router as authRoutes };
