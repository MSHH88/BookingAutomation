/**
 * Roles controller — Phase 0
 *
 * HTTP handlers for /api/roles endpoints.
 * Business logic lives in roles.service.ts.
 */
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

import { success, paginated } from '../../utils/apiResponse';
import * as svc from './roles.service';
import type {
  ListRoleUsersQuery,
  UpdateUserRoleParams,
  UpdateUserRoleBody,
} from './roles.schema';

/**
 * GET /api/roles/users
 * Paginated list of users with role and permission info.
 */
export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await svc.listUsers(
      req.query as unknown as ListRoleUsersQuery,
      req.user!.role as Role,
      req.user!.tenantId,
    );
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/roles/users/:id
 * Update a user's role and/or permission flags.
 */
export async function updateUserRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as UpdateUserRoleParams;
    const user = await svc.updateUserRole(
      id,
      req.body as UpdateUserRoleBody,
      req.user!.role as Role,
      req.user!.tenantId,
    );
    res.json(success(user));
  } catch (err) {
    next(err);
  }
}
