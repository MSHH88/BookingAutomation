/**
 * Memberships module — Zod validation schemas — Phase 5.2
 *
 * Endpoints:
 *   POST   /api/memberships                          — create membership plan (ADMIN)
 *   GET    /api/memberships                          — list plans (ADMIN)
 *   GET    /api/memberships/:id                      — get single plan (ADMIN)
 *   PUT    /api/memberships/:id                      — update plan (ADMIN)
 *   DELETE /api/memberships/:id                      — soft-delete plan (ADMIN)
 *   POST   /api/memberships/:id/subscribe            — subscribe customer (ADMIN)
 *   DELETE /api/memberships/subscriptions/:subId     — cancel subscription (ADMIN)
 *   GET    /api/customers/:customerId/memberships    — list customer memberships (ADMIN)
 *   GET    /api/me/memberships                       — customer's own memberships
 */
import { z } from 'zod';

// ─── POST /api/memberships ────────────────────────────────────────────────────

export const createMembershipSchema = z.object({
  body: z.object({
    name:             z.string().min(1, 'name is required'),
    price:            z.number().positive('price must be positive'),
    billingInterval:  z.enum(['MONTHLY', 'ANNUAL']).optional().default('MONTHLY'),
    includedServices: z.array(z.string().min(1)).default([]), // empty = all services
    usageLimit:       z.number().int().min(1).optional(),     // null = unlimited
    isActive:         z.boolean().optional().default(true),
  }),
});

export type CreateMembershipBody = z.infer<typeof createMembershipSchema>['body'];

// ─── PUT /api/memberships/:id ─────────────────────────────────────────────────

export const updateMembershipSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    name:             z.string().min(1).optional(),
    price:            z.number().positive().optional(),
    billingInterval:  z.enum(['MONTHLY', 'ANNUAL']).optional(),
    includedServices: z.array(z.string().min(1)).optional(),
    usageLimit:       z.number().int().min(1).nullable().optional(),
    isActive:         z.boolean().optional(),
  }),
});

export type UpdateMembershipBody = z.infer<typeof updateMembershipSchema>['body'];

// ─── GET /api/memberships ─────────────────────────────────────────────────────

export const listMembershipsSchema = z.object({
  query: z.object({
    page:     z.coerce.number().int().min(1).optional().default(1),
    limit:    z.coerce.number().int().min(1).max(100).optional().default(20),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export type ListMembershipsQuery = z.infer<typeof listMembershipsSchema>['query'];

// ─── ID param ─────────────────────────────────────────────────────────────────

export const membershipIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── POST /api/memberships/:id/subscribe ─────────────────────────────────────

export const subscribeSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    customerId: z.string().min(1, 'customerId is required'),
  }),
});

export type SubscribeBody = z.infer<typeof subscribeSchema>['body'];

// ─── DELETE /api/memberships/subscriptions/:subId ────────────────────────────

export const cancelSubscriptionSchema = z.object({
  params: z.object({
    subId: z.string().min(1, 'subId is required'),
  }),
});

// ─── GET /api/customers/:customerId/memberships ───────────────────────────────

export const listCustomerMembershipsSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'customerId is required'),
  }),
  query: z.object({
    page:  z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export type ListCustomerMembershipsQuery = z.infer<typeof listCustomerMembershipsSchema>['query'];
