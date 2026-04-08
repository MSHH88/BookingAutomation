/**
 * Zod schemas for all artist-management request bodies.
 *
 * Each schema is structured as { body, params, query } so it can be used
 * directly with the `validate` middleware.
 */
import { z } from 'zod';

// ─── Reusable fragments ───────────────────────────────────────────────────────

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM 24-hour
const timeSchema = z.string().regex(timeRegex, 'Time must be in HH:MM format (24-hour)');

const availabilityDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema,
  breakStart: timeSchema.optional().nullable(),
  breakEnd: timeSchema.optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

// ─── Request schemas ──────────────────────────────────────────────────────────

/**
 * POST /api/artists — create a new artist.
 * Creates both the User record and the Artist profile in one step.
 */
export const createArtistSchema = z.object({
  body: z.object({
    // User fields
    name: z.string().min(1, 'Name is required').max(100).trim(),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128),
    phone: z
      .string()
      .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Invalid phone number format')
      .optional(),
    // Artist fields
    slug: z
      .string()
      .min(2)
      .max(60)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase, letters, numbers, and hyphens only'),
    bio: z.string().max(2000).optional(),
    profileImageUrl: z.string().url('Must be a valid URL').optional(),
    portfolioImages: z.array(z.string().url()).max(50).optional(),
    bufferMinutes: z.number().int().min(0).max(120).optional(),
    slotDuration: z.number().int().min(15).max(720).optional(),
    commissionRate: z.number().min(0).max(100).optional().nullable(),
    commissionType: z.enum(['PERCENTAGE', 'FLAT']).optional().nullable(),
  }),
});

/**
 * PATCH /api/artists/:id — update an artist profile.
 * All fields optional; at least one must be provided.
 */
export const updateArtistSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Artist ID is required'),
  }),
  body: z
    .object({
      name: z.string().min(1).max(100).trim().optional(),
      bio: z.string().max(2000).optional().nullable(),
      profileImageUrl: z.string().url('Must be a valid URL').optional().nullable(),
      portfolioImages: z.array(z.string().url()).max(50).optional(),
      bufferMinutes: z.number().int().min(0).max(120).optional(),
      slotDuration: z.number().int().min(15).max(720).optional(),
      commissionRate: z.number().min(0).max(100).optional().nullable(),
      commissionType: z.enum(['PERCENTAGE', 'FLAT']).optional().nullable(),
      isActive: z.boolean().optional(),
    })
    .refine((b: Record<string, unknown>) => Object.keys(b).length > 0, {
      message: 'At least one field must be provided to update',
    }),
});

/**
 * POST /api/artists/:id/styles — replace all style assignments for an artist.
 */
export const assignStylesSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    styleIds: z
      .array(z.string().min(1))
      .min(0, 'styleIds must be an array (can be empty to clear all)'),
  }),
});

/**
 * PUT /api/artists/:id/availability — replace all availability windows for an artist.
 */
export const setAvailabilitySchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    availability: z
      .array(availabilityDaySchema)
      .min(0)
      .refine(
        (arr: Array<{ dayOfWeek: number; startTime: string; endTime: string; breakStart?: string | null; breakEnd?: string | null; isActive?: boolean }>) => {
          const days = arr.map((d) => d.dayOfWeek);
          return new Set(days).size === days.length;
        },
        { message: 'Each dayOfWeek must appear at most once' },
      )
      .refine(
        (arr: Array<{ dayOfWeek: number; startTime: string; endTime: string }>) =>
          arr.every((d) => d.startTime < d.endTime),
        { message: 'endTime must be after startTime for each day' },
      )
      .refine(
        (arr: Array<{ startTime: string; endTime: string; breakStart?: string | null; breakEnd?: string | null }>) =>
          arr.every((d) => {
            if (d.breakStart && d.breakEnd) {
              return d.breakStart < d.breakEnd;
            }
            return true;
          }),
        { message: 'breakEnd must be after breakStart when both are provided' },
      ),
  }),
});

/**
 * GET /api/artists — list query parameters.
 */
export const listArtistsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

/**
 * GET /api/artists/:slug — single artist by slug.
 */
export const getArtistBySlugSchema = z.object({
  params: z.object({
    slug: z.string().min(1),
  }),
});

/**
 * DELETE /api/artists/:id — soft-delete.
 */
export const deleteArtistSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

/**
 * GET /api/artists/:id/availability — get working hours.
 */
export const getAvailabilitySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Artist ID is required'),
  }),
});

/**
 * PUT /api/artists/:id/services — atomically replace the full list of services
 * an artist offers, with optional per-artist price overrides.
 *
 * Body:
 *   { services: [{ serviceId: "cuid", customPrice?: number | null }] }
 *
 * Passing an empty array removes all service assignments for the artist.
 */
export const setArtistServicesSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Artist ID is required'),
  }),
  body: z.object({
    services: z
      .array(
        z.object({
          serviceId: z.string().min(1, 'serviceId is required'),
          customPrice: z
            .number()
            .positive('customPrice must be a positive number')
            .optional()
            .nullable(),
        }),
      )
      .min(0, 'services must be an array (can be empty to remove all)'),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateArtistBody = z.infer<typeof createArtistSchema>['body'];
export type UpdateArtistBody = z.infer<typeof updateArtistSchema>['body'];
export type AssignStylesBody = z.infer<typeof assignStylesSchema>['body'];
export type SetAvailabilityBody = z.infer<typeof setAvailabilitySchema>['body'];
export type SetArtistServicesBody = z.infer<typeof setArtistServicesSchema>['body'];
export type ListArtistsQuery = z.infer<typeof listArtistsSchema>['query'];
