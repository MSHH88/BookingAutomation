/**
 * requireRole middleware factory.
 *
 * Enforces role-based access control using a hierarchy:
 *   SUPER_ADMIN (5) > ADMIN (3) > ARTIST (2) > CUSTOMER (1)
 *
 * `requireRole('ARTIST')` passes for ARTIST, ADMIN, and SUPER_ADMIN.
 * `requireRole('ADMIN')` passes for ADMIN and SUPER_ADMIN only.
 * `requireRole('SUPER_ADMIN')` passes for SUPER_ADMIN only.
 *
 * Must be used AFTER `requireAuth` — it assumes req.user is already populated.
 *
 * Usage:
 *   router.post('/artists',  requireAuth, requireRole('ADMIN'),       ctrl.create);
 *   router.get('/leads',     requireAuth, requireRole('ARTIST'),      ctrl.list);
 *   router.patch('/tenants', requireAuth, requireRole('SUPER_ADMIN'), ctrl.patch);
 */
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

import { AppError } from '../errors/AppError';

/** Numeric level for each role — higher = more permissions. */
const ROLE_LEVEL: Record<Role, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 3,
  ARTIST: 2,
  CUSTOMER: 1,
};

/**
 * Returns a middleware that allows requests whose user role is ≥ minimumRole
 * in the hierarchy.
 */
export function requireRole(minimumRole: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }

    if (ROLE_LEVEL[req.user.role as Role] < ROLE_LEVEL[minimumRole]) {
      next(
        new AppError(
          403,
          'FORBIDDEN',
          `This action requires at least ${minimumRole} role`,
        ),
      );
      return;
    }

    next();
  };
}
