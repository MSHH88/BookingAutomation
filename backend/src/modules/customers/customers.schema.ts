/**
 * Zod schemas for the Customer Portal API — Step 1.25
 *
 * All endpoints sit under /api/me and require the CUSTOMER role (or higher).
 * Customers can only access their own records — ownership is enforced in the
 * service layer using the authenticated user's id / email.
 *
 * Endpoints:
 *   GET    /api/me/bookings                — list own bookings (paginated)
 *   GET    /api/me/bookings/:id            — single booking detail
 *   POST   /api/me/bookings/:id/cancel     — cancel own upcoming booking
 *   POST   /api/me/bookings/:id/reschedule — request reschedule (staff notified)
 *   GET    /api/me/leads                   — list own inquiry leads
 *   PATCH  /api/me/profile                 — update own name / phone / marketingConsent
 */
import { z } from 'zod';

import { BOOKING_STATUSES } from '../bookings/bookings.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const optStr = (max = 2000) => z.string().trim().max(max).optional();

/** ISO 8601 date-time string with UTC offset or Z suffix. */
const isoDateTime = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .datetime({
      offset:  true,
      message: `${label} must be a valid ISO 8601 date-time string (e.g. "2026-06-15T10:00:00Z")`,
    });

// ─── GET /api/me/bookings ─────────────────────────────────────────────────────

export const listMyBookingsSchema = z.object({
  query: z.object({
    page:   z.string().optional(),
    limit:  z.string().optional(),
    status: z.enum(BOOKING_STATUSES).optional(),
    from:   z.string().optional(),
    to:     z.string().optional(),
  }),
});

export type ListMyBookingsQuery = z.infer<typeof listMyBookingsSchema>['query'];

// ─── GET /api/me/bookings/:id ─────────────────────────────────────────────────

export const getMyBookingSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── POST /api/me/bookings/:id/cancel ────────────────────────────────────────

export const cancelMyBookingSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    /**
     * Reason for cancellation.  Required — captured for CRM analytics.
     */
    cancelReason: z
      .string({ required_error: 'cancelReason is required' })
      .trim()
      .min(1, 'cancelReason is required')
      .max(500, 'cancelReason must be at most 500 characters'),
  }),
});

export type CancelMyBookingBody = z.infer<typeof cancelMyBookingSchema>['body'];

// ─── POST /api/me/bookings/:id/reschedule ────────────────────────────────────

export const rescheduleMyBookingSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z
    .object({
      /**
       * Requested new appointment start time (UTC).  Must be in the future.
       */
      startAt: isoDateTime('startAt'),

      /**
       * Requested new appointment end time (UTC).  Must be after startAt.
       */
      endAt: isoDateTime('endAt'),

      /**
       * Optional reason for the reschedule request.
       */
      notes: optStr(),
    })
    .refine(
      ({ startAt, endAt }) => new Date(endAt) > new Date(startAt),
      { message: 'endAt must be after startAt', path: ['endAt'] },
    )
    .refine(
      ({ startAt }) => new Date(startAt) > new Date(),
      { message: 'startAt must be in the future', path: ['startAt'] },
    ),
});

export type RescheduleMyBookingBody = z.infer<typeof rescheduleMyBookingSchema>['body'];

// ─── GET /api/me/leads ────────────────────────────────────────────────────────

export const listMyLeadsSchema = z.object({
  query: z.object({
    page:  z.string().optional(),
    limit: z.string().optional(),
  }),
});

export type ListMyLeadsQuery = z.infer<typeof listMyLeadsSchema>['query'];

// ─── PATCH /api/me/profile ────────────────────────────────────────────────────

export const updateMyProfileSchema = z.object({
  body: z
    .object({
      /** Customer display name. */
      name: z.string().trim().min(1).max(200).optional(),

      /** Phone number in E.164 or local format. */
      phone: z.string().trim().min(1).max(30).optional(),

      /** GDPR-compliant marketing consent toggle. */
      marketingConsent: z.boolean().optional(),
    })
    .refine(
      (b) => Object.keys(b).length > 0,
      { message: 'At least one field (name, phone, or marketingConsent) must be provided' },
    ),
});

export type UpdateMyProfileBody = z.infer<typeof updateMyProfileSchema>['body'];
