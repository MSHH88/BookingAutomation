/**
 * Review-request BullMQ worker — Step 1.19
 *
 * Processes `review-request` jobs that were scheduled by
 * `enqueueReviewRequest` (reviews.queue.ts) 36 hours after a booking
 * transitions to COMPLETED.
 *
 * ── What the processor does ───────────────────────────────────────────────────
 *   For each job it calls `sendEmail('review-request', customerEmail, vars)`
 *   so the customer receives a personalised, studio-branded email asking for
 *   a Google review.
 *
 * ── Separation from reviews.queue.ts ──────────────────────────────────────────
 *   The processor lives in its own file so that the heavy dependency chain
 *   (sendEmail → Resend SDK → Handlebars → Prisma) is never loaded in unit
 *   tests that only exercise the producer side (enqueueReviewRequest).
 *   server.ts is the only file that imports from this module.
 *
 * ── Template key ──────────────────────────────────────────────────────────────
 *   `review-request` — must exist in the `EmailTemplate` DB table.
 *   Expected Handlebars variables:
 *     {{ customerName }}   — customer's first/full name
 *     {{ studioName }}     — studio display name
 *     {{ googleReviewUrl }}— Google review deep-link URL
 *     {{ artistName }}     — performing artist name (fallback: studioName)
 *     {{ serviceName }}    — service performed (fallback: "appointment")
 *
 * ── Error handling ────────────────────────────────────────────────────────────
 *   • TEMPLATE_NOT_FOUND / TEMPLATE_INACTIVE:
 *       Retrying a misconfigured template is futile.  The error is logged and
 *       the job is silently completed (not failed) so it does not fill the
 *       dead-letter queue.  Admins must create/activate the template.
 *   • All other errors (Resend API error, network timeout):
 *       Propagated to BullMQ — the standard 3-attempt exponential back-off
 *       retry policy (configured in reviews.queue.ts) applies.
 *
 * ── Industry reference ────────────────────────────────────────────────────────
 *   Fresha, Booksy, and Acuity Scheduling all send one review request per
 *   completed appointment via a background job, never blocking the booking
 *   flow.  36 h post-completion is consistent with Fresha's default cadence.
 */
import { Worker, Job } from 'bullmq';
import Redis           from 'ioredis';

import { config }     from '../../config';
import { logger }     from '../../utils/logger';
import { sendEmail }  from '../notifications/notifications.service';
import { AppError }   from '../../errors/AppError';
import {
  REVIEW_QUEUE_NAME,
  type ReviewJobData,
} from './reviews.queue';

// ─── Redis connection factory ─────────────────────────────────────────────────

/**
 * Creates a dedicated ioredis connection for the BullMQ Worker.
 * Uses the same options as the Queue connection in reviews.queue.ts.
 */
function createBullConnection(): Redis {
  const url = config.REDIS_URL || 'redis://localhost:6379';
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
    lazyConnect:          true,
  });
}

// ─── Email template key ───────────────────────────────────────────────────────

/**
 * Key used to look up the review-request email template in the DB.
 * Exported for test assertions.
 */
export const REVIEW_EMAIL_TEMPLATE_KEY = 'review-request' as const;

// ─── Job processor ────────────────────────────────────────────────────────────

/**
 * Processes a single review-request job.
 *
 * Exported (not just passed inline) so unit tests can call it directly
 * without needing a live BullMQ Worker.
 */
export async function processReviewJob(job: Job<ReviewJobData>): Promise<void> {
  const {
    bookingId,
    customerEmail,
    customerName,
    studioName,
    googleReviewUrl,
    artistName,
    serviceName,
  } = job.data;

  logger.info('Processing review-request job', {
    jobId:     job.id,
    bookingId,
    to:        customerEmail,
  });

  try {
    await sendEmail(REVIEW_EMAIL_TEMPLATE_KEY, customerEmail, {
      customerName,
      studioName,
      googleReviewUrl,
      artistName:  artistName ?? studioName,
      serviceName: serviceName ?? 'appointment',
    });

    logger.info('Review-request email sent', {
      jobId:     job.id,
      bookingId,
      to:        customerEmail,
    });
  } catch (err: unknown) {
    // Template misconfiguration errors are unrecoverable — retrying will not
    // help.  Log the error at error level for visibility, then return without
    // re-throwing so BullMQ marks this job as completed (not failed).
    // Admins should be alerted via log monitoring to fix the template.
    if (
      err instanceof AppError &&
      (err.code === 'TEMPLATE_NOT_FOUND' || err.code === 'TEMPLATE_INACTIVE')
    ) {
      logger.error('Review-request email template unavailable — job will not retry', {
        jobId:     job.id,
        bookingId,
        errorCode: err.code,
        message:   err.message,
      });
      return; // treat as completed — re-enqueue would loop forever
    }

    // All other errors (Resend API failure, network timeout) should propagate
    // so BullMQ applies the retry/back-off policy defined in reviews.queue.ts.
    throw err;
  }
}

// ─── Worker factory ───────────────────────────────────────────────────────────

/**
 * Creates and starts the review-request BullMQ Worker.
 *
 * Called once from `server.ts` during application startup — before the HTTP
 * server begins accepting connections so that any delayed jobs recovered from
 * Redis are processed immediately.
 *
 * Concurrency is set to 3 — review emails are low-volume (one per completed
 * booking) and Resend's free tier rate limit is 100 emails/day; 3 concurrent
 * dispatches provides adequate throughput for even a busy studio without
 * risk of rate-limit exhaustion.
 *
 * @returns The running Worker instance (stored by server.ts for graceful
 *          shutdown via `worker.close()`).
 */
export function startReviewWorker(): Worker<ReviewJobData> {
  const worker = new Worker<ReviewJobData>(
    REVIEW_QUEUE_NAME,
    processReviewJob,
    {
      connection:  createBullConnection(),
      concurrency: 3,
    },
  );

  worker.on('completed', (job: Job<ReviewJobData>) => {
    logger.info('Review-request job completed', {
      jobId:     job.id,
      bookingId: job.data.bookingId,
      to:        job.data.customerEmail,
    });
  });

  worker.on('failed', (job: Job<ReviewJobData> | undefined, error: Error) => {
    logger.error('Review-request job failed', {
      jobId:     job?.id,
      bookingId: job?.data?.bookingId,
      to:        job?.data?.customerEmail,
      error:     error.message,
      attempt:   job?.attemptsMade,
    });
  });

  logger.info('Review worker started', { queue: REVIEW_QUEUE_NAME, concurrency: 3 });
  return worker;
}
