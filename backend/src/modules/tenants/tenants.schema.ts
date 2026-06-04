/**
 * Zod schemas for the Tenants API — Phase 0
 *
 * Covers:
 *
 *   POST   /api/tenants            — create a new tenant (SUPER_ADMIN only)
 *   GET    /api/tenants            — list all tenants (SUPER_ADMIN only)
 *   GET    /api/tenants/:id        — get single tenant (SUPER_ADMIN only)
 *   PATCH  /api/tenants/:id        — update tenant details (SUPER_ADMIN only)
 *   DELETE /api/tenants/:id        — deactivate a tenant (SUPER_ADMIN only)
 */
import { z } from 'zod';

/** Valid business types — mirrors businessType.ts. */
const BUSINESS_TYPES = [
  'tattoo_studio',
  'hair_salon',
  'barber',
  'nail_salon',
  'masseuse',
  'restaurant',
] as const;

/** Valid subscription plan tiers. */
const PLANS = ['starter', 'pro', 'enterprise'] as const;

// ─── Create Tenant ────────────────────────────────────────────────────────────

/**
 * POST /api/tenants
 *
 * Creates a new tenant (business instance) on the platform.
 * The slug must be URL-safe and globally unique.
 */
export const createTenantSchema = z.object({
  body: z.object({
    /** URL-safe unique identifier (e.g. "ink-masters-london"). Used in subdomains / routing. */
    slug: z
      .string()
      .trim()
      .min(2, 'slug must be at least 2 characters')
      .max(100, 'slug must be at most 100 characters')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'slug must be lowercase, alphanumeric, and hyphen-separated',
      ),

    /** Display name of the business (e.g. "Ink Masters London"). */
    name: z.string().trim().min(1).max(200),

    /** Which type of business this deployment runs. */
    businessType: z.enum(BUSINESS_TYPES).default('tattoo_studio'),

    /** Subscription tier. */
    plan: z.enum(PLANS).default('starter'),
  }),
});

export type CreateTenantBody = z.infer<typeof createTenantSchema>['body'];

// ─── List Tenants ─────────────────────────────────────────────────────────────

/**
 * GET /api/tenants
 *
 * Paginated list of all tenants (SUPER_ADMIN only).
 */
export const listTenantsSchema = z.object({
  query: z.object({
    page:  z.string().optional(),
    limit: z.string().optional(),

    /** Filter by active state. */
    isActive: z.enum(['true', 'false']).optional(),

    /** Case-insensitive search on tenant name or slug. */
    search: z.string().trim().max(100).optional(),
  }),
});

export type ListTenantsQuery = z.infer<typeof listTenantsSchema>['query'];

// ─── Get Single Tenant ────────────────────────────────────────────────────────

export const getTenantSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

export type GetTenantParams = z.infer<typeof getTenantSchema>['params'];

// ─── Update Tenant ────────────────────────────────────────────────────────────

/**
 * PATCH /api/tenants/:id
 *
 * Updates a tenant's display name, businessType, plan, or active state.
 * At least one field is required.
 */
export const updateTenantSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z
    .object({
      /** New display name. */
      name: z.string().trim().min(1).max(200).optional(),

      /** New business type. Changes which features are default-enabled. */
      businessType: z.enum(BUSINESS_TYPES).optional(),

      /** New subscription plan. */
      plan: z.enum(PLANS).optional(),

      /** Activate or deactivate the tenant. Deactivated tenants cannot log in. */
      isActive: z.boolean().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: 'At least one field (name, businessType, plan, or isActive) must be provided',
    }),
});

export type UpdateTenantParams = z.infer<typeof updateTenantSchema>['params'];
export type UpdateTenantBody   = z.infer<typeof updateTenantSchema>['body'];

// ─── Delete (Deactivate) Tenant ───────────────────────────────────────────────

export const deleteTenantSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

export type DeleteTenantParams = z.infer<typeof deleteTenantSchema>['params'];
