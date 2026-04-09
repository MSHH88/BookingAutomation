/**
 * requireLeadAccess middleware.
 *
 * Controls access to the leads resource based on the per-user permission model
 * defined in Phase 0 (Gap #13).
 *
 * Access rules:
 *  - SUPER_ADMIN  — always allowed (cross-tenant god mode).
 *  - ADMIN        — allowed ONLY if `canViewLeads = true` (set by SUPER_ADMIN).
 *  - ARTIST / CUSTOMER — never allowed, regardless of any flag.
 *
 * The `canViewLeads` flag is embedded in the JWT at login time so no extra
 * DB round-trip is needed here.  Because access tokens have a 15-minute TTL,
 * permission changes propagate within one token refresh cycle — acceptable for
 * this type of sensitive CRM feature.
 *
 * Must be used AFTER `requireAuth` — it assumes req.user is already populated.
 *
 * Usage:
 *   router.get('/api/leads', requireAuth, requireLeadAccess, ctrl.listLeads);
 */
import { Request, Response, NextFunction } from 'express';

import { AppError } from '../errors/AppError';

export function requireLeadAccess(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  const { role, canViewLeads } = req.user;

  // SUPER_ADMIN has unrestricted access across all tenants
  if (role === 'SUPER_ADMIN') {
    next();
    return;
  }

  // ADMIN with the canViewLeads permission flag is allowed
  if (role === 'ADMIN' && canViewLeads) {
    next();
    return;
  }

  // Everyone else (ARTIST, CUSTOMER, or ADMIN without the flag) is denied
  next(
    new AppError(
      403,
      'FORBIDDEN',
      'You do not have permission to view leads. Contact your platform administrator.',
    ),
  );
}
