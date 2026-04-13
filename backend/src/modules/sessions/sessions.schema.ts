/**
 * Sessions schema — Phase 9.2
 *
 * Zod schemas for the group/class booking endpoints.
 */
import { z } from 'zod';

// ─── Shared ───────────────────────────────────────────────────────────────────

const sessionStatusValues        = ['OPEN', 'FULL', 'CANCELLED'] as const;
const sessionBookingStatusValues = ['CONFIRMED', 'CANCELLED', 'WAITLISTED'] as const;

// ─── Create session ───────────────────────────────────────────────────────────

export const createSessionSchema = z.object({
  body: z.object({
    serviceId:  z.string({ required_error: 'serviceId is required' }),
    artistId:   z.string({ required_error: 'artistId is required' }),
    locationId: z.string().optional(),
    startTime:  z.coerce.date({ required_error: 'startTime is required' }),
    endTime:    z.coerce.date({ required_error: 'endTime is required' }),
    capacity:   z.number({ required_error: 'capacity is required' }).int().min(1),
    notes:      z.string().optional(),
  }).refine(
    (d) => d.endTime > d.startTime,
    { message: 'endTime must be after startTime' },
  ),
});

// ─── Update session ───────────────────────────────────────────────────────────

export const updateSessionSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Session ID is required' }),
  }),
  body: z.object({
    locationId: z.string().optional().nullable(),
    startTime:  z.coerce.date().optional(),
    endTime:    z.coerce.date().optional(),
    capacity:   z.number().int().min(1).optional(),
    status:     z.enum(sessionStatusValues).optional(),
    notes:      z.string().optional().nullable(),
  }),
});

// ─── ID param ─────────────────────────────────────────────────────────────────

export const sessionIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Session ID is required' }),
  }),
});

// ─── List sessions ────────────────────────────────────────────────────────────

export const listSessionsSchema = z.object({
  query: z.object({
    serviceId:  z.string().optional(),
    artistId:   z.string().optional(),
    locationId: z.string().optional(),
    status:     z.enum(sessionStatusValues).optional(),
    from:       z.coerce.date().optional(),
    to:         z.coerce.date().optional(),
  }),
});

// ─── Book a spot ──────────────────────────────────────────────────────────────

export const bookSessionSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Session ID is required' }),
  }),
  body: z.object({
    customerId: z.string({ required_error: 'customerId is required' }),
  }),
});

// ─── Cancel booking ───────────────────────────────────────────────────────────

export const cancelSessionBookingSchema = z.object({
  params: z.object({
    id:        z.string({ required_error: 'Session ID is required' }),
    bookingId: z.string({ required_error: 'Booking ID is required' }),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateSessionBody           = z.infer<typeof createSessionSchema>['body'];
export type UpdateSessionBody           = z.infer<typeof updateSessionSchema>['body'];
export type SessionIdParams             = z.infer<typeof sessionIdSchema>['params'];
export type ListSessionsQuery           = z.infer<typeof listSessionsSchema>['query'];
export type BookSessionBody             = z.infer<typeof bookSessionSchema>['body'];
export type CancelSessionBookingParams  = z.infer<typeof cancelSessionBookingSchema>['params'];
export type SessionBookingStatusValues  = (typeof sessionBookingStatusValues)[number];
