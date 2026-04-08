/**
 * Webhooks service — Step 1.27
 *
 * Manages the lifecycle of outgoing webhook registrations and their delivery
 * history.  The actual HTTP delivery is performed asynchronously by the BullMQ
 * worker in `webhooks.queue.ts`; this service handles only CRUD and history
 * queries.
 *
 * ── Endpoints served ──────────────────────────────────────────────────────────
 *   GET    /api/webhooks                   listWebhooks
 *   POST   /api/webhooks                   createWebhook
 *   GET    /api/webhooks/:id               getWebhookById
 *   PATCH  /api/webhooks/:id               updateWebhook
 *   DELETE /api/webhooks/:id               deleteWebhook
 *   GET    /api/webhooks/:id/deliveries    listWebhookDeliveries
 *   POST   /api/webhooks/:id/test          testWebhook
 *
 * ── Security ──────────────────────────────────────────────────────────────────
 *   All routes require ADMIN role.  No feature flag gate — outgoing webhooks
 *   are always available once configured (same pattern as /api/admin).
 *
 * ── Secret generation ─────────────────────────────────────────────────────────
 *   On `createWebhook` a 32-byte cryptographically random secret is generated
 *   and returned ONCE in the response.  It is stored in plain-text in the DB
 *   (Phase 2: encrypt at rest with KMS).  Callers MUST copy this secret
 *   immediately — it will never be returned again in list / get responses
 *   (the `secret` field is stripped from all subsequent reads).
 *
 * Industry reference:
 *   GitHub, Stripe, Shopify, Calendly, and Acuity all use HMAC-SHA256 signed
 *   webhooks delivered asynchronously via a persistent job queue.  The
 *   one-time secret reveal pattern follows GitHub's webhook creation flow.
 */

import crypto                                  from 'crypto';
import { Prisma }                              from '@prisma/client';

import { prisma }                              from '../../lib/prisma';
import { AppError }                            from '../../errors/AppError';
import { paginate, PaginatedResult }           from '../../utils/paginate';
import { logger }                              from '../../utils/logger';
import { enqueueWebhookEvent }                 from './webhooks.queue';
import type {
  ListWebhooksQuery,
  CreateWebhookBody,
  UpdateWebhookBody,
  ListDeliveriesQuery,
  WebhookEvent,
} from './webhooks.schema';

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/**
 * Public webhook shape — used in list responses.
 * The `secret` field is intentionally omitted to prevent accidental exposure.
 */
const webhookPublicSelect = {
  id:          true,
  url:         true,
  events:      true,
  description: true,
  isActive:    true,
  createdAt:   true,
  updatedAt:   true,
} satisfies Prisma.WebhookSelect;

/** Full shape including the secret — returned ONLY on creation. */
const webhookWithSecretSelect = {
  ...webhookPublicSelect,
  secret: true,
} satisfies Prisma.WebhookSelect;

/** Delivery history shape. */
const deliverySelect = {
  id:         true,
  webhookId:  true,
  event:      true,
  payload:    true,
  statusCode: true,
  response:   true,
  durationMs: true,
  success:    true,
  error:      true,
  attempt:    true,
  createdAt:  true,
} satisfies Prisma.WebhookDeliverySelect;

// ─── Inferred return types ────────────────────────────────────────────────────

export type WebhookPublic     = Prisma.WebhookGetPayload<{ select: typeof webhookPublicSelect }>;
export type WebhookWithSecret = Prisma.WebhookGetPayload<{ select: typeof webhookWithSecretSelect }>;
export type DeliveryRecord    = Prisma.WebhookDeliveryGetPayload<{ select: typeof deliverySelect }>;

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of registered webhooks.
 * Optionally filter by `isActive`.
 */
export async function listWebhooks(
  query: ListWebhooksQuery,
): Promise<PaginatedResult<WebhookPublic>> {
  const where: Prisma.WebhookWhereInput = {};
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  return paginate(prisma.webhook, {
    where,
    orderBy: { createdAt: 'desc' },
    select:  webhookPublicSelect,
  }, { page: query.page, limit: query.limit });
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

/**
 * Returns a single webhook by ID (secret excluded).
 * Throws 404 if not found.
 */
export async function getWebhookById(id: string): Promise<WebhookPublic> {
  const webhook = await prisma.webhook.findUnique({
    where:  { id },
    select: webhookPublicSelect,
  });

  if (!webhook) {
    throw new AppError(404, 'WEBHOOK_NOT_FOUND', `Webhook '${id}' not found`);
  }

  return webhook;
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Creates a new webhook registration.
 *
 * A cryptographically random 32-byte secret is generated automatically and
 * returned ONCE in this response.  The caller must store it securely — it
 * will not be returned by any other endpoint.
 */
export async function createWebhook(data: CreateWebhookBody): Promise<WebhookWithSecret> {
  const secret = crypto.randomBytes(32).toString('hex'); // 64 hex chars

  const webhook = await prisma.webhook.create({
    data: {
      url:         data.url,
      events:      data.events,
      description: data.description ?? null,
      isActive:    data.isActive ?? true,
      secret,
    },
    select: webhookWithSecretSelect,
  });

  logger.info('Webhook registered', { id: webhook.id, url: webhook.url, events: webhook.events });

  return webhook;
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Partially updates a webhook registration.
 * Throws 404 if not found.
 */
export async function updateWebhook(
  id:   string,
  data: UpdateWebhookBody,
): Promise<WebhookPublic> {
  await assertWebhookExists(id);

  const updated = await prisma.webhook.update({
    where:  { id },
    data: {
      ...(data.url         !== undefined && { url: data.url }),
      ...(data.events      !== undefined && { events: data.events }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive    !== undefined && { isActive: data.isActive }),
    },
    select: webhookPublicSelect,
  });

  logger.info('Webhook updated', { id });

  return updated;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Permanently deletes a webhook and all its delivery history.
 * Throws 404 if not found.
 */
export async function deleteWebhook(id: string): Promise<void> {
  await assertWebhookExists(id);

  await prisma.webhook.delete({ where: { id } });

  logger.info('Webhook deleted', { id });
}

// ─── Delivery history ─────────────────────────────────────────────────────────

/**
 * Returns a paginated delivery history for a specific webhook.
 * Optionally filter by `success` (true = delivered, false = failed).
 * Throws 404 if the webhook is not found.
 */
export async function listWebhookDeliveries(
  webhookId: string,
  query:     ListDeliveriesQuery,
): Promise<PaginatedResult<DeliveryRecord>> {
  await assertWebhookExists(webhookId);

  const where: Prisma.WebhookDeliveryWhereInput = { webhookId };
  if (query.success !== undefined) {
    where.success = query.success;
  }

  return paginate(prisma.webhookDelivery, {
    where,
    orderBy: { createdAt: 'desc' },
    select:  deliverySelect,
  }, { page: query.page, limit: query.limit });
}

// ─── Test delivery ────────────────────────────────────────────────────────────

/**
 * Enqueues a synthetic `webhook.test` event for an active webhook so the
 * operator can verify connectivity and signature verification without
 * waiting for a real business event.
 *
 * The test payload is a minimal envelope:
 *   { event: 'webhook.test', timestamp: <ISO>, webhookId: <id> }
 *
 * Throws 404 if the webhook is not found.
 * Throws 422 if the webhook is inactive (can't test a disabled endpoint).
 */
export async function testWebhook(id: string): Promise<{ queued: true }> {
  const webhook = await prisma.webhook.findUnique({
    where:  { id },
    select: { id: true, isActive: true },
  });

  if (!webhook) {
    throw new AppError(404, 'WEBHOOK_NOT_FOUND', `Webhook '${id}' not found`);
  }

  if (!webhook.isActive) {
    throw new AppError(
      422,
      'WEBHOOK_INACTIVE',
      'Cannot test an inactive webhook. Activate it first.',
    );
  }

  // Enqueue directly to this specific webhook, bypassing the "find all active" logic
  await enqueueWebhookEvent('webhook.test' as WebhookEvent, {
    event:     'webhook.test',
    timestamp: new Date().toISOString(),
    webhookId: id,
  }, [id]);

  logger.info('Webhook test delivery queued', { id });

  return { queued: true };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function assertWebhookExists(id: string): Promise<void> {
  const exists = await prisma.webhook.findUnique({
    where:  { id },
    select: { id: true },
  });

  if (!exists) {
    throw new AppError(404, 'WEBHOOK_NOT_FOUND', `Webhook '${id}' not found`);
  }
}

// Re-export for convenience (processor imports from here via the queue)
export type { WebhookEvent } from './webhooks.schema';
