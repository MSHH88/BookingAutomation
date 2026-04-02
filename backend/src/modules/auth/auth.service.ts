/**
 * Auth service — all business logic for the authentication system.
 *
 * Responsibilities:
 *  - Password hashing (bcrypt, cost 12)
 *  - Access token signing/verification (JWT HS256, 15 min)
 *  - Refresh token lifecycle: create, rotate, revoke (opaque hex, 7 days)
 *  - Password reset token lifecycle (opaque hex, 1 hour, single-use)
 *  - User registration, login, "me", and profile update
 *
 * The controller handles HTTP concerns (cookies, request/response).
 * This module is pure business logic and can be tested without Express.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Role } from '@prisma/client';

import { prisma } from '../../lib/prisma';
import { config } from '../../config/index';
import { AppError } from '../../errors/AppError';
import { logger } from '../../utils/logger';
import type { RegisterBody, LoginBody, ResetPasswordBody, UpdateMeBody } from './auth.schema';

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;

/**
 * Pre-computed hash used when the requested email is not found in the database.
 * Running bcrypt.compare against this dummy value ensures the login endpoint
 * takes the same amount of time whether the user exists or not, preventing
 * timing-based user enumeration.
 */
const TIMING_DUMMY_HASH = bcrypt.hashSync('timing-safe-placeholder-__never-used', BCRYPT_ROUNDS);

// ─── Public types ─────────────────────────────────────────────────────────────

export interface JwtPayload {
  /** User ID (Prisma cuid) */
  sub: string;
  role: Role;
  email: string;
  iat?: number;
  exp?: number;
}

/** User object safe to return in API responses — no password hash. */
export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Tokens + safe user returned on register / login / refresh. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Converts a JWT-style duration string ("15m", "7d", "1h") to milliseconds.
 */
function parseExpiryMs(str: string): number {
  const units: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid expiry string: "${str}". Expected format: 15m, 7d, 1h, etc.`);
  }
  return parseInt(match[1], 10) * (units[match[2]] ?? 86_400_000);
}

/** Strips the password hash and returns a safe user object. */
function toSafeUser(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** Signs a short-lived JWT access token. */
function signAccessToken(user: SafeUser): string {
  const payload: JwtPayload = { sub: user.id, role: user.role, email: user.email };
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/** Persists a new refresh token in the database and returns the raw token string. */
async function createDbRefreshToken(userId: string): Promise<string> {
  // 40 random bytes → 80-character hex string; far too long to brute-force
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + parseExpiryMs(config.JWT_REFRESH_EXPIRES_IN));

  await prisma.refreshToken.create({ data: { userId, token, expiresAt } });

  return token;
}

/** Issues both tokens + returns the safe user. */
async function buildAuthTokens(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Promise<AuthTokens> {
  const safeUser = toSafeUser(user);
  const accessToken = signAccessToken(safeUser);
  const refreshToken = await createDbRefreshToken(user.id);
  return { accessToken, refreshToken, user: safeUser };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Registers a new user and returns tokens.
 * Throws 409 if the email is already registered.
 */
export async function register(input: RegisterBody): Promise<AuthTokens> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existing) {
    throw new AppError(409, 'CONFLICT', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      name: input.name.trim(),
      passwordHash,
      role: 'CUSTOMER',
    },
  });

  return buildAuthTokens(user);
}

/**
 * Validates credentials and returns tokens on success.
 * Always throws 401 for any failure to prevent user enumeration.
 */
export async function login(input: LoginBody): Promise<AuthTokens> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  // Always run bcrypt to prevent timing-based user enumeration
  const hash = user?.passwordHash ?? TIMING_DUMMY_HASH;
  const valid = await bcrypt.compare(input.password, hash);

  if (!user || !valid || !user.isActive) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  return buildAuthTokens(user);
}

/**
 * Exchanges a valid refresh token for a new access + refresh token pair.
 * The old refresh token is immediately revoked (rotation).
 */
export async function refresh(rawToken: string): Promise<AuthTokens> {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: rawToken },
    include: { user: true },
  });

  if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
    throw new AppError(401, 'INVALID_TOKEN', 'Refresh token is invalid or has expired');
  }

  if (!stored.user.isActive) {
    throw new AppError(401, 'ACCOUNT_INACTIVE', 'This account has been disabled');
  }

  // Revoke the consumed token before issuing new ones (rotation)
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return buildAuthTokens(stored.user);
}

/**
 * Revokes a refresh token (idempotent — safe to call with any token string).
 */
export async function logout(rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token: rawToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Initiates a password reset flow.
 * Always resolves without error to prevent user enumeration.
 * Invalidates any existing unused reset tokens for the user first.
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Silently resolve — same response whether email is registered or not
  if (!user || !user.isActive) return;

  // Invalidate existing pending reset tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString('hex'); // 64-char hex
  const expiresAt = new Date(Date.now() + 60 * 60 * 1_000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  // TODO (Step 1.9): queue a "password-reset" email job via BullMQ
  // The email will contain a link like:
  //   https://<FRONTEND_URL>/reset-password?token=<token>
  //
  // In development, log the token so it can be used for manual testing.
  if (config.NODE_ENV !== 'production') {
    logger.debug('[Auth] Password reset token (dev only — never logged in production)', {
      email,
      resetToken: token,
      expiresAt,
    });
  }
}

/**
 * Validates a reset token, updates the user's password, and revokes all
 * existing refresh tokens to force re-login on every device.
 */
export async function resetPassword(input: ResetPasswordBody): Promise<void> {
  const stored = await prisma.passwordResetToken.findUnique({
    where: { token: input.token },
    include: { user: true },
  });

  if (!stored || stored.usedAt !== null || stored.expiresAt < new Date()) {
    throw new AppError(400, 'INVALID_RESET_TOKEN', 'Password reset token is invalid or has expired');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // Run all mutations atomically
  await prisma.$transaction([
    // 1. Mark reset token as used (single-use enforcement)
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    // 2. Update the user's password
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash },
    }),
    // 3. Revoke all refresh tokens — force re-login on every device
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

/**
 * Returns the current user's profile (no password hash).
 */
export async function getMe(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  return toSafeUser(user);
}

/**
 * Updates the current user's name, email, and/or password.
 * Requires `currentPassword` when setting a new password.
 */
export async function updateMe(userId: string, input: UpdateMeBody): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  // Validate current password before allowing a password change
  if (input.newPassword) {
    if (!input.currentPassword) {
      throw new AppError(400, 'VALIDATION_ERROR', 'currentPassword is required to set a new password');
    }
    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
    }
  }

  // Ensure the new email isn't already taken
  if (input.email && input.email.toLowerCase() !== user.email) {
    const conflict = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (conflict) {
      throw new AppError(409, 'CONFLICT', 'This email address is already in use');
    }
  }

  const updateData: { name?: string; email?: string; passwordHash?: string } = {};
  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.email !== undefined) updateData.email = input.email.toLowerCase();
  if (input.newPassword) updateData.passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return toSafeUser(updated);
}

/**
 * Verifies a JWT access token and returns its payload.
 * Throws 401 AppError for any failure (expired, malformed, wrong secret).
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Access token is invalid or has expired');
  }
}
