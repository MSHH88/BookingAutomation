/**
 * Zod schemas for the Email Templates API — Phase 1 (Messaging Foundation)
 *
 * Covers admin endpoints for managing email message templates:
 *   GET    /api/messages/email-templates          — list templates
 *   GET    /api/messages/email-templates/:key      — get single template
 *   PATCH  /api/messages/email-templates/:key      — update template
 *   POST   /api/messages/email-templates/:key/preview — preview rendered template
 *
 * Role permissions:
 *   ADMIN : all endpoints (gated by EMAIL_REMINDERS_ENABLED feature flag)
 */
import { z } from 'zod';

// ─── GET / — list templates ───────────────────────────────────────────────────

export const listEmailTemplatesSchema = z.object({
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

export const getEmailTemplateSchema = z.object({
  params: z.object({
    /** Template key identifier (e.g. "booking-confirmation", "reminder"). */
    key: z.string().min(1, 'key is required').trim(),
  }),
});

// ─── PATCH /:key — update template ───────────────────────────────────────────

export const updateEmailTemplateSchema = z.object({
  params: z.object({
    key: z.string().min(1, 'key is required').trim(),
  }),
  body: z
    .object({
      /** Email subject line with optional {{variable}} placeholders. */
      subject: z.string().min(1, 'subject cannot be empty').max(500).optional(),
      /** HTML body of the email with optional {{variable}} placeholders. */
      htmlBody: z.string().min(1, 'htmlBody cannot be empty').optional(),
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

export const previewEmailTemplateSchema = z.object({
  params: z.object({
    key: z.string().min(1, 'key is required').trim(),
  }),
  body: z.object({
    /** Variable values to interpolate into the subject and htmlBody. */
    variables: z.record(z.string(), z.string()),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type ListEmailTemplatesQuery = z.infer<typeof listEmailTemplatesSchema>['query'];
export type GetEmailTemplateParams = z.infer<typeof getEmailTemplateSchema>['params'];
export type UpdateEmailTemplateParams = z.infer<typeof updateEmailTemplateSchema>['params'];
export type UpdateEmailTemplateBody = z.infer<typeof updateEmailTemplateSchema>['body'];
export type PreviewEmailTemplateParams = z.infer<typeof previewEmailTemplateSchema>['params'];
export type PreviewEmailTemplateBody = z.infer<typeof previewEmailTemplateSchema>['body'];
