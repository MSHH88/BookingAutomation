/**
 * Zod schemas for the Services Catalogue API — Step 1.13
 *
 * The service catalogue is the backbone of the booking platform:
 *   - ServiceCategory  → groups services into logical buckets (e.g. "Haircuts", "Colour")
 *   - Service          → a bookable offering with a duration, price and buffer
 *   - ArtistService    → many-to-many: which artists offer which services
 *
 * Who can do what:
 *   PUBLIC                 : list categories, list/get services, get services by artist
 *   ARTIST                 : link/unlink themselves to/from a service
 *   ADMIN                  : full CRUD on categories and services, link any artist
 */
import { z } from 'zod';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const optStr = (max = 2000) => z.string().trim().max(max).optional();

// ─── ServiceCategory schemas ──────────────────────────────────────────────────

/**
 * GET /api/services/categories
 * Public endpoint — no auth required.
 */
export const listCategoriesSchema = z.object({
  query: z.object({
    /** When omitted all categories are returned (useful for admin CRM). */
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

/**
 * POST /api/services/categories
 * ADMIN only.
 */
export const createCategorySchema = z.object({
  body: z.object({
    name:        z.string().trim().min(1, 'Category name is required').max(100),
    description: optStr(500),
    /** Lower number = higher position in UI lists. Defaults to 0. */
    sortOrder:   z.number().int().min(0).max(9999).optional(),
    isActive:    z.boolean().optional(),
  }),
});

/**
 * PATCH /api/services/categories/:id
 * ADMIN only.  At least one field must be provided.
 */
const updateCategoryBody = z.object({
  name:        z.string().trim().min(1).max(100).optional(),
  description: optStr(500),
  sortOrder:   z.number().int().min(0).max(9999).optional(),
  isActive:    z.boolean().optional(),
});
type UpdateCategoryBodyRaw = z.infer<typeof updateCategoryBody>;

export const updateCategorySchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
  body: updateCategoryBody.refine(
    (b: UpdateCategoryBodyRaw) => Object.keys(b).length > 0,
    { message: 'At least one field is required' },
  ),
});

/**
 * DELETE /api/services/categories/:id
 * ADMIN only.
 */
export const deleteCategorySchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
});

// ─── Service schemas ──────────────────────────────────────────────────────────

/**
 * GET /api/services
 * Public endpoint — no auth required.
 */
export const listServicesSchema = z.object({
  query: z.object({
    page:       z.string().optional(),
    limit:      z.string().optional(),
    /** Filter by category ID. */
    categoryId: z.string().trim().max(50).optional(),
    /** Filter by artistId — returns only services that artist offers. */
    artistId:   z.string().trim().max(50).optional(),
    /** Defaults to showing all when omitted. Pass 'true' for active only. */
    isActive:   z.enum(['true', 'false']).optional(),
    /** Full-text search on name and description (case-insensitive). */
    search:     z.string().trim().max(100).optional(),
  }),
});

/**
 * GET /api/services/:id
 * Public endpoint — no auth required.
 */
export const getServiceSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
});

/**
 * POST /api/services
 * ADMIN only.
 */
export const createServiceSchema = z.object({
  body: z.object({
    categoryId:         z.string().trim().min(1, 'Category ID is required').max(50),
    name:               z.string().trim().min(1, 'Service name is required').max(200),
    description:        optStr(2000),
    /** Duration in minutes for this service (used for slot calculation). */
    durationMinutes:    z
      .number()
      .int()
      .min(5,    'Duration must be at least 5 minutes')
      .max(1440, 'Duration cannot exceed 1440 minutes (24 h)'),
    /** Starting price in the studio's currency.  Stored as Decimal. */
    priceFrom:          z.number().nonnegative('Price must be non-negative').optional(),
    /** Cleanup / turnover buffer added AFTER the service slot. */
    bufferMinutes:      z.number().int().min(0).max(480).optional(),
    /** Minimum days before a customer can rebook the same service. */
    rebookIntervalDays: z.number().int().min(1).max(365).optional(),
    isActive:           z.boolean().optional(),
  }),
});

/**
 * PATCH /api/services/:id
 * ADMIN only.  At least one field must be provided.
 */
const updateServiceBody = z.object({
  categoryId:         z.string().trim().min(1).max(50).optional(),
  name:               z.string().trim().min(1).max(200).optional(),
  description:        optStr(2000),
  durationMinutes:    z.number().int().min(5).max(1440).optional(),
  /** Pass null to clear the price. */
  priceFrom:          z.number().nonnegative().nullable().optional(),
  bufferMinutes:      z.number().int().min(0).max(480).optional(),
  /** Pass null to clear the rebooking interval. */
  rebookIntervalDays: z.number().int().min(1).max(365).nullable().optional(),
  isActive:           z.boolean().optional(),
});
type UpdateServiceBodyRaw = z.infer<typeof updateServiceBody>;

export const updateServiceSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
  body: updateServiceBody.refine(
    (b: UpdateServiceBodyRaw) => Object.keys(b).length > 0,
    { message: 'At least one field is required' },
  ),
});

/**
 * DELETE /api/services/:id
 * ADMIN only.
 */
export const deleteServiceSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
});

// ─── Artist-service link schemas ──────────────────────────────────────────────

/**
 * POST /api/services/:id/link
 * ARTIST: links their own artist profile to this service.
 * ADMIN:  requires artistId in body to specify which artist to link.
 */
export const linkServiceSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
  body: z.object({
    /** Required when called as ADMIN; ignored when called as ARTIST. */
    artistId: z.string().trim().min(1).max(50).optional(),
  }),
});

/**
 * DELETE /api/services/:id/link
 * ARTIST: unlinks their own artist profile from this service.
 * ADMIN:  requires artistId in body to specify which artist to unlink.
 */
export const unlinkServiceSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
  body: z.object({
    /** Required when called as ADMIN; ignored when called as ARTIST. */
    artistId: z.string().trim().min(1).max(50).optional(),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type ListCategoriesQuery    = z.infer<typeof listCategoriesSchema>['query'];
export type CreateCategoryBody     = z.infer<typeof createCategorySchema>['body'];
export type UpdateCategoryBody     = z.infer<typeof updateCategorySchema>['body'];

export type ListServicesQuery      = z.infer<typeof listServicesSchema>['query'];
export type CreateServiceBody      = z.infer<typeof createServiceSchema>['body'];
export type UpdateServiceBody      = z.infer<typeof updateServiceSchema>['body'];
export type LinkServiceBody        = z.infer<typeof linkServiceSchema>['body'];
