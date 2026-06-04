/**
 * Zod schemas for Recurring Bookings — Phase 1, Step 1.8
 *
 * Feature flag: RECURRING_BOOKINGS_ENABLED
 * Endpoints:
 *   GET    /api/recurring-bookings          — list for tenant
 *   GET    /api/recurring-bookings/:id      — get single
 *   POST   /api/recurring-bookings          — create
 *   PATCH  /api/recurring-bookings/:id      — update intervalDays, isActive
 *   DELETE /api/recurring-bookings/:id      — deactivate
 */
import { z } from 'zod';

const reqStr = (label: string) =>
  z.string({ required_error: `${label} is required` }).min(1, `${label} cannot be empty`).trim();

export const listRecurringSchema = z.object({
  query: z.object({
    isActive: z.enum(['true', 'false']).optional()
      .transform((v) => v === undefined ? undefined : v === 'true'),
    customerId: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export type ListRecurringQuery = z.infer<typeof listRecurringSchema>['query'];

export const getRecurringSchema = z.object({
  params: z.object({ id: reqStr('id') }),
});

export const createRecurringSchema = z.object({
  body: z.object({
    customerId: reqStr('customerId'),
    serviceId: z.string().optional(),
    artistId: z.string().optional(),
    intervalDays: z.number().int().min(1).max(365),
    nextBookingDate: z.string().datetime(),
  }),
});

export type CreateRecurringBody = z.infer<typeof createRecurringSchema>['body'];

export const updateRecurringSchema = z.object({
  params: z.object({ id: reqStr('id') }),
  body: z.object({
    intervalDays: z.number().int().min(1).max(365).optional(),
    nextBookingDate: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
  }).refine(
    (b) => b.intervalDays !== undefined || b.nextBookingDate !== undefined || b.isActive !== undefined,
    { message: 'At least one field must be provided for update' },
  ),
});

export type UpdateRecurringBody = z.infer<typeof updateRecurringSchema>['body'];

export const deleteRecurringSchema = z.object({
  params: z.object({ id: reqStr('id') }),
});
