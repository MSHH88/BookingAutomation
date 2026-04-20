/**
 * Zod validation schemas for the Tables API — Step 1.24
 *
 * Schemas follow the { params, body, query } envelope convention used
 * throughout this project so they can be passed directly to the `validate`
 * middleware.
 *
 * Endpoints:
 *   GET    /api/tables                  — list active tables
 *   GET    /api/tables/availability     — tables available for a time slot
 *   POST   /api/tables                  — create a table (ADMIN)
 *   PATCH  /api/tables/:id              — update a table (ADMIN)
 *   DELETE /api/tables/:id              — soft-delete a table (ADMIN)
 */
import { z } from 'zod';

// ─── Query schemas ────────────────────────────────────────────────────────────

/**
 * GET /api/tables
 *
 * Optional filter: `isActive` — defaults to listing only active tables.
 */
export const listTablesSchema = z.object({
  query: z.object({
    /**
     * BUG 26: tenant slug is required so anonymous public callers can only
     * see one tenant's tables. Without a slug the service has no way to scope
     * the query and would otherwise leak cross-tenant data.
     */
    slug: z.string().trim().min(1, 'slug is required').max(120),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

/**
 * GET /api/tables/availability
 *
 * Required: date (YYYY-MM-DD), time (HH:MM 24h), partySize (positive int).
 * Optional: durationMinutes (default 120) — how long the sitting lasts.
 */
export const listTableAvailabilitySchema = z.object({
  query: z.object({
    /**
     * BUG 26: tenant slug is required so anonymous public callers can only
     * see one tenant's availability.
     */
    slug: z.string().trim().min(1, 'slug is required').max(120),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be in HH:MM (24-hour) format'),
    partySize: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive('partySize must be a positive integer')),
    durationMinutes: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive().max(480, 'Maximum sitting duration is 480 minutes'))
      .optional(),
  }),
});

// ─── Mutation schemas ─────────────────────────────────────────────────────────

/**
 * POST /api/tables
 *
 * Creates a new restaurant table.
 */
export const createTableSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Table name is required')
      .max(80, 'Table name must be at most 80 characters')
      .trim(),
    capacity: z
      .number()
      .int('Capacity must be a whole number')
      .positive('Capacity must be a positive integer')
      .max(50, 'Capacity cannot exceed 50'),
    location: z.string().max(120).trim().optional().nullable(),
    positionX: z
      .number()
      .min(0, 'positionX must be non-negative')
      .optional()
      .nullable(),
    positionY: z
      .number()
      .min(0, 'positionY must be non-negative')
      .optional()
      .nullable(),
    isActive: z.boolean().optional().default(true),
  }),
});

/**
 * PATCH /api/tables/:id
 *
 * Partially updates a table. At least one field must be provided.
 */
export const updateTableSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Table ID is required'),
  }),
  body: z
    .object({
      name: z.string().min(1).max(80).trim().optional(),
      capacity: z.number().int().positive().max(50).optional(),
      location: z.string().max(120).trim().optional().nullable(),
      positionX: z.number().min(0).optional().nullable(),
      positionY: z.number().min(0).optional().nullable(),
      isActive: z.boolean().optional(),
    })
    .refine((b: Record<string, unknown>) => Object.keys(b).length > 0, {
      message: 'At least one field must be provided to update',
    }),
});

/**
 * DELETE /api/tables/:id
 *
 * Soft-deletes a table (sets isActive = false).
 */
export const deleteTableSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Table ID is required'),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type ListTablesQuery       = z.infer<typeof listTablesSchema>['query'];
export type ListTableAvailQuery   = z.infer<typeof listTableAvailabilitySchema>['query'];
export type CreateTableBody       = z.infer<typeof createTableSchema>['body'];
export type UpdateTableBody       = z.infer<typeof updateTableSchema>['body'];
