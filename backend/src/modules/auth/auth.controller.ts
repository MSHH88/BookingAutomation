/**
 * Auth controllers — one handler per auth endpoint.
 *
 * HTTP concerns only: parse request, call service, set cookies, send response.
 * All business logic lives in auth.service.ts.
 *
 * Refresh token cookie strategy:
 *  - SET: httpOnly, Secure (prod), SameSite=Strict, 7-day maxAge
 *  - READ: cookie-parser populates req.cookies; body field is the fallback
 *          for non-browser clients (mobile, API consumers)
 *  - CLEAR: on logout, the cookie is cleared regardless of token validity
 */
import { Request, Response, NextFunction } from 'express';

import { config } from '../../config/index';
import * as authService from './auth.service';
import { success, error as apiError } from '../../utils/apiResponse';
import type {
  RegisterBody,
  LoginBody,
  ForgotPasswordBody,
  ResetPasswordBody,
  UpdateMeBody,
} from './auth.schema';

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000; // 7 days

function setCookieOptions() {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: '/',
  };
}

/**
 * Reads the refresh token from the httpOnly cookie first,
 * then falls back to the request body for non-browser clients.
 */
function extractRefreshToken(req: Request): string | undefined {
  const fromCookie =
    typeof req.cookies?.[REFRESH_COOKIE] === 'string'
      ? (req.cookies[REFRESH_COOKIE] as string)
      : undefined;

  const fromBody =
    typeof req.body?.refreshToken === 'string'
      ? (req.body.refreshToken as string)
      : undefined;

  return fromCookie ?? fromBody;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates a new CUSTOMER account and returns tokens.
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as RegisterBody;
    const tokens = await authService.register(body);

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, setCookieOptions());
    res.status(201).json(
      success({ accessToken: tokens.accessToken, user: tokens.user }),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Verifies credentials and returns tokens.
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as LoginBody;
    const tokens = await authService.login(body);

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, setCookieOptions());
    res.json(success({ accessToken: tokens.accessToken, user: tokens.user }));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Exchanges a valid refresh token for a new access + refresh token pair.
 * Accepts the token from the httpOnly cookie or the request body.
 */
export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawToken = extractRefreshToken(req);

    if (!rawToken) {
      res.status(401).json(
        apiError('INVALID_TOKEN', 'No refresh token provided'),
      );
      return;
    }

    const tokens = await authService.refresh(rawToken);

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, setCookieOptions());
    res.json(success({ accessToken: tokens.accessToken, user: tokens.user }));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Revokes the refresh token and clears the cookie.
 * Always returns 204 — idempotent.
 */
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawToken = extractRefreshToken(req);
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (rawToken) {
      await authService.logout(rawToken, accessToken);
    }

    // Clear the cookie regardless of token validity
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 * Generates a password reset token and enqueues a password reset email via BullMQ.
 * Always returns 200 — no user enumeration.
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as ForgotPasswordBody;
    await authService.forgotPassword(body.email);

    // Same response whether the email is registered or not
    res.json(
      success({
        message: 'If that email is registered, a password reset link has been sent.',
      }),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * Validates the reset token and sets a new password.
 */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as ResetPasswordBody;
    await authService.resetPassword(body);
    res.json(success({ message: 'Password has been reset successfully. Please log in.' }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // req.user is guaranteed by requireAuth middleware
    const user = await authService.getMe(req.user!.id);
    res.json(success(user));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/auth/me
 * Updates the authenticated user's name, email, and/or password.
 */
export async function updateMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as UpdateMeBody;
    const user = await authService.updateMe(req.user!.id, body);
    res.json(success(user));
  } catch (err) {
    next(err);
  }
}
