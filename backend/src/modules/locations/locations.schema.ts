/**
 * Locations schema — Phase 9.1
 *
 * Zod schemas for the multi-location endpoints.
 */
import { z } from 'zod';

// ─── Create ───────────────────────────────────────────────────────────────────

export const createLocationSchema = z.object({
  body: z.object({
    name:     z.string({ required_error: 'name is required' }).min(1),
    address:  z.string().optional(),
    city:     z.string().optional(),
    postcode: z.string().optional(),
    country:  z.string().optional(),
    phone:    z.string().optional(),
    timezone: z.string().default('UTC'),
    isActive: z.boolean().default(true),
  }),
});

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateLocationSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Location ID is required' }),
  }),
  body: z.object({
    name:     z.string().min(1).optional(),
    address:  z.string().optional().nullable(),
    city:     z.string().optional().nullable(),
    postcode: z.string().optional().nullable(),
    country:  z.string().optional().nullable(),
    phone:    z.string().optional().nullable(),
    timezone: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

// ─── ID param ─────────────────────────────────────────────────────────────────

export const locationIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Location ID is required' }),
  }),
});

// ─── List ─────────────────────────────────────────────────────────────────────

export const listLocationsSchema = z.object({
  query: z.object({
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateLocationBody  = z.infer<typeof createLocationSchema>['body'];
export type UpdateLocationBody  = z.infer<typeof updateLocationSchema>['body'];
export type LocationIdParams    = z.infer<typeof locationIdSchema>['params'];
export type ListLocationsQuery  = z.infer<typeof listLocationsSchema>['query'];
