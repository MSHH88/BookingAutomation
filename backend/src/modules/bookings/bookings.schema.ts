/**
 * Zod schemas for the Booking Management API — Step 1.9
 *
 * Bookings are created automatically when a Quote is accepted (Step 1.8).
 * This module provides the management layer: confirm, complete, cancel, reschedule.
 *
 * Booking status lifecycle:
 *   PENDING → CONFIRMED  (requireAuth + conflict check)
 *           → CANCELLED  (at any non-terminal status)
 *   CONFIRMED → COMPLETED (creates Invoice atomically)
 *             → CANCELLED
 *             → RESCHEDULED (changes startAt/endAt + conflict check)
 *             → NO_SHOW
 *
 * Role permissions:
 *   ARTIST / ADMIN  : list, get, confirm, complete, cancel, reschedule
 *   ARTISTs         : scoped to their own bookings only
 *   ADMIN           : sees all bookings
 */
import { z } from 'zod';

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

// ─── Booking status enum ──────────────────────────────────────────────────────

export const BOOKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'RESCHEDULED',
] as const;
export type BookingStatusValue = (typeof BOOKING_STATUSES)[number];

// ─── GET /api/bookings ────────────────────────────────────────────────────────

export const listBookingsSchema = z.object({
  query: z.object({
    page:       z.string().optional(),
    limit:      z.string().optional(),
    status:     z.enum(BOOKING_STATUSES).optional(),
    artistId:   z.string().trim().max(50).optional(),
    customerId: z.string().trim().max(50).optional(),
    from:       z.string().optional(),
    to:         z.string().optional(),
  }),
});

export type ListBookingsQuery = z.infer<typeof listBookingsSchema>['query'];

// ─── GET /api/bookings/:id ────────────────────────────────────────────────────

export const getBookingByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── PATCH /api/bookings/:id/confirm ─────────────────────────────────────────

export const confirmBookingSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── PATCH /api/bookings/:id/complete ────────────────────────────────────────

export const completeBookingSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    /**
     * Optional notes to attach to the completed booking.
     * Typically used for session notes, aftercare reminders, etc.
     */
    notes: optStr(),
  }),
});

export type CompleteBookingBody = z.infer<typeof completeBookingSchema>['body'];

// ─── PATCH /api/bookings/:id/cancel ──────────────────────────────────────────

export const cancelBookingSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    /**
     * Reason for cancellation. Required — captured for CRM analytics and
     * communicated to the customer in the cancellation email.
     */
    cancelReason: z
      .string({ required_error: 'cancelReason is required' })
      .trim()
      .min(1, 'cancelReason is required')
      .max(500, 'cancelReason must be at most 500 characters'),
  }),
});

export type CancelBookingBody = z.infer<typeof cancelBookingSchema>['body'];

// ─── PATCH /api/bookings/:id/reschedule ──────────────────────────────────────

export const rescheduleBookingSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z
    .object({
      /**
       * New appointment start time (UTC). Must be in the future.
       */
      startAt: isoDateTime('startAt'),

      /**
       * New appointment end time (UTC). Must be after startAt.
       */
      endAt: isoDateTime('endAt'),

      /**
       * Optional reason for the reschedule — stored as notes.
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

export type RescheduleBookingBody = z.infer<typeof rescheduleBookingSchema>['body'];
