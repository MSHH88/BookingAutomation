/**
 * Zod schemas for the SMS Templates API — Phase 1 (Messaging Foundation)
 *
 * Covers admin endpoints for managing SMS message templates:
 *   GET    /api/messages/sms-templates          — list templates
 *   GET    /api/messages/sms-templates/:key      — get single template
 *   PATCH  /api/messages/sms-templates/:key      — update template
 *   POST   /api/messages/sms-templates/:key/preview — preview rendered template
 *
 * Role permissions:
 *   ADMIN : all endpoints (gated by SMS_REMINDERS_ENABLED feature flag)
 */
import { z } from 'zod';

// ─── GET / — list templates ───────────────────────────────────────────────────

export const listSmsTemplatesSchema = z.object({
  query: z.object({
    /** Filter by active/inactive status. */
    isActive: z.enum(['true', 'false']).optional(),
    /** Page number (1-based). */
    page: z.string().regex(/^\d+$/, 'page must be a positive integer').optional(),
    /** Results per page. */
    limit: z.string().regex(/^\d+$/, 'limit must be a positive integer').optional(),
  }),
});

// ─── GET /:key — single template ─────────────────────────────────────────────

export const getSmsTemplateSchema = z.object({
  params: z.object({
    /** Template key identifier (e.g. "booking-confirmation", "appointment-reminder"). */
    key: z.string().min(1, 'key is required').trim(),
  }),
});

// ─── PATCH /:key — update template ───────────────────────────────────────────

export const updateSmsTemplateSchema = z.object({
  params: z.object({
    key: z.string().min(1, 'key is required').trim(),
  }),
  body: z
    .object({
      /** Template body text with {{variable}} placeholders. */
      body: z.string().min(1, 'body cannot be empty').max(1600).optional(),
      /** List of variable names expected by the template. */
      variables: z.array(z.string().min(1)).optional(),
      /** Enable or disable the template. */
      isActive: z.boolean().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: 'At least one field must be provided',
    }),
});

// ─── POST /:key/preview — preview rendered template ──────────────────────────

export const previewSmsTemplateSchema = z.object({
  params: z.object({
    key: z.string().min(1, 'key is required').trim(),
  }),
  body: z.object({
    /** Variable values to interpolate into the template body. */
    variables: z.record(z.string(), z.string()),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type ListSmsTemplatesQuery = z.infer<typeof listSmsTemplatesSchema>['query'];
export type GetSmsTemplateParams = z.infer<typeof getSmsTemplateSchema>['params'];
export type UpdateSmsTemplateParams = z.infer<typeof updateSmsTemplateSchema>['params'];
export type UpdateSmsTemplateBody = z.infer<typeof updateSmsTemplateSchema>['body'];
export type PreviewSmsTemplateParams = z.infer<typeof previewSmsTemplateSchema>['params'];
export type PreviewSmsTemplateBody = z.infer<typeof previewSmsTemplateSchema>['body'];
