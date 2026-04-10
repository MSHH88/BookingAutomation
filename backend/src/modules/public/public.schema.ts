/**
 * Public booking widget schemas — Phase 2.3
 *
 * Zod validation schemas for the public (no-auth) booking widget API.
 *
 * Endpoints:
 *   GET  /api/public/businesses/:slug            — studio info
 *   GET  /api/public/businesses/:slug/services   — available services
 *   GET  /api/public/businesses/:slug/artists    — artists for a service
 *   GET  /api/public/businesses/:slug/slots      — available time slots
 *   POST /api/public/businesses/:slug/bookings   — create booking (anonymous)
 *   GET  /api/public/bookings/:token             — lookup by public token
 */
import { z } from 'zod';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const slug = z.string().trim().min(1, 'slug is required').max(100);

/** ISO 8601 date-time with offset or Z suffix. */
const isoDateTime = (label: string) =>
  z.string({ required_error: `${label} is required` })
    .datetime({
      offset:  true,
      message: `${label} must be a valid ISO 8601 date-time string`,
    });

// ─── GET /api/public/businesses/:slug ─────────────────────────────────────────

export const getBusinessSchema = z.object({
  params: z.object({ slug }),
});

// ─── GET /api/public/businesses/:slug/services ────────────────────────────────

export const getBusinessServicesSchema = z.object({
  params: z.object({ slug }),
});

// ─── GET /api/public/businesses/:slug/artists ─────────────────────────────────

export const getBusinessArtistsSchema = z.object({
  params: z.object({ slug }),
  query: z.object({
    serviceId: z.string().trim().max(50).optional(),
  }),
});

export type GetBusinessArtistsQuery = z.infer<typeof getBusinessArtistsSchema>['query'];

// ─── GET /api/public/businesses/:slug/slots ───────────────────────────────────

export const getBusinessSlotsSchema = z.object({
  params: z.object({ slug }),
  query: z.object({
    date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    serviceId: z.string().trim().min(1, 'serviceId is required'),
    artistId:  z.string().trim().min(1, 'artistId is required'),
  }),
});

export type GetBusinessSlotsQuery = z.infer<typeof getBusinessSlotsSchema>['query'];

// ─── POST /api/public/businesses/:slug/bookings ──────────────────────────────

export const createPublicBookingSchema = z.object({
  params: z.object({ slug }),
  body: z.object({
    /** Customer full name. */
    name: z.string().trim().min(1, 'name is required').max(200),

    /** Customer email address. */
    email: z.string().email('email must be a valid email address'),

    /** Customer phone number. */
    phone: z.string().trim().min(5, 'phone is required').max(30),

    /** Selected artist ID. */
    artistId: z.string().trim().min(1, 'artistId is required'),

    /** Selected service ID. */
    serviceId: z.string().trim().min(1, 'serviceId is required'),

    /** Appointment start time (UTC). */
    startAt: isoDateTime('startAt'),

    /** Appointment end time (UTC). */
    endAt: isoDateTime('endAt'),

    /** Optional special requests / notes. */
    notes: z.string().trim().max(2000).optional(),

    /** Party size for restaurant bookings. */
    partySize: z.number().int().min(1).optional(),

    /** Table ID for restaurant bookings. */
    tableId: z.string().trim().max(50).optional(),

    /** Booking source (tracking UTM). */
    source: z.enum(['DIRECT', 'INSTAGRAM', 'FACEBOOK', 'WIDGET', 'POS', 'REFERRAL']).optional(),

    /** CAPTCHA token — required when CAPTCHA_ENABLED=true. */
    captchaToken: z.string().optional(),
  }).refine(
    ({ startAt, endAt }) => new Date(endAt) > new Date(startAt),
    { message: 'endAt must be after startAt', path: ['endAt'] },
  ),
});

export type CreatePublicBookingBody = z.infer<typeof createPublicBookingSchema>['body'];

// ─── GET /api/public/bookings/:token ──────────────────────────────────────────

export const getBookingByTokenSchema = z.object({
  params: z.object({
    token: z.string().min(1, 'token is required'),
  }),
});
