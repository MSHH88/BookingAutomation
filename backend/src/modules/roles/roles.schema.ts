/**
 * Zod schemas for the Roles API — Phase 0
 *
 * Covers:
 *
 *   GET  /api/roles/users           — list users with role + permission info
 *   PATCH /api/roles/users/:id      — update a user's role and/or permissions
 */
import { z } from 'zod';

// ─── List Users ───────────────────────────────────────────────────────────────

/**
 * GET /api/roles/users
 *
 * Paginated list of users with their role and permission flags.
 * SUPER_ADMIN sees all users; ADMIN with canAssignRoles sees their tenant only.
 */
export const listRoleUsersSchema = z.object({
  query: z.object({
    page:     z.string().optional(),
    limit:    z.string().optional(),

    /** Filter by exact role. */
    role: z
      .enum(['SUPER_ADMIN', 'ADMIN', 'ARTIST', 'CUSTOMER'])
      .optional(),

    /** Filter by active state. */
    isActive: z.enum(['true', 'false']).optional(),

    /** Case-insensitive search across name and email. */
    search: z.string().trim().max(100).optional(),
  }),
});

export type ListRoleUsersQuery = z.infer<typeof listRoleUsersSchema>['query'];

// ─── Update User Role & Permissions ───────────────────────────────────────────

/**
 * PATCH /api/roles/users/:id
 *
 * Updates a user's role and/or permission flags.
 *
 * Permission model enforced at the service layer:
 *  - SUPER_ADMIN can set any role (including SUPER_ADMIN).
 *  - ADMIN with canAssignRoles can only set roles ≤ ADMIN (ADMIN / ARTIST / CUSTOMER).
 *  - Only SUPER_ADMIN may set canViewLeads or canAssignRoles.
 *
 * At least one field must be provided.
 */
export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z
    .object({
      /**
       * The new role to assign to the user.
       * SUPER_ADMIN assignment is only allowed from a SUPER_ADMIN caller.
       */
      role: z
        .enum(['SUPER_ADMIN', 'ADMIN', 'ARTIST', 'CUSTOMER'])
        .optional(),

      /**
       * Grants or revokes permission to view leads.
       * Only settable by SUPER_ADMIN.
       */
      canViewLeads: z.boolean().optional(),

      /**
       * Grants or revokes permission to assign roles within the tenant (up to ADMIN).
       * Only settable by SUPER_ADMIN.
       */
      canAssignRoles: z.boolean().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: 'At least one field (role, canViewLeads, or canAssignRoles) must be provided',
    }),
});

export type UpdateUserRoleParams = z.infer<typeof updateUserRoleSchema>['params'];
export type UpdateUserRoleBody   = z.infer<typeof updateUserRoleSchema>['body'];
