/**
 * Zod schemas for the Lead Capture API — Step 1.11
 *
 * This module owns the public-facing POST /api/capture endpoint, which is the
 * universal form-submission ingress point for all six supported business types.
 *
 * What makes this different from the admin POST /api/leads:
 *   • Honeypot field (`website`) — invisible to humans, filled by bots
 *   • Optional `sessionId` — passed through multi-step form flows
 *   • Same business-type-aware `placement` rule as the leads schema
 *     (required for tattoo studios)
 *
 * All fields shared with CreateLeadBody are kept byte-for-byte compatible
 * so the capture service can forward the validated body straight into the
 * existing leads.service.createLead() call.
 */
import { z } from 'zod';

import { activeBusinessType } from '../../config/businessType';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Non-empty trimmed string helper. */
const str = (label: string, max = 500) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

/** Optional trimmed string. */
const optStr = (max = 500) => z.string().trim().max(max).optional();

/** E.164-ish phone — at least 7 digits, max 20 chars */
const phone = z
  .string()
  .trim()
  .min(7, 'Phone number must be at least 7 characters')
  .max(20, 'Phone number must be 20 characters or fewer')
  .regex(/^\+?[\d\s\-().]{7,20}$/, 'Phone number contains invalid characters');

// ─── POST /api/capture ────────────────────────────────────────────────────────

/**
 * Business-type-aware capture schema.
 *
 * Extends the base lead fields with:
 *   - `website`   — honeypot field (bots fill it; humans never see it)
 *   - `sessionId` — optional UUID-v4 for multi-step forms
 *
 * `placement` is required only when business type is `tattoo_studio`.
 * For all other types it is accepted but optional, keeping the endpoint universal.
 */
function buildCaptureLeadSchema() {
  // Tattoo placement is determined entirely by business type (tattoo studios only).
  // This is a startup-time configuration so we use the active business type directly.
  const placementRequired = activeBusinessType === 'tattoo_studio';

  const placementField = placementRequired
    ? z
        .record(z.unknown())
        .refine((v) => Object.keys(v).length > 0, {
          message: 'Placement is required for this business type',
        })
    : z.record(z.unknown()).optional().nullable();

  return z.object({
    body: z.object({
      // ── Contact ─────────────────────────────────────────────────────────
      name:    str('Name', 100),
      email:   z.string().trim().email('A valid email address is required'),
      phone,
      country: optStr(100),

      // ── Inquiry content ──────────────────────────────────────────────────
      description:     str('Description', 2000),
      placement:       placementField,
      size:            optStr(100),
      colorPreference: optStr(100),
      referenceImages: z
        .array(z.string().url('Each reference image must be a valid URL'))
        .max(10)
        .optional(),
      preferredDates: z.record(z.unknown()).optional().nullable(),

      // ── Service interest (universal across all business types) ────────────
      artistId:  optStr(50),
      styleId:   optStr(50),
      serviceId: optStr(50),

      // ── Attribution / analytics ──────────────────────────────────────────
      pageVisited: optStr(500),
      source:      optStr(100),
      utmSource:   optStr(200),
      utmMedium:   optStr(200),
      utmCampaign: optStr(200),
      deviceType:  optStr(50),

      // ── Communication preferences ────────────────────────────────────────
      preferWhatsApp:   z.boolean().optional(),
      marketingConsent: z.boolean().optional(),

      // ── Capture-specific fields ──────────────────────────────────────────

      /**
       * Honeypot field.
       *
       * This field is intentionally hidden in the HTML form via CSS
       * (`display:none` or `position:absolute; left:-9999px`).
       * Legitimate users never see or fill it.  Automated bots that
       * blindly fill every text input will populate it, allowing the
       * backend to silently discard the submission without exposing
       * the detection mechanism to the submitter.
       */
      website: z.string().max(500).optional(),

      /**
       * Session identifier for multi-step form flows.
       *
       * Frontend generates a UUID-v4 when the form loads and carries it
       * through every step so the backend can correlate partial submissions,
       * analytics events, and the final capture into a single session.
       * Stored on the lead and on each AnalyticsEvent created.
       */
      sessionId: z
        .string()
        .uuid('sessionId must be a valid UUID v4')
        .optional(),
    }),
  });
}

export const captureLeadSchema = buildCaptureLeadSchema();

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CaptureLeadBody = z.infer<typeof captureLeadSchema>['body'];

// ─── Capture response shape ───────────────────────────────────────────────────

/**
 * Structured response returned to the caller on a successful capture.
 *
 * `isDuplicate` is true when the submission was recognised as a repeat
 * within the deduplication window (24 hours).  In that case the existing
 * lead is returned — no new record is created.
 *
 * `score` is the auto-computed lead quality score (0–100).
 *
 * `capturedAt` is the ISO-8601 timestamp of the moment the lead was
 * first created.  On a duplicate submission this matches the original
 * `createdAt`, not the current request time.
 */
export interface CaptureResult {
  leadId:      string;
  score:       number;
  isDuplicate: boolean;
  sessionId:   string | null;
  capturedAt:  string; // ISO-8601
}
