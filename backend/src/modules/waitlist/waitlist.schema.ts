/**
 * Zod schemas for the Waitlist API — Step 1.16
 *
 * The Waitlist module allows customers to register interest when their
 * preferred artist or time slot is fully booked.  Admins manage the queue
 * and trigger slot-available email notifications.
 *
 * Status lifecycle:
 *   WAITING → NOTIFIED → BOOKED   (success path)
 *   WAITING → CANCELLED            (admin or customer opt-out)
 *   WAITING → EXPIRED              (manual expiry)
 *   NOTIFIED → EXPIRED             (customer didn't respond before expiresAt)
 *   EXPIRED → WAITING              (re-activate)
 *
 * Role permissions:
 *   PUBLIC : POST /api/waitlist                      — join the waitlist
 *   ADMIN  : GET, PATCH /:id/status, POST /:id/notify, DELETE /:id
 */
import { z } from 'zod';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Non-empty trimmed string. */
const reqStr = (label: string) =>
  z.string({ required_error: `${label} is required` }).min(1, `${label} cannot be empty`).trim();

// ─── POST /api/waitlist (PUBLIC) ──────────────────────────────────────────────

export const joinWaitlistSchema = z.object({
  body: z.object({
    /** Customer full name. */
    name: reqStr('name').max(120, 'name cannot exceed 120 characters'),

    /** Customer email — used for deduplication and notification. */
    email: reqStr('email').email('email must be a valid email address'),

    /**
     * Customer phone number — E.164 or common formatted variants.
     * Min 7 characters, max 20 to allow international formats.
     */
    phone: reqStr('phone').regex(
      /^\+?[\d\s\-().]{7,20}$/,
      'phone must be a valid phone number (e.g. +44 7700 900000)',
    ),

    /** Optional preferred artist ID. Used for deduplication. */
    artistId: z.string().optional(),

    /** Optional preferred service ID. */
    serviceId: z.string().optional(),

    /**
     * Customer's preferred appointment date/time (ISO 8601, with UTC offset).
     * Treated as a soft preference — not a guaranteed reservation.
     */
    requestedDate: z.string().datetime({ offset: true }).optional(),

    /**
     * Free-form notes (e.g. style preferences, reference images URL).
     * Capped at 1 000 characters to prevent payload abuse.
     */
    notes: z.string().max(1000, 'notes cannot exceed 1 000 characters').optional(),

    /** Customer's preferred time of day. Used for Phase 5.4 smart matching. */
    timePreference: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'ANY']).optional().default('ANY'),
  }),
});

export type JoinWaitlistBody = z.infer<typeof joinWaitlistSchema>['body'];

// ─── GET /api/waitlist (ADMIN) ────────────────────────────────────────────────

export const listWaitlistSchema = z.object({
  query: z.object({
    /** Filter by waitlist status. */
    status: z
      .enum(['WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED', 'CANCELLED'])
      .optional(),

    /** Filter to entries for a specific artist. */
    artistId: z.string().optional(),

    /** Filter by exact customer email address. */
    email: z.string().email().optional(),

    /** Pagination — page number (1-based). */
    page: z.string().optional(),

    /** Pagination — records per page (max 100). */
    limit: z.string().optional(),
  }),
});

export type ListWaitlistQuery = z.infer<typeof listWaitlistSchema>['query'];

// ─── GET /api/waitlist/:id ────────────────────────────────────────────────────

export const getWaitlistEntrySchema = z.object({
  params: z.object({
    id: reqStr('id'),
  }),
});

// ─── PATCH /api/waitlist/:id/status ──────────────────────────────────────────

export const updateWaitlistStatusSchema = z.object({
  params: z.object({
    id: reqStr('id'),
  }),
  body: z.object({
    /**
     * Target status for the manual transition.
     * Valid transitions are enforced in the service layer via
     * VALID_WAITLIST_TRANSITIONS.
     */
    status: z.enum(['WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED', 'CANCELLED']),
  }),
});

export type UpdateWaitlistStatusBody = z.infer<typeof updateWaitlistStatusSchema>['body'];

// ─── POST /api/waitlist/:id/notify ───────────────────────────────────────────

export const notifyWaitlistEntrySchema = z.object({
  params: z.object({
    id: reqStr('id'),
  }),
  body: z.object({
    /**
     * Number of hours the customer has to respond before the slot expires.
     * Default 72 h (3 days).  Max 168 h (7 days).
     */
    expiresInHours: z
      .number()
      .int()
      .min(1, 'expiresInHours must be at least 1')
      .max(168, 'expiresInHours cannot exceed 168 (7 days)')
      .optional()
      .default(72),

    /**
     * Optional custom message appended to the notification email body.
     * E.g. "Your preferred artist Alex has an opening this Saturday at 2 pm."
     */
    customMessage: z
      .string()
      .max(500, 'customMessage cannot exceed 500 characters')
      .optional(),
  }),
});

export type NotifyWaitlistEntryBody = z.infer<typeof notifyWaitlistEntrySchema>['body'];

// ─── DELETE /api/waitlist/:id ─────────────────────────────────────────────────

export const deleteWaitlistEntrySchema = z.object({
  params: z.object({
    id: reqStr('id'),
  }),
});

// ─── Status transition map ────────────────────────────────────────────────────

/**
 * Allowed manual status transitions enforced by the service layer.
 *
 * Terminal statuses (BOOKED, CANCELLED) have no outgoing transitions.
 * EXPIRED can be re-activated to WAITING to re-enter the queue.
 *
 * Exported so the service and tests can share the same source of truth.
 */
export const VALID_WAITLIST_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  WAITING:   ['NOTIFIED', 'BOOKED', 'CANCELLED', 'EXPIRED'],
  NOTIFIED:  ['BOOKED', 'CANCELLED', 'EXPIRED'],
  BOOKED:    [],
  EXPIRED:   ['WAITING'],
  CANCELLED: [],
} as const;
