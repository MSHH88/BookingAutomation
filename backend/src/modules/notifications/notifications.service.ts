/**
 * Notifications service — Step 1.15
 *
 * Transactional email engine for the BookingAutomation platform.
 *
 * This service provides two distinct layers:
 *
 * ── 1. Template Management (CRUD) ────────────────────────────────────────────
 *   Email templates are stored in the `EmailTemplate` Prisma model.
 *   Each template has:
 *     - key       : unique slug used to look it up (e.g. "booking-confirmed")
 *     - subject   : email subject line (Handlebars-enabled)
 *     - htmlBody  : full HTML body (Handlebars-enabled)
 *     - variables : JSON array of expected placeholder names (documentation)
 *     - isActive  : flag — inactive templates cannot be sent
 *
 * ── 2. Email Dispatch (Internal utility) ──────────────────────────────────────
 *   `sendEmail(key, to, vars)` — the primary internal function called by
 *   other services (bookings, invoices, quotes).  It:
 *     1. Loads the template from DB (throws if not found or inactive)
 *     2. Compiles subject + htmlBody with Handlebars, substituting vars
 *     3. Dispatches via Resend SDK
 *     4. Logs success / failure
 *
 *   EMAIL_REMINDERS_ENABLED feature flag is NOT checked here — individual
 *   callers (bookings, invoices) decide whether to send based on their own
 *   feature flag checks.  This keeps the notification service generic.
 *
 * Industry references:
 *   Fresha, Booksy, and Acuity all store transactional email templates in a DB
 *   (editable by studio owners) and render them with a template engine before
 *   dispatching via SendGrid / Postmark / Resend.
 *
 * Phase 2 (BullMQ):
 *   `sendEmail` will enqueue a job rather than dispatch synchronously, giving
 *   retry semantics, delivery tracking, and rate-limit compliance.
 *
 * Email side-effects gated by EMAIL_REMINDERS_ENABLED feature flag:
 *   Callers (bookings, invoices) check the flag before calling sendEmail.
 *   sendEmail itself is unconditional so it can be called from admin test-send.
 */
import Handlebars from 'handlebars';
import { Prisma } from '@prisma/client';

import { prisma }                    from '../../lib/prisma';
import { resend }                    from '../../lib/resend';
import { config }                    from '../../config';
import { AppError }                  from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import { logger }                    from '../../utils/logger';
import type {
  ListTemplatesQuery,
  CreateTemplateBody,
  UpdateTemplateBody,
  SendTestBody,
} from './notifications.schema';

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/**
 * Full template detail shape — returned by get, create, update, send-test.
 */
const templateDetailSelect = {
  id:        true,
  tenantId:  true,
  key:       true,
  subject:   true,
  htmlBody:  true,
  variables: true,
  isActive:  true,
  updatedAt: true,
} satisfies Prisma.EmailTemplateSelect;

/**
 * Slim list shape — returned by GET /api/notifications/templates.
 * Omits htmlBody to keep list responses small.
 */
const templateListSelect = {
  id:        true,
  tenantId:  true,
  key:       true,
  subject:   true,
  variables: true,
  isActive:  true,
  updatedAt: true,
} satisfies Prisma.EmailTemplateSelect;

// ─── Inferred return types ────────────────────────────────────────────────────

export type TemplateDetail   = Prisma.EmailTemplateGetPayload<{ select: typeof templateDetailSelect }>;
export type TemplateListItem = Prisma.EmailTemplateGetPayload<{ select: typeof templateListSelect }>;

// ─── Public API — Template Management ────────────────────────────────────────

/**
 * List all email templates (ADMIN only).
 *
 * Supports optional `isActive` filter and pagination.
 * Ordered by key ascending so templates appear in alphabetical order.
 */
export async function listTemplates(
  tenantId: string | null,
  query: ListTemplatesQuery,
): Promise<PaginatedResult<TemplateListItem>> {
  const where: Prisma.EmailTemplateWhereInput = { tenantId };

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  return paginate<TemplateListItem>(
    prisma.emailTemplate,
    { where, select: templateListSelect, orderBy: { key: 'asc' } },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Fetch a single email template by its database ID (ADMIN only).
 *
 * Throws 404 when the template does not exist or belongs to a different tenant.
 */
export async function getTemplateById(tenantId: string | null, id: string): Promise<TemplateDetail> {
  const template = await prisma.emailTemplate.findUnique({
    where:  { id },
    select: templateDetailSelect,
  });

  if (!template) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', `Email template '${id}' not found`);
  }

  if (template.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this template');
  }

  return template;
}

/**
 * Create a new email template (ADMIN only), scoped to the given tenant.
 *
 * The `key` must be unique within the tenant.
 * Throws 409 when a template with the same key already exists for this tenant.
 */
export async function createTemplate(tenantId: string | null, body: CreateTemplateBody): Promise<TemplateDetail> {
  const existing = await prisma.emailTemplate.findFirst({
    where:  { key: body.key, tenantId },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      409,
      'TEMPLATE_KEY_CONFLICT',
      `A template with key '${body.key}' already exists`,
    );
  }

  const template = await prisma.emailTemplate.create({
    data: {
      tenantId,
      key:       body.key,
      subject:   body.subject,
      htmlBody:  body.htmlBody,
      variables: body.variables,
      isActive:  body.isActive,
    },
    select: templateDetailSelect,
  });

  logger.info('Email template created', { templateId: template.id, key: template.key, tenantId });

  return template;
}

/**
 * Update an existing email template (ADMIN only).
 *
 * Supports partial updates — only the provided fields are changed.
 * Throws 404 when the template does not exist or 403 if cross-tenant.
 */
export async function updateTemplate(
  tenantId: string | null,
  id:   string,
  body: UpdateTemplateBody,
): Promise<TemplateDetail> {
  const existing = await prisma.emailTemplate.findUnique({
    where:  { id },
    select: { id: true, tenantId: true },
  });

  if (!existing) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', `Email template '${id}' not found`);
  }

  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this template');
  }

  const data: Prisma.EmailTemplateUpdateInput = {};
  if (body.subject   !== undefined) data.subject   = body.subject;
  if (body.htmlBody  !== undefined) data.htmlBody   = body.htmlBody;
  if (body.variables !== undefined) data.variables  = body.variables;
  if (body.isActive  !== undefined) data.isActive   = body.isActive;

  const updated = await prisma.emailTemplate.update({
    where:  { id },
    data,
    select: templateDetailSelect,
  });

  logger.info('Email template updated', { templateId: id, tenantId });

  return updated;
}

/**
 * Soft-delete an email template by setting isActive = false (ADMIN only).
 *
 * We never hard-delete templates — historical records and audit trails remain
 * intact.  Deactivated templates cannot be dispatched via `sendEmail`.
 *
 * Throws 404 when the template does not exist or 403 if cross-tenant.
 * Throws 409 when the template is already inactive.
 */
export async function deleteTemplate(tenantId: string | null, id: string): Promise<TemplateDetail> {
  const existing = await prisma.emailTemplate.findUnique({
    where:  { id },
    select: { id: true, isActive: true, tenantId: true },
  });

  if (!existing) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', `Email template '${id}' not found`);
  }

  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this template');
  }

  if (!existing.isActive) {
    throw new AppError(
      409,
      'TEMPLATE_ALREADY_INACTIVE',
      `Email template '${id}' is already inactive`,
    );
  }

  const updated = await prisma.emailTemplate.update({
    where:  { id },
    data:   { isActive: false },
    select: templateDetailSelect,
  });

  logger.info('Email template deactivated', { templateId: id, tenantId });

  return updated;
}

// ─── Public API — Email Dispatch ──────────────────────────────────────────────

/**
 * Core email dispatch function.
 *
 * Called internally by other services:
 *   - bookings.service  → "booking-confirmed", "booking-cancelled",
 *                          "booking-rescheduled", "review-request"
 *   - invoices.service  → "invoice-sent"
 *   - quotes.service    → "quote-sent"
 *
 * Steps:
 *   1. Load template by `key` from DB
 *   2. Guard: template must exist and be active
 *   3. Compile subject + htmlBody with Handlebars
 *   4. Send via Resend SDK
 *   5. Log outcome
 *
 * On Resend API failure the error is logged and re-thrown so the caller
 * can decide whether to surface it or treat it as a soft failure.
 *
 * @param key       - Template key (e.g. "booking-confirmed")
 * @param to        - Recipient email address
 * @param variables - Key-value pairs substituted into Handlebars placeholders
 */
export async function sendEmail(
  key:       string,
  to:        string,
  variables: Record<string, unknown> = {},
  tenantId?: string | null,
): Promise<void> {
  // Try tenant-specific template first, then fall back to global default
  let template = tenantId
    ? await prisma.emailTemplate.findFirst({
        where:  { key, tenantId, isActive: true },
        select: { id: true, subject: true, htmlBody: true, isActive: true },
      })
    : null;

  if (!template) {
    template = await prisma.emailTemplate.findFirst({
      where:  { key, tenantId: null, isActive: true },
      select: { id: true, subject: true, htmlBody: true, isActive: true },
    });
  }

  if (!template) {
    throw new AppError(
      404,
      'TEMPLATE_NOT_FOUND',
      `Email template '${key}' not found`,
    );
  }

  // ── Handlebars compile ────────────────────────────────────────────────────
  // noEscape for subject: subjects are plain text — HTML entities like &amp;
  // or &#x27; must not appear in the email subject field.
  const renderedSubject = Handlebars.compile(template.subject, { noEscape: true })(variables);
  const renderedHtml    = Handlebars.compile(template.htmlBody)(variables);

  const fromAddress = config.RESEND_FROM_EMAIL || 'noreply@bookingautomation.io';
  const fromName    = config.RESEND_FROM_NAME   || 'Booking Automation';

  // ── Resend dispatch ───────────────────────────────────────────────────────
  const { error } = await resend.emails.send({
    from:    `${fromName} <${fromAddress}>`,
    to:      [to],
    subject: renderedSubject,
    html:    renderedHtml,
  });

  if (error) {
    logger.error('Resend email failed', {
      key,
      to,
      resendError: error.message,
    });
    throw new AppError(
      502,
      'EMAIL_SEND_FAILED',
      `Failed to send email '${key}': ${error.message}`,
    );
  }

  logger.info('Email dispatched', {
    key,
    to,
    templateId: template.id,
  });
}

/**
 * Test-send an email template to a given recipient (ADMIN only).
 *
 * Loads the template by its database ID (not key) to allow sending even
 * inactive templates during development, then delegates to `sendEmail`
 * logic after overriding with the provided variables.
 *
 * This is the "Preview & Test" feature every professional ESP (Mailchimp,
 * Klaviyo, Postmark) exposes in their admin UI.
 *
 * @param id   - Template database ID
 * @param body - { to, variables }
 */
export async function sendTestEmail(
  tenantId: string | null,
  id:   string,
  body: SendTestBody,
): Promise<{ templateId: string; to: string; subject: string }> {
  const template = await prisma.emailTemplate.findUnique({
    where:  { id },
    select: { id: true, tenantId: true, subject: true, htmlBody: true, isActive: true, key: true },
  });

  if (!template) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', `Email template '${id}' not found`);
  }

  if (tenantId !== null && template.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this template');
  }

  const renderedSubject = Handlebars.compile(template.subject, { noEscape: true })(body.variables);
  const renderedHtml    = Handlebars.compile(template.htmlBody)(body.variables);

  const fromAddress = config.RESEND_FROM_EMAIL || 'noreply@bookingautomation.io';
  const fromName    = config.RESEND_FROM_NAME   || 'Booking Automation';

  const { error } = await resend.emails.send({
    from:    `${fromName} <${fromAddress}>`,
    to:      [body.to],
    subject: renderedSubject,
    html:    renderedHtml,
  });

  if (error) {
    logger.error('Resend test email failed', {
      templateId: id,
      to: body.to,
      resendError: error.message,
    });
    throw new AppError(
      502,
      'EMAIL_SEND_FAILED',
      `Failed to send test email for template '${id}': ${error.message}`,
    );
  }

  logger.info('Test email dispatched', {
    templateId: id,
    key: template.key,
    to: body.to,
  });

  return { templateId: id, to: body.to, subject: renderedSubject };
}
