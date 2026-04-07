/**
 * Zod schemas for the Notifications API — Step 1.15
 *
 * Covers email template management and test-send endpoint.
 *
 * The Notifications module manages the `EmailTemplate` Prisma model and
 * exposes a `sendEmail(key, to, variables)` utility that is consumed
 * internally by other services (bookings, invoices, quotes).
 *
 * Role permissions:
 *   ADMIN : full CRUD on templates + test-send
 *
 * Template variable system:
 *   Each template stores a `variables` JSON array that declares which
 *   Handlebars placeholders the template uses (e.g. ["customerName", "startAt"]).
 *   The test-send endpoint accepts a freeform `variables` object that is
 *   merged into the rendered output.
 */
import { z } from 'zod';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Non-empty trimmed string. */
const reqStr = (label: string) =>
  z.string({ required_error: `${label} is required` }).min(1, `${label} cannot be empty`).trim();

// ─── GET /api/notifications/templates ────────────────────────────────────────

export const listTemplatesSchema = z.object({
  query: z.object({
    /**
     * Filter by active/inactive status.
     */
    isActive: z
      .enum(['true', 'false'])
      .optional()
      .transform((v: 'true' | 'false' | undefined) => (v === undefined ? undefined : v === 'true')),

    /**
     * Pagination — page number (1-based).
     */
    page: z.string().optional(),

    /**
     * Pagination — records per page (max 100).
     */
    limit: z.string().optional(),
  }),
});

export type ListTemplatesQuery = z.infer<typeof listTemplatesSchema>['query'];

// ─── GET /api/notifications/templates/:id ────────────────────────────────────

export const getTemplateByIdSchema = z.object({
  params: z.object({
    id: reqStr('id'),
  }),
});

// ─── POST /api/notifications/templates ───────────────────────────────────────

export const createTemplateSchema = z.object({
  body: z.object({
    /**
     * Unique machine-readable key used to look up the template in code.
     * E.g. "booking-confirmed", "quote-sent", "invoice-sent".
     * Letters, digits and hyphens only.
     */
    key: reqStr('key').regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'key must be lower-kebab-case (e.g. "booking-confirmed")',
    ),

    /** Email subject line — supports Handlebars variables like {{customerName}}. */
    subject: reqStr('subject'),

    /**
     * Full HTML body — supports Handlebars templating.
     * Minimum meaningful body: 10 chars.
     */
    htmlBody: reqStr('htmlBody').min(10, 'htmlBody must be at least 10 characters'),

    /**
     * Array of variable names declared in this template, e.g.
     * ["customerName", "bookingDate", "artistName"].
     * Used as documentation and for validation in the test-send endpoint.
     */
    variables: z
      .array(z.string().min(1))
      .default([]),

    /** Whether the template is active (default true). */
    isActive: z.boolean().optional().default(true),
  }),
});

export type CreateTemplateBody = z.infer<typeof createTemplateSchema>['body'];

// ─── PATCH /api/notifications/templates/:id ───────────────────────────────────

const updateTemplateBody = z.object({
  /** Updated subject line. */
  subject: z.string().min(1, 'subject cannot be empty').trim().optional(),

  /** Updated HTML body. */
  htmlBody: z
    .string()
    .min(10, 'htmlBody must be at least 10 characters')
    .trim()
    .optional(),

  /** Updated variable names list. */
  variables: z.array(z.string().min(1)).optional(),

  /** Toggle active/inactive status. */
  isActive: z.boolean().optional(),
});

type UpdateTemplateBodyRaw = z.infer<typeof updateTemplateBody>;

export const updateTemplateSchema = z.object({
  params: z.object({
    id: reqStr('id'),
  }),
  body: updateTemplateBody.refine(
    (b: UpdateTemplateBodyRaw) =>
      b.subject !== undefined ||
      b.htmlBody !== undefined ||
      b.variables !== undefined ||
      b.isActive !== undefined,
    { message: 'At least one field must be provided for update' },
  ),
});

export type UpdateTemplateBody = z.infer<typeof updateTemplateSchema>['body'];

// ─── DELETE /api/notifications/templates/:id ──────────────────────────────────

export const deleteTemplateSchema = z.object({
  params: z.object({
    id: reqStr('id'),
  }),
});

// ─── POST /api/notifications/templates/:id/send-test ─────────────────────────

export const sendTestSchema = z.object({
  params: z.object({
    id: reqStr('id'),
  }),
  body: z.object({
    /**
     * Recipient email address for the test email.
     */
    to: reqStr('to').email('to must be a valid email address'),

    /**
     * Variable values to substitute into the template during render.
     * Keys must match the template's declared `variables` list.
     * Additional keys are silently ignored.
     */
    variables: z.record(z.string(), z.unknown()).optional().default({}),
  }),
});

export type SendTestBody = z.infer<typeof sendTestSchema>['body'];
