/**
 * Roles router — Phase 0
 *
 * Manages user roles and permission flags.
 *
 * Access model:
 *  - GET  /api/roles/users       : SUPER_ADMIN always; ADMIN with canAssignRoles.
 *  - PATCH /api/roles/users/:id  : SUPER_ADMIN always; ADMIN with canAssignRoles
 *                                  (limited to ADMIN-level roles, no permission flags).
 *
 * | Method | Path                  | Auth                         | Description                          |
 * |--------|-----------------------|------------------------------|--------------------------------------|
 * | GET    | /api/roles/users      | SUPER_ADMIN or canAssignRoles| List users with role + permissions   |
 * | PATCH  | /api/roles/users/:id  | SUPER_ADMIN or canAssignRoles| Update user role and/or permissions  |
 */
import { Router, Request, Response, NextFunction } from 'express';

import { requireAuth } from '../../middleware/auth';
import { validate }    from '../../middleware/validate';
import { AppError }    from '../../errors/AppError';
import * as ctrl from './roles.controller';
import {
  listRoleUsersSchema,
  updateUserRoleSchema,
} from './roles.schema';

const router = Router();

// ── All /api/roles routes require authentication ──────────────────────────────
router.use(requireAuth);

/**
 * Middleware: allow SUPER_ADMIN OR ADMIN with canAssignRoles.
 * Placed after requireAuth so req.user is always populated here.
 */
function requireRoleAccess(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const user = req.user!;
  if (user.role === 'SUPER_ADMIN' || (user.role === 'ADMIN' && user.canAssignRoles)) {
    next();
    return;
  }
  next(
    new AppError(
      403,
      'FORBIDDEN',
      'You need SUPER_ADMIN role or canAssignRoles permission to manage roles.',
    ),
  );
}

// ─── List users with role info ────────────────────────────────────────────────

/**
 * GET /api/roles/users
 * Returns paginated users with their role and permission flags.
 * Filtered to caller's tenant for ADMIN; unrestricted for SUPER_ADMIN.
 */
router.get(
  '/users',
  requireRoleAccess,
  validate(listRoleUsersSchema),
  ctrl.listUsers,
);

// ─── Update user role / permissions ──────────────────────────────────────────

/**
 * PATCH /api/roles/users/:id
 * Updates a user's role and/or canViewLeads/canAssignRoles flags.
 * Service layer enforces scope limits per caller role.
 */
router.patch(
  '/users/:id',
  requireRoleAccess,
  validate(updateUserRoleSchema),
  ctrl.updateUserRole,
);

export { router as rolesRoutes };
