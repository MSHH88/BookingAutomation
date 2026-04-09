/**
 * Zod schemas for the WhatsApp Templates API — Phase 1 (Messaging Foundation)
 *
 * Covers admin endpoints for managing WhatsApp message templates:
 *   GET    /api/messages/whatsapp-templates          — list templates
 *   GET    /api/messages/whatsapp-templates/:key      — get single template
 *   PATCH  /api/messages/whatsapp-templates/:key      — update template
 *   POST   /api/messages/whatsapp-templates/:key/preview — preview rendered template
 *
 * Role permissions:
 *   ADMIN : all endpoints (gated by WHATSAPP_CONTACT_ENABLED feature flag)
 */
import { z } from 'zod';

// ─── GET / — list templates ───────────────────────────────────────────────────

export const listWhatsAppTemplatesSchema = z.object({
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

export const getWhatsAppTemplateSchema = z.object({
  params: z.object({
    /** Template key identifier (e.g. "lead-inquiry", "booking-confirmed"). */
    key: z.string().min(1, 'key is required').trim(),
  }),
});

// ─── PATCH /:key — update template ───────────────────────────────────────────

export const updateWhatsAppTemplateSchema = z.object({
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

export const previewWhatsAppTemplateSchema = z.object({
  params: z.object({
    key: z.string().min(1, 'key is required').trim(),
  }),
  body: z.object({
    /** Variable values to interpolate into the template body. */
    variables: z.record(z.string(), z.string()),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type ListWhatsAppTemplatesQuery = z.infer<typeof listWhatsAppTemplatesSchema>['query'];
export type GetWhatsAppTemplateParams = z.infer<typeof getWhatsAppTemplateSchema>['params'];
export type UpdateWhatsAppTemplateParams = z.infer<typeof updateWhatsAppTemplateSchema>['params'];
export type UpdateWhatsAppTemplateBody = z.infer<typeof updateWhatsAppTemplateSchema>['body'];
export type PreviewWhatsAppTemplateParams = z.infer<typeof previewWhatsAppTemplateSchema>['params'];
export type PreviewWhatsAppTemplateBody = z.infer<typeof previewWhatsAppTemplateSchema>['body'];
