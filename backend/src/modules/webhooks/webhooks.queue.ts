/**
 * Webhooks BullMQ queue + worker — Step 1.27
 *
 * ── Producer (`enqueueWebhookEvent`) ─────────────────────────────────────────
 *   Called fire-and-forget by bookings.service, leads.service, and
 *   payments.service when key business events occur.
 *
 *   If `webhookIds` is provided (used by testWebhook), only those specific
 *   webhooks receive the delivery job.  Otherwise, ALL active webhooks
 *   subscribed to the event receive a job.
 *
 * ── Consumer (`startWebhookWorker`) ──────────────────────────────────────────
 *   Imported exclusively by server.ts.  For each job it:
 *     1. Fetches the webhook's URL + secret from the DB
 *     2. Serialises the payload to JSON
 *     3. Computes an HMAC-SHA256 signature over the raw JSON body
 *     4. POSTs to the webhook URL with a 10 s timeout
 *     5. Records the delivery result in `webhook_deliveries`
 *
 * ── Retry policy ──────────────────────────────────────────────────────────────
 *   3 attempts, exponential back-off starting at 5 s.
 *   Failed jobs retained: 200  |  Completed jobs retained: 100.
 *
 * ── Signature headers ────────────────────────────────────────────────────────
 *   X-BookingAutomation-Signature: sha256=<hex>
 *   X-BookingAutomation-Event:     <event>
 *   X-BookingAutomation-Delivery:  <deliveryId>
 *
 * Industry reference:
 *   GitHub, Stripe, Shopify, Calendly, and Acuity use HMAC-SHA256 delivery
 *   over HTTPS with deterministic delivery IDs.  Async queue delivery (BullMQ /
 *   Sidekiq / SQS) prevents slow consumer endpoints from blocking the main
 *   request-response cycle.
 */

import crypto                   from 'crypto';
import http                     from 'http';
import https                    from 'https';
import { Queue, Worker, Job }   from 'bullmq';
import Redis                    from 'ioredis';

import { config }    from '../../config';
import { logger }    from '../../utils/logger';
import { prisma }    from '../../lib/prisma';
import type { WebhookEvent } from './webhooks.schema';

// ─── Constants ────────────────────────────────────────────────────────────────

export const WEBHOOK_QUEUE_NAME = 'webhook-deliveries' as const;

/** HTTP timeout in milliseconds for each outgoing delivery. */
const DELIVERY_TIMEOUT_MS = 10_000;

// ─── Job contract ─────────────────────────────────────────────────────────────

export interface WebhookJobData {
  webhookId:  string;
  event:      WebhookEvent;
  payload:    Record<string, unknown>;
  deliveryId: string;
}

// ─── Connection factory ───────────────────────────────────────────────────────

function createBullConnection(): Redis {
  const url = config.REDIS_URL || 'redis://localhost:6379';
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
    lazyConnect:          true,
  });
}

// ─── Queue singleton ──────────────────────────────────────────────────────────

export const webhookQueue = new Queue<WebhookJobData>(WEBHOOK_QUEUE_NAME, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts:         3,
    backoff:          { type: 'exponential', delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail:     200,
  },
});

// ─── Producer helper ──────────────────────────────────────────────────────────

/**
 * Fire-and-forget: enqueues a delivery job for every active webhook
 * subscribed to `event`.
 *
 * @param event       Business event that occurred.
 * @param payload     Arbitrary JSON-serialisable event data.
 * @param webhookIds  Optional whitelist. When provided only these specific
 *                    webhook IDs receive the job (used by `testWebhook`).
 *                    When absent, ALL active subscribed webhooks receive it.
 *
 * Errors are caught and logged so a Redis outage never propagates as HTTP 5xx.
 */
export async function enqueueWebhookEvent(
  event:       WebhookEvent,
  payload:     Record<string, unknown>,
  webhookIds?: string[],
): Promise<void> {
  try {
    let hooks: { id: string }[];

    if (webhookIds && webhookIds.length > 0) {
      hooks = await prisma.webhook.findMany({
        where:  { id: { in: webhookIds }, isActive: true },
        select: { id: true },
      });
    } else {
      hooks = await prisma.webhook.findMany({
        where:  { isActive: true, events: { has: event } },
        select: { id: true },
      });
    }

    if (hooks.length === 0) return;

    await Promise.all(
      hooks.map(async (hook) => {
        // Pre-create a pending delivery record for audit trail
        const delivery = await prisma.webhookDelivery.create({
          data: {
            webhookId: hook.id,
            event,
            payload:  payload as import('@prisma/client').Prisma.InputJsonValue,
            attempt:  1,
            success:  false,
          },
          select: { id: true },
        });

        await webhookQueue.add(
          `${event}:${hook.id}`,
          { webhookId: hook.id, event, payload, deliveryId: delivery.id },
        );
      }),
    );
  } catch (err) {
    logger.warn('enqueueWebhookEvent failed — delivery skipped', {
      event,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Job processor ────────────────────────────────────────────────────────────

/**
 * Processes a single webhook delivery job.
 * Exported so unit tests can call it directly without a live BullMQ Worker.
 */
export async function processWebhookJob(job: Job<WebhookJobData>): Promise<void> {
  const { webhookId, event, payload, deliveryId } = job.data;

  logger.info('Processing webhook delivery', {
    jobId:      job.id,
    webhookId,
    event,
    deliveryId,
  });

  // 1. Fetch webhook record (URL + secret)
  const hook = await prisma.webhook.findUnique({
    where:  { id: webhookId },
    select: { url: true, secret: true, isActive: true },
  });

  if (!hook || !hook.isActive) {
    const reason = hook ? 'Webhook is inactive' : 'Webhook not found';
    logger.warn('Webhook delivery skipped', { webhookId, deliveryId, reason });
    await updateDelivery(deliveryId, {
      success: false,
      error:   reason,
      attempt: job.attemptsMade + 1,
    });
    return; // No throw — prevents pointless retries for deleted/disabled webhooks
  }

  // 2. Build envelope
  const envelope = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data:      payload,
  });

  // 3. Compute HMAC-SHA256 signature
  const sig = `sha256=${crypto.createHmac('sha256', hook.secret).update(envelope).digest('hex')}`;

  // 4. HTTP POST with timeout
  const startMs = Date.now();
  let statusCode: number | undefined;
  let response:   string | undefined;
  let errorMsg:   string | undefined;
  let success = false;

  try {
    const result = await httpPost(hook.url, envelope, {
      'Content-Type':                  'application/json',
      'X-BookingAutomation-Event':     event,
      'X-BookingAutomation-Delivery':  deliveryId,
      'X-BookingAutomation-Signature': sig,
      'User-Agent':                    'BookingAutomation-Webhooks/1.0',
    });

    statusCode = result.statusCode;
    response   = result.body.slice(0, 2048); // cap stored response at 2 KB
    success    = statusCode >= 200 && statusCode < 300;
    if (!success) errorMsg = `HTTP ${statusCode}`;
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  const durationMs = Date.now() - startMs;

  // 5. Update delivery record
  await updateDelivery(deliveryId, {
    statusCode,
    response,
    durationMs,
    success,
    error:   errorMsg,
    attempt: job.attemptsMade + 1,
  });

  logger.info('Webhook delivery complete', {
    jobId:      job.id,
    webhookId,
    event,
    deliveryId,
    statusCode,
    durationMs,
    success,
  });

  // Re-throw so BullMQ applies the retry / dead-letter policy on failure
  if (!success) {
    throw new Error(errorMsg ?? 'Webhook delivery failed');
  }
}

// ─── Worker factory ───────────────────────────────────────────────────────────

/**
 * Creates and starts the webhook delivery BullMQ Worker.
 * Called once from `server.ts` during application startup.
 *
 * Concurrency is set to 10 — deliveries are I/O-bound (HTTP POSTs) so
 * higher concurrency is safe and improves throughput during bursts.
 */
export function startWebhookWorker(): Worker<WebhookJobData> {
  const worker = new Worker<WebhookJobData>(
    WEBHOOK_QUEUE_NAME,
    processWebhookJob,
    {
      connection:  createBullConnection(),
      concurrency: 10,
    },
  );

  worker.on('completed', (job: Job<WebhookJobData>) => {
    logger.info('Webhook delivery job completed', {
      jobId:     job.id,
      webhookId: job.data.webhookId,
      event:     job.data.event,
    });
  });

  worker.on('failed', (job: Job<WebhookJobData> | undefined, error: Error) => {
    logger.error('Webhook delivery job failed', {
      jobId:     job?.id,
      webhookId: job?.data?.webhookId,
      event:     job?.data?.event,
      error:     error.message,
      attempt:   job?.attemptsMade,
    });
  });

  logger.info('Webhook worker started', {
    queue:       WEBHOOK_QUEUE_NAME,
    concurrency: 10,
  });

  return worker;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Updates a WebhookDelivery record after a delivery attempt. */
async function updateDelivery(
  id:   string,
  data: {
    statusCode?: number;
    response?:   string;
    durationMs?: number;
    success:     boolean;
    error?:      string;
    attempt:     number;
  },
): Promise<void> {
  try {
    await prisma.webhookDelivery.update({
      where: { id },
      data: {
        statusCode: data.statusCode ?? null,
        response:   data.response   ?? null,
        durationMs: data.durationMs ?? null,
        success:    data.success,
        error:      data.error      ?? null,
        attempt:    data.attempt,
      },
    });
  } catch (err) {
    // Delivery record updates are best-effort; never let a DB error
    // prevent the worker from completing / retrying the job
    logger.warn('Failed to update webhook delivery record', {
      deliveryId: id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Makes an HTTP/HTTPS POST request with a configurable timeout.
 * Returns the response status code and body as a plain string.
 */
function httpPost(
  url:     string,
  body:    string,
  headers: Record<string, string>,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const port    = parsed.port
      ? parseInt(parsed.port, 10)
      : parsed.protocol === 'https:' ? 443 : 80;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port,
        path:     parsed.pathname + parsed.search,
        method:   'POST',
        headers:  { ...headers, 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer | string) => { data += String(chunk); });
        res.on('end', () => resolve({
          statusCode: res.statusCode ?? 0,
          body:       data,
        }));
      },
    );

    req.setTimeout(DELIVERY_TIMEOUT_MS, () => {
      req.destroy(new Error(`Webhook delivery timed out after ${DELIVERY_TIMEOUT_MS} ms`));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
