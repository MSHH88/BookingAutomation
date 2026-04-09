/**
 * requireAuth middleware.
 *
 * Reads the `Authorization: Bearer <token>` header, verifies the JWT,
 * and attaches the decoded payload to `req.user`.
 *
 * On success: calls next() — downstream handlers can access req.user safely.
 * On failure: passes an AppError(401) to next() → caught by errorHandler.
 */
import { Request, Response, NextFunction } from 'express';

import { verifyAccessToken } from '../modules/auth/auth.service';
import { AppError } from '../errors/AppError';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header'));
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id:            payload.sub,
      email:         payload.email,
      role:          payload.role,
      tenantId:      payload.tenantId ?? null,
      canViewLeads:  payload.canViewLeads ?? false,
      canAssignRoles: payload.canAssignRoles ?? false,
    };
    next();
  } catch (err) {
    // verifyAccessToken already throws a typed AppError — pass it along
    next(err);
  }
}
