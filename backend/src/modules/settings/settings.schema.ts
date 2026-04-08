/**
 * Settings schema — Step 1.29
 *
 * Zod schemas for the public Studio Settings API.
 *
 * Two endpoints:
 *   GET   /api/settings       — public, no auth required
 *   PATCH /api/settings       — ADMIN only
 *
 * The PATCH body is identical to the admin module's updateSettingsSchema
 * so that both endpoints operate on the same StudioSettings row.
 */
import { z } from 'zod';

// ─── PATCH /api/settings ──────────────────────────────────────────────────────

/**
 * All fields are optional — only supplied fields are written to the DB.
 * At least one field must be present (validated via `.refine`).
 */
export const updateSettingsSchema = z.object({
  body: z
    .object({
      /** Studio display name shown on all customer communications. */
      studioName: z.string().trim().min(1).max(200).optional(),

      /** Reply-to / from email address for outgoing notifications. */
      studioEmail: z.string().email('studioEmail must be a valid email').nullable().optional(),

      /** Studio phone number displayed on booking confirmations. */
      studioPhone: z.string().trim().max(30).nullable().optional(),

      /** Full studio address (used on invoices and booking emails). */
      studioAddress: z.string().trim().max(500).nullable().optional(),

      /**
       * IANA timezone identifier, e.g. "Europe/London", "America/New_York".
       * Controls slot display, appointment emails, and calendar sync.
       */
      studioTimezone: z.string().trim().max(100).optional(),

      /**
       * ISO 4217 currency code, e.g. "GBP", "EUR", "USD".
       * Stored in upper-case; displayed on invoices and payment screens.
       */
      currency: z
        .string()
        .trim()
        .length(3, 'currency must be a 3-letter ISO 4217 code')
        .toUpperCase()
        .optional(),

      /**
       * Deposit as a percentage of the total booking amount (0–100).
       * Superseded by depositFixedAmount when both are set.
       */
      depositPercentage: z.number().min(0).max(100).optional(),

      /** Fixed deposit amount in the studio currency. null = use percentage. */
      depositFixedAmount: z.number().min(0).nullable().optional(),

      /**
       * Minimum hours before an appointment that a customer may cancel or
       * reschedule without incurring a fee.  0 = no restriction.
       */
      cancellationHours: z.number().int().min(0).optional(),

      /**
       * Cancellation fee as a percentage of the booking total (0–100).
       * Applied when a customer cancels within the cancellation window.
       */
      cancellationFeePercent: z.number().min(0).max(100).optional(),

      /**
       * Human-readable cancellation policy displayed to customers at
       * booking confirmation when CANCELLATION_FEE_ENABLED is true.
       * Must be non-empty before CANCELLATION_FEE_ENABLED can be activated.
       */
      cancellationPolicyText: z.string().trim().max(2000).nullable().optional(),

      /** Maximum covers / concurrent bookings per time slot. null = unlimited. */
      maxCoversPerSlot: z.number().int().min(1).nullable().optional(),

      /** Availability slot granularity in minutes (5–120). */
      slotIntervalMinutes: z.number().int().min(5).max(120).optional(),

      /** Full URL of the Google Business review page. */
      googleReviewUrl: z
        .string()
        .url('googleReviewUrl must be a valid URL')
        .nullable()
        .optional(),

      /** Public URL of the customer-facing online booking page. */
      bookingPageUrl: z
        .string()
        .url('bookingPageUrl must be a valid URL')
        .nullable()
        .optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: 'At least one settings field must be provided',
    }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>['body'];
