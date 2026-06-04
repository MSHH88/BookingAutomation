/**
 * SMS BullMQ queue — Phase 1, Step 1.5
 *
 * Defines the SMS job contract, creates the persistent Queue instance,
 * and provides the `startSmsWorker` function that boots the background Worker.
 *
 * ── Architecture ──────────────────────────────────────────────────────────────
 *   - The Queue is created at module load (connection uses lazyConnect so no
 *     TCP handshake happens at import time — safe in tests).
 *   - `sendSmsMessage` is imported from `lib/twilio-sms` to keep the worker
 *     stateless and free of circular dependencies.
 *   - Template lookup happens at processing time so the latest version is always
 *     used. Falls back to a generic message when no template is found.
 *
 * ── Retry policy ──────────────────────────────────────────────────────────────
 *   3 attempts, exponential back-off starting at 2 s.
 *   Failed jobs retained: 100  |  Completed jobs retained: 20.
 */
import Redis                    from 'ioredis';
import { Queue, Worker, Job }   from 'bullmq';

import { config }              from '../../config';
import { logger }              from '../../utils/logger';
import { sendSmsMessage }      from '../../lib/twilio-sms';
import { renderTemplate }      from '../../lib/template-renderer';
import { prisma }              from '../../lib/prisma';

// ─── Constants ────────────────────────────────────────────────────────────────

export const SMS_QUEUE_NAME = 'sms' as const;

// ─── Job types ────────────────────────────────────────────────────────────────

export interface SmsJobData {
  /** Template key used to look up the SMS template from the database. */
  jobName: string;
  /** Recipient phone number (E.164 format). */
  to: string;
  /** Customer display name used in the message greeting. */
  customerName: string;
  /** Tenant ID for multi-tenant template lookup (optional). */
  tenantId?: string;
  /** Variable values to interpolate into the template body. */
  variables: Record<string, string | number | undefined>;
}

// ─── Redis connection factory ─────────────────────────────────────────────────

/**
 * Creates a dedicated ioredis connection for BullMQ.
 *
 * BullMQ's Queue and Worker each need their own connection — sharing a single
 * ioredis instance between different BullMQ roles causes command-pipeline
 * conflicts.  `lazyConnect: true` prevents TCP handshakes at module import
 * time, keeping test runs fast.
 */
function createBullConnection(): Redis {
  const url = config.REDIS_URL || 'redis://localhost:6379';
  return new Redis(url, {
    maxRetriesPerRequest: null,   // required by BullMQ
    enableReadyCheck:     false,  // skip PING on startup
    lazyConnect:          true,   // connect only on first command
  });
}

// ─── Queue instance ───────────────────────────────────────────────────────────

/**
 * Singleton BullMQ Queue used by the service-layer enqueue helpers.
 *
 * Exported so that tests can spy on `smsQueue.add` via jest mocks.
 */
export const smsQueue = new Queue<SmsJobData>(SMS_QUEUE_NAME, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts:          3,
    backoff:           { type: 'exponential', delay: 2000 },
    removeOnComplete:  { count: 20 },
    removeOnFail:      { count: 100 },
  },
});

// ─── Job processor ────────────────────────────────────────────────────────────

/**
 * Processes a single SMS job.
 *
 * Looks up the SMS template from the database using the jobName as the key.
 * Falls back to a generic message when no template is found.
 * Errors propagate so BullMQ applies the configured retry / back-off policy.
 */
async function processSmsJob(job: Job<SmsJobData>): Promise<void> {
  const { to, jobName, tenantId, variables } = job.data;

  // Look up template from DB
  const template = await prisma.smsTemplate.findFirst({
    where: { key: jobName, tenantId: tenantId ?? null, isActive: true },
    select: { body: true },
  });

  if (!template) {
    logger.warn('SMS template not found, using fallback', { jobName, tenantId });
    await sendSmsMessage(to, `A message from your service provider.`);
    return;
  }

  const rendered = renderTemplate(template.body, variables as Record<string, string | number | undefined>);
  await sendSmsMessage(to, rendered);
}

// ─── Worker factory ───────────────────────────────────────────────────────────

/**
 * Creates and starts the SMS BullMQ Worker.
 *
 * Concurrency is set to 5 — Twilio's SMS API supports well above this
 * rate limit so multiple jobs are processed in parallel without throttling.
 *
 * @returns The running Worker instance (can be used for graceful shutdown).
 */
export function startSmsWorker(): Worker<SmsJobData> {
  const worker = new Worker<SmsJobData>(
    SMS_QUEUE_NAME,
    processSmsJob,
    {
      connection:  createBullConnection(),
      concurrency: 5,
    },
  );

  worker.on('completed', (job: Job<SmsJobData>) => {
    logger.info('SMS job completed', {
      jobId:   job.id,
      jobName: job.data.jobName,
    });
  });

  worker.on('failed', (job: Job<SmsJobData> | undefined, error: Error) => {
    logger.error('SMS job failed', {
      jobId:   job?.id,
      jobName: job?.data?.jobName,
      error:   error.message,
    });
  });

  logger.info('SMS worker started', { queue: SMS_QUEUE_NAME, concurrency: 5 });
  return worker;
}
