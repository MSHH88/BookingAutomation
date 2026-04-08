/**
 * Webhooks Zod schemas — Step 1.27
 *
 * Defines every validated input shape for the webhook CRUD API and the
 * exhaustive list of event types that can be subscribed to.
 *
 * ── Supported event types ──────────────────────────────────────────────────────
 *   booking.created      — new booking row inserted
 *   booking.confirmed    — booking status → CONFIRMED
 *   booking.cancelled    — booking status → CANCELLED
 *   booking.completed    — booking status → COMPLETED
 *   booking.rescheduled  — booking start/end time changed
 *   lead.created         — new lead submitted via capture form
 *   lead.status_changed  — lead status updated by staff
 *   payment.succeeded    — Stripe payment_intent.succeeded received
 *   payment.refunded     — Stripe charge.refunded received
 *
 * ── Signature ─────────────────────────────────────────────────────────────────
 *   Every delivery POST includes:
 *     X-BookingAutomation-Event:    <event>
 *     X-BookingAutomation-Delivery: <delivery-id>
 *     X-BookingAutomation-Signature: sha256=<hmac-sha256-hex>
 *
 *   The HMAC is computed over the raw JSON body using the webhook's `secret`.
 *   Consumers should verify the signature before trusting the payload.
 */

import { z } from 'zod';

// ─── Supported event types ────────────────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  'booking.created',
  'booking.confirmed',
  'booking.cancelled',
  'booking.completed',
  'booking.rescheduled',
  'lead.created',
  'lead.status_changed',
  'payment.succeeded',
  'payment.refunded',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

// ─── CRUD schemas ─────────────────────────────────────────────────────────────

export const listWebhooksSchema = z.object({
  query: z.object({
    page:     z.coerce.number().int().min(1).optional().default(1),
    limit:    z.coerce.number().int().min(1).max(100).optional().default(20),
    isActive: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  }),
});

export const createWebhookSchema = z.object({
  body: z.object({
    url: z
      .string({ required_error: 'url is required' })
      .url('url must be a valid HTTPS URL')
      .max(2048, 'url must be at most 2048 characters'),
    events: z
      .array(z.enum(WEBHOOK_EVENTS), { required_error: 'events is required' })
      .min(1, 'At least one event type is required'),
    description: z.string().max(255).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const getWebhookByIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const updateWebhookSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      url:         z.string().url().max(2048).optional(),
      events:      z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
      description: z.string().max(255).nullable().optional(),
      isActive:    z.boolean().optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
      message: 'Request body must contain at least one field to update',
    }),
});

export const deleteWebhookSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const listDeliveriesSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  query: z.object({
    page:    z.coerce.number().int().min(1).optional().default(1),
    limit:   z.coerce.number().int().min(1).max(100).optional().default(20),
    success: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  }),
});

export const testWebhookSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// ─── Inferred types used by service + controller ──────────────────────────────

export type ListWebhooksQuery    = z.infer<typeof listWebhooksSchema>['query'];
export type CreateWebhookBody    = z.infer<typeof createWebhookSchema>['body'];
export type UpdateWebhookBody    = z.infer<typeof updateWebhookSchema>['body'];
export type ListDeliveriesQuery  = z.infer<typeof listDeliveriesSchema>['query'];
