/**
 * Zod schemas for the Quote Management API — Step 1.8
 *
 * A Quote is a price proposal an artist/admin creates for a Lead. The customer
 * can accept (→ auto-creates a Booking) or reject the quote.
 *
 * Quote status lifecycle:
 *   DRAFT → SENT → ACCEPTED  (creates Booking, moves Lead → BOOKED)
 *                → REJECTED
 *                → EXPIRED   (checked at runtime via validUntil)
 *
 * Role permissions:
 *   ARTIST / ADMIN : create quotes, read own/all, edit DRAFT, send
 *   ADMIN only     : accept, reject, read all quotes regardless of artistId
 */
import { z } from 'zod';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const optStr = (max = 2000) => z.string().trim().max(max).optional();

/**
 * Validated positive decimal price.
 * JSON numbers map to JS floats; Prisma accepts them directly for Decimal fields.
 */
const positiveDecimal = z
  .number({
    required_error:     'price is required',
    invalid_type_error: 'price must be a number',
  })
  .positive('price must be greater than 0')
  .finite('price must be a finite number')
  .multipleOf(0.01, 'price must have at most 2 decimal places');

/** ISO 8601 date-time string with UTC offset or Z suffix. */
const isoDateTime = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .datetime({
      offset:  true,
      message: `${label} must be a valid ISO 8601 date-time string (e.g. "2026-04-11T10:00:00Z")`,
    });

// ─── Quote status enum ────────────────────────────────────────────────────────

export const QUOTE_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;
export type QuoteStatusValue = (typeof QUOTE_STATUSES)[number];

// ─── POST /api/quotes ─────────────────────────────────────────────────────────

export const createQuoteSchema = z.object({
  body: z.object({
    /**
     * The lead this quote is for. Must exist and be in a quotable status
     * (NEW, CONTACTED, or QUOTED — not BOOKED/COMPLETED/CANCELLED/LOST).
     */
    leadId: z
      .string({ required_error: 'leadId is required' })
      .min(1, 'leadId is required'),

    /**
     * Required when the actor is ADMIN (must specify which artist owns the quote).
     * Ignored when the actor is ARTIST — the service resolves it from their profile.
     */
    artistId: z.string().min(1).optional(),

    /** Price in the studio's base currency (e.g. GBP). Stored as Decimal(10,2). */
    price: positiveDecimal,

    /** Estimated duration in hours (e.g. 4.5 means 4 hours 30 minutes). */
    hours: z.number().positive('hours must be greater than 0').finite().optional(),

    /** Internal notes visible to staff only. */
    notes: optStr(),

    /**
     * Quote expiry date-time. Defaults to 7 days from creation if omitted.
     * Must be a future date.
     */
    validUntil: isoDateTime('validUntil').optional(),
  }),
});

// ─── GET /api/quotes ──────────────────────────────────────────────────────────

export const listQuotesSchema = z.object({
  query: z.object({
    page:     z.string().optional(),
    limit:    z.string().optional(),
    status:   z.enum(QUOTE_STATUSES).optional(),
    leadId:   z.string().trim().max(50).optional(),
    artistId: z.string().trim().max(50).optional(),
    from:     z.string().optional(),
    to:       z.string().optional(),
  }),
});

// ─── GET /api/quotes/:id ──────────────────────────────────────────────────────

export const getQuoteByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Quote ID is required'),
  }),
});

// ─── PATCH /api/quotes/:id ────────────────────────────────────────────────────

export const updateQuoteSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Quote ID is required'),
  }),
  body: z
    .object({
      price:      positiveDecimal.optional(),
      hours:      z.number().positive().finite().optional(),
      notes:      optStr(),
      validUntil: isoDateTime('validUntil').optional(),
    })
    .refine(
      (b) =>
        b.price      !== undefined ||
        b.hours      !== undefined ||
        b.notes      !== undefined ||
        b.validUntil !== undefined,
      { message: 'At least one field (price, hours, notes, validUntil) must be provided' },
    ),
});

// ─── PATCH /api/quotes/:id/send ───────────────────────────────────────────────

export const sendQuoteSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Quote ID is required'),
  }),
});

// ─── PATCH /api/quotes/:id/accept ─────────────────────────────────────────────

export const acceptQuoteSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Quote ID is required'),
  }),
  body: z
    .object({
      /**
       * Appointment start and end times provided by admin at acceptance time.
       * Creates the Booking record immediately so no separate scheduling step is needed.
       */
      startAt: isoDateTime('startAt'),
      endAt:   isoDateTime('endAt'),

      /** Optional admin notes to attach to the new Booking. */
      notes: optStr(),
    })
    .refine((b) => new Date(b.endAt) > new Date(b.startAt), {
      message: 'endAt must be after startAt',
      path:    ['endAt'],
    }),
});

// ─── PATCH /api/quotes/:id/reject ─────────────────────────────────────────────

export const rejectQuoteSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Quote ID is required'),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateQuoteBody = z.infer<typeof createQuoteSchema>['body'];
export type ListQuotesQuery = z.infer<typeof listQuotesSchema>['query'];
export type UpdateQuoteBody = z.infer<typeof updateQuoteSchema>['body'];
export type AcceptQuoteBody = z.infer<typeof acceptQuoteSchema>['body'];
