/**
 * Zod schemas for all style-management request bodies.
 *
 * "Styles" is the generic name for the specialties/categories that staff
 * members offer. The UI term is resolved via the LabelKey system:
 *   - tattoo_studio → "Tattoo Styles"
 *   - hair_salon    → "Hair Styles"
 *   - barber        → "Cuts & Styles"
 *   - nail_salon    → "Nail Styles"
 *   - masseuse      → "Massage Types"
 *   - restaurant    → "Menu" (or disabled via STYLES_ENABLED=false)
 *
 * The underlying Prisma model is `TattooStyle` (@@map("tattoo_styles")).
 * The model name is a legacy artefact from the initial schema — functionally
 * it is a generic style/specialty record used by all business types.
 */
import { z } from 'zod';

// ─── Request schemas ──────────────────────────────────────────────────────────

/**
 * POST /api/styles — create a new style.
 */
export const createStyleSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(100, 'Name must be 100 characters or fewer')
      .trim(),
    description: z
      .string()
      .max(500, 'Description must be 500 characters or fewer')
      .trim()
      .optional(),
    exampleImageUrl: z
      .string()
      .url('Must be a valid URL')
      .optional()
      .nullable(),
  }),
});

/**
 * PATCH /api/styles/:id — update a style.
 * All fields optional; at least one must be provided.
 */
export const updateStyleSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Style ID is required'),
  }),
  body: z
    .object({
      name: z.string().min(1).max(100).trim().optional(),
      description: z.string().max(500).trim().optional().nullable(),
      exampleImageUrl: z.string().url('Must be a valid URL').optional().nullable(),
      isActive: z.boolean().optional(),
    })
    .refine((b: Record<string, unknown>) => Object.keys(b).length > 0, {
      message: 'At least one field must be provided to update',
    }),
});

/**
 * DELETE /api/styles/:id — soft-delete a style.
 */
export const deleteStyleSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Style ID is required'),
  }),
});

/**
 * GET /api/styles/:id — single style by ID.
 */
export const getStyleByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Style ID is required'),
  }),
});

/**
 * GET /api/styles — list styles with optional filters.
 */
export const listStylesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateStyleBody = z.infer<typeof createStyleSchema>['body'];
export type UpdateStyleBody = z.infer<typeof updateStyleSchema>['body'];
export type ListStylesQuery = z.infer<typeof listStylesSchema>['query'];
