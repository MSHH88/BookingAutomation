/**
 * Zod schemas for all lead-management request bodies and query strings.
 *
 * The Lead Capture API is universal across all 6 business types. The key
 * business-type-aware rule is:
 *   - `placement` (tattoo body location) is only **required** when the
 *     deployment business type is `tattoo_studio`.
 *   - For all other business types `placement` is entirely optional.
 *
 * Status transitions that ADMIN can apply via PATCH /api/leads/:id/status:
 *   NEW → CONTACTED → QUOTED → BOOKED → COMPLETED
 *       ↘ CANCELLED / LOST (from any non-terminal state)
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

// ─── POST /api/leads ──────────────────────────────────────────────────────────

/**
 * Business-type-aware create schema.
 *
 * `placement` is required only when business type is `tattoo_studio`.
 * For all other types it is accepted but optional, so the single endpoint serves
 * all 6 business types without separate routes.
 */
function buildCreateLeadSchema() {
  // Tattoo placement is determined entirely by business type (tattoo studios only).
  // This is a startup-time configuration so we use the active business type directly.
  const placementRequired = activeBusinessType === 'tattoo_studio';

  /**
   * Tattoo placement — arbitrary JSON object from the body-map widget.
   *
   * We intentionally accept any object shape here because the placement
   * structure is driven by the frontend tattoo mannequin widget and can
   * evolve without a backend schema change (e.g. { area: 'left_arm' },
   * { area: 'back', zone: 'upper' }, etc.). The JSON column stores whatever
   * the widget emits. Phase 2 can tighten this to a discriminated union once
   * the widget API is stable.
   *
   * This field is only required when the business type is `tattoo_studio`.
   * For all other business types it is optional / null.
   */
  const placementField = placementRequired
    ? z
        .record(z.unknown())
        .refine((v) => Object.keys(v).length > 0, { message: 'Placement is required for this business type' })
    : z.record(z.unknown()).optional().nullable();

  return z.object({
    body: z.object({
      // ── Contact ───────────────────────────────────────────────────────────
      name:  str('Name', 100),
      email: z.string().trim().email('A valid email address is required'),
      phone,
      country: optStr(100),

      // ── Inquiry content ───────────────────────────────────────────────────
      description: str('Description', 2000),
      placement:   placementField,
      size:             optStr(100),
      colorPreference:  optStr(100),
      referenceImages:  z.array(z.string().url('Each reference image must be a valid URL')).max(10).optional(),
      preferredDates:   z.record(z.unknown()).optional().nullable(),

      // ── Service interest (all non-tattoo types) ───────────────────────────
      artistId:  optStr(50),
      styleId:   optStr(50),
      serviceId: optStr(50),

      // ── Attribution / analytics ───────────────────────────────────────────
      pageVisited: optStr(500),
      source:      optStr(100),
      utmSource:   optStr(200),
      utmMedium:   optStr(200),
      utmCampaign: optStr(200),
      deviceType:  optStr(50),

      // ── Communication prefs ───────────────────────────────────────────────
      preferWhatsApp:   z.boolean().optional(),
      marketingConsent: z.boolean().optional(),
    }),
  });
}

export const createLeadSchema = buildCreateLeadSchema();

// ─── GET /api/leads ───────────────────────────────────────────────────────────

export const listLeadsSchema = z.object({
  query: z.object({
    page:         z.string().optional(),
    limit:        z.string().optional(),
    status:       z.enum(['NEW', 'CONTACTED', 'QUOTED', 'BOOKED', 'COMPLETED', 'CANCELLED', 'LOST']).optional(),
    businessType: z.enum(['tattoo_studio', 'hair_salon', 'barber', 'nail_salon', 'masseuse', 'restaurant']).optional(),
    source:       z.string().trim().max(100).optional(),
    country:      z.string().trim().max(100).optional(),
    artistId:     z.string().trim().max(50).optional(),
    from:         z.string().optional(),
    to:           z.string().optional(),
  }),
});

// ─── GET /api/leads/:id ───────────────────────────────────────────────────────

export const getLeadByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Lead ID is required'),
  }),
});

// ─── GET /api/leads/export ────────────────────────────────────────────────────

export const exportLeadsSchema = z.object({
  query: z.object({
    status:       z.enum(['NEW', 'CONTACTED', 'QUOTED', 'BOOKED', 'COMPLETED', 'CANCELLED', 'LOST']).optional(),
    businessType: z.enum(['tattoo_studio', 'hair_salon', 'barber', 'nail_salon', 'masseuse', 'restaurant']).optional(),
    source:       z.string().trim().max(100).optional(),
    country:      z.string().trim().max(100).optional(),
    artistId:     z.string().trim().max(50).optional(),
    from:         z.string().optional(),
    to:           z.string().optional(),
  }),
});

// ─── PATCH /api/leads/:id/status ─────────────────────────────────────────────

/** All valid lead pipeline statuses. */
export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'BOOKED', 'COMPLETED', 'CANCELLED', 'LOST'] as const;
export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

/**
 * Valid status transitions.
 * A lead may advance forward in the pipeline or be cancelled/lost from any
 * non-terminal state. Once COMPLETED, CANCELLED or LOST no further moves are
 * allowed (guard enforced in service layer).
 */
export const VALID_TRANSITIONS: Record<LeadStatusValue, LeadStatusValue[]> = {
  NEW:       ['CONTACTED', 'QUOTED', 'BOOKED', 'CANCELLED', 'LOST'],
  CONTACTED: ['QUOTED', 'BOOKED', 'CANCELLED', 'LOST'],
  QUOTED:    ['BOOKED', 'CANCELLED', 'LOST'],
  BOOKED:    ['COMPLETED', 'CANCELLED', 'LOST'],
  COMPLETED: [],
  CANCELLED: [],
  LOST:      [],
};

export const updateLeadStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Lead ID is required'),
  }),
  body: z.object({
    status: z.enum(['NEW', 'CONTACTED', 'QUOTED', 'BOOKED', 'COMPLETED', 'CANCELLED', 'LOST'], {
      required_error: 'status is required',
      invalid_type_error: `status must be one of: ${LEAD_STATUSES.join(', ')}`,
    }),
  }),
});

// ─── PATCH /api/leads/:id/score ───────────────────────────────────────────────

export const updateLeadScoreSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Lead ID is required'),
  }),
  body: z.object({
    score: z
      .number({ required_error: 'score is required', invalid_type_error: 'score must be a number' })
      .int('score must be an integer')
      .min(0, 'score must be 0 or greater')
      .max(100, 'score must be 100 or less'),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateLeadBody     = z.infer<typeof createLeadSchema>['body'];
export type ListLeadsQuery     = z.infer<typeof listLeadsSchema>['query'];
export type ExportLeadsQuery   = z.infer<typeof exportLeadsSchema>['query'];
export type UpdateLeadStatusBody = z.infer<typeof updateLeadStatusSchema>['body'];
export type UpdateLeadScoreBody  = z.infer<typeof updateLeadScoreSchema>['body'];
