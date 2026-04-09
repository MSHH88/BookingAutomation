/**
 * Roles service — Phase 0
 *
 * Business logic for the /api/roles endpoints.
 *
 * Security contract:
 *  - listUsers:      SUPER_ADMIN sees all; ADMIN with canAssignRoles sees their tenant.
 *  - updateUserRole: Enforces role-elevation limits per caller's own role.
 *    - SUPER_ADMIN can set any role and any permission flag.
 *    - ADMIN with canAssignRoles can only set roles ≤ ADMIN (cannot set
 *      canViewLeads or canAssignRoles — those are SUPER_ADMIN-only flags).
 *
 * Endpoints covered:
 *   listUsers       — paginated user list with role/permission info
 *   updateUserRole  — update role and/or permission flags for a single user
 *
 * Total: 14 tests (see roles.service.test.ts)
 */
import { Prisma, Role } from '@prisma/client';

import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import type {
  ListRoleUsersQuery,
  UpdateUserRoleBody,
} from './roles.schema';

// ─── Prisma select shape ──────────────────────────────────────────────────────

/** User fields returned by all roles endpoints. */
const roleUserSelect = {
  id:             true,
  email:          true,
  name:           true,
  phone:          true,
  role:           true,
  tenantId:       true,
  canViewLeads:   true,
  canAssignRoles: true,
  isActive:       true,
  createdAt:      true,
  updatedAt:      true,
} satisfies Prisma.UserSelect;

type RoleUserResult = Prisma.UserGetPayload<{ select: typeof roleUserSelect }>;

// ─── Caller role helpers ──────────────────────────────────────────────────────

/** Numeric role level — mirrors requireRole.ts hierarchy. */
const ROLE_LEVEL: Record<Role, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 3,
  ARTIST: 2,
  CUSTOMER: 1,
};

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Returns a paginated list of users with their role and permission info.
 *
 * Scoping rules:
 *  - SUPER_ADMIN: no tenant filter — sees all users across all tenants.
 *  - ADMIN with canAssignRoles: scoped to their own tenantId.
 */
export async function listUsers(
  query:       ListRoleUsersQuery,
  callerRole:  Role,
  callerTenantId: string | null,
): Promise<PaginatedResult<RoleUserResult>> {
  const where: Prisma.UserWhereInput = {};

  // Tenant scoping — SUPER_ADMIN sees all; others are restricted to their tenant
  if (callerRole !== 'SUPER_ADMIN') {
    where.tenantId = callerTenantId ?? undefined;
  }

  if (query.role) {
    where.role = query.role as Role;
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true';
  }

  if (query.search) {
    where.OR = [
      { name:  { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return paginate(
    prisma.user,
    {
      where,
      select:  roleUserSelect,
      orderBy: { createdAt: 'desc' },
    },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Updates a user's role and/or permission flags.
 *
 * Enforcement rules:
 *  1. The target user must exist.
 *  2. ADMIN with canAssignRoles:
 *     - Can only update users within their own tenant.
 *     - Cannot assign roles higher than ADMIN (no SUPER_ADMIN promotion).
 *     - Cannot set canViewLeads or canAssignRoles (SUPER_ADMIN privilege).
 *  3. SUPER_ADMIN: unrestricted — can set any role and any permission flag.
 *
 * @throws AppError 404 — target user not found.
 * @throws AppError 403 — caller lacks permission for the requested change.
 */
export async function updateUserRole(
  targetId:       string,
  body:           UpdateUserRoleBody,
  callerRole:     Role,
  callerTenantId: string | null,
): Promise<RoleUserResult> {
  const target = await prisma.user.findUnique({
    where:  { id: targetId },
    select: { ...roleUserSelect, tenantId: true },
  });

  if (!target) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  // ── ADMIN with canAssignRoles: limited permission scope ───────────────────

  if (callerRole !== 'SUPER_ADMIN') {
    // Ensure the target is in the same tenant
    if (target.tenantId !== callerTenantId) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You can only manage users within your own business.',
      );
    }

    // Cannot promote to SUPER_ADMIN
    if (body.role && ROLE_LEVEL[body.role as Role] > ROLE_LEVEL['ADMIN']) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You cannot assign the SUPER_ADMIN role. Contact your platform administrator.',
      );
    }

    // Cannot set permission flags — SUPER_ADMIN privilege only
    if (body.canViewLeads !== undefined || body.canAssignRoles !== undefined) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Only SUPER_ADMIN can modify canViewLeads and canAssignRoles permissions.',
      );
    }
  }

  // ── Build the update payload ──────────────────────────────────────────────

  const data: Prisma.UserUpdateInput = {};
  if (body.role           !== undefined) data.role           = body.role as Role;
  if (body.canViewLeads   !== undefined) data.canViewLeads   = body.canViewLeads;
  if (body.canAssignRoles !== undefined) data.canAssignRoles = body.canAssignRoles;

  return prisma.user.update({
    where:  { id: targetId },
    data,
    select: roleUserSelect,
  });
}
