/**
 * Packages module — Zod validation schemas — Phase 5.1
 *
 * Endpoints:
 *   POST /api/packages                   — create a package (ADMIN)
 *   GET  /api/packages                   — list packages (ADMIN)
 *   GET  /api/packages/:id               — get single package (ADMIN)
 *   PUT  /api/packages/:id               — update package (ADMIN)
 *   DELETE /api/packages/:id             — soft-delete package (ADMIN)
 *   POST /api/packages/:id/purchase      — customer purchases a package (ADMIN)
 *   GET  /api/customers/:customerId/packages — list customer's packages (ADMIN)
 *   GET  /api/me/packages                — customer's own packages (customer portal)
 */
import { z } from 'zod';

// ─── Included service entry ───────────────────────────────────────────────────

const includedServiceSchema = z.object({
  serviceId: z.string().min(1, 'serviceId is required'),
  quantity:  z.number().int().min(1, 'quantity must be at least 1'),
});

// ─── POST /api/packages ───────────────────────────────────────────────────────

export const createPackageSchema = z.object({
  body: z.object({
    name:             z.string().min(1, 'name is required'),
    description:      z.string().optional(),
    price:            z.number().positive('price must be positive'),
    includedServices: z.array(includedServiceSchema).min(1, 'at least one service is required'),
    totalUses:        z.number().int().min(1).optional().default(1),
    expiryDays:       z.number().int().min(1).optional(),
    isActive:         z.boolean().optional().default(true),
  }),
});

export type CreatePackageBody = z.infer<typeof createPackageSchema>['body'];

// ─── PUT /api/packages/:id ────────────────────────────────────────────────────

export const updatePackageSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    name:             z.string().min(1).optional(),
    description:      z.string().optional(),
    price:            z.number().positive().optional(),
    includedServices: z.array(includedServiceSchema).min(1).optional(),
    totalUses:        z.number().int().min(1).optional(),
    expiryDays:       z.number().int().min(1).nullable().optional(),
    isActive:         z.boolean().optional(),
  }),
});

export type UpdatePackageBody = z.infer<typeof updatePackageSchema>['body'];

// ─── GET /api/packages ────────────────────────────────────────────────────────

export const listPackagesSchema = z.object({
  query: z.object({
    page:     z.coerce.number().int().min(1).optional().default(1),
    limit:    z.coerce.number().int().min(1).max(100).optional().default(20),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export type ListPackagesQuery = z.infer<typeof listPackagesSchema>['query'];

// ─── GET/DELETE /api/packages/:id ────────────────────────────────────────────

export const packageIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── POST /api/packages/:id/purchase ─────────────────────────────────────────

export const purchasePackageSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    customerId: z.string().min(1, 'customerId is required'),
  }),
});

export type PurchasePackageBody = z.infer<typeof purchasePackageSchema>['body'];

// ─── GET /api/customers/:customerId/packages ──────────────────────────────────

export const listCustomerPackagesSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'customerId is required'),
  }),
  query: z.object({
    page:  z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export type ListCustomerPackagesQuery = z.infer<typeof listCustomerPackagesSchema>['query'];
