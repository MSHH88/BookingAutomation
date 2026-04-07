/**
 * Review-request BullMQ queue — Step 1.19
 *
 * Provides the job data contract, the persistent Queue instance, and the
 * `enqueueReviewRequest` helper that bookings.service.ts calls whenever a
 * booking transitions to COMPLETED.
 *
 * ── Architecture ──────────────────────────────────────────────────────────────
 *   This file is the "producer" side of the review-request pipeline:
 *     Queue  (here)                 → imported by bookings.service.ts (enqueue)
 *     Worker (reviews.processor.ts) → imported by server.ts (startup only)
 *
 *   Keeping the two sides in separate files prevents circular imports and
 *   means the entire processor dependency tree (sendEmail, Resend SDK) is
 *   never loaded in unit tests that only exercise the producer.
 *
 * ── Job life cycle ─────────────────────────────────────────────────────────────
 *   completeBooking
 *     → enqueueReviewRequest (bookings.service.ts)
 *     → BullMQ delayed queue (36 h default)
 *     → processReviewJob (reviews.processor.ts)
 *     → sendEmail('review-request', customerEmail, vars)
 *
 * ── Feature flag ──────────────────────────────────────────────────────────────
 *   Gated by REVIEW_REQUEST_ENABLED.  When OFF the helper returns immediately
 *   without touching Redis — disabling the feature costs zero overhead.
 *
 * ── Retry policy ──────────────────────────────────────────────────────────────
 *   3 attempts, exponential back-off starting at 5 s.
 *   Failed jobs retained: 100  |  Completed jobs retained: 20.
 *
 * Industry reference:
 *   Fresha, Booksy, and Vagaro all schedule a single review request 24–48 h
 *   after a completed appointment.  36 h is the empirically measured sweet
 *   spot — early enough that the experience is fresh, late enough that the
 *   customer is not annoyed the moment they step outside.
 */
import Redis    from 'ioredis';
import { Queue } from 'bullmq';

import { config }          from '../../config';
import { logger }          from '../../utils/logger';
import { getDefaultFlags } from '../../config/businessType';

// ─── Constants ────────────────────────────────────────────────────────────────

export const REVIEW_QUEUE_NAME = 'review-request' as const;
export const REVIEW_JOB_NAME   = 'review-request' as const;

/** Default delay before a review-request job fires: 36 hours in milliseconds. */
export const REVIEW_DEFAULT_DELAY_MS = 36 * 60 * 60 * 1_000;

// ─── Job data ─────────────────────────────────────────────────────────────────

/**
 * Payload embedded in every review-request BullMQ job.
 *
 * All fields required to send the email are captured at enqueue-time so the
 * processor is completely stateless and DB-free — enabling cheap, safe retries.
 */
export interface ReviewJobData {
  /** Booking ID — used for structured logging. */
  bookingId: string;
  /** Customer email address — primary delivery channel. */
  customerEmail: string;
  /** Customer display name — used for personalisation. */
  customerName: string;
  /** Studio display name used in the email body. */
  studioName: string;
  /** Google Review URL embedded in the email CTA. May be empty string. */
  googleReviewUrl: string;
  /** Artist display name — optional, used for personalisation. */
  artistName?: string;
  /** Service name — optional, used for personalisation. */
  serviceName?: string;
}

// ─── Enqueue parameters ───────────────────────────────────────────────────────

/**
 * Parameters accepted by `enqueueReviewRequest`.
 * Identical to ReviewJobData plus an optional delay override.
 */
export interface EnqueueReviewParams {
  bookingId:       string;
  customerEmail:   string;
  customerName:    string;
  studioName:      string;
  googleReviewUrl: string;
  artistName?:     string;
  serviceName?:    string;
  /**
   * Override the default 36-hour delay in milliseconds.
   * Intended for automated tests — do not use in production callers.
   */
  delayMs?: number;
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
    maxRetriesPerRequest: null,  // required by BullMQ
    enableReadyCheck:     false, // skip PING on startup
    lazyConnect:          true,  // connect only on first command
  });
}

// ─── Queue instance ───────────────────────────────────────────────────────────

/**
 * Singleton BullMQ Queue for review-request jobs.
 *
 * Exported so that server.ts can call `.close()` during graceful shutdown
 * and tests can spy on `.add` via jest mocks.
 */
export const reviewQueue = new Queue<ReviewJobData>(REVIEW_QUEUE_NAME, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts:         3,
    backoff:          { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 20 },
    removeOnFail:     { count: 100 },
  },
});

// ─── Public enqueue helper ────────────────────────────────────────────────────

/**
 * Schedules a `review-request` job with a 36-hour delay (default).
 *
 * Guards applied before enqueuing:
 *  1. REVIEW_REQUEST_ENABLED feature flag — silently no-ops when OFF.
 *  2. customerEmail must be non-empty — no point scheduling an email
 *     with no recipient address.
 *
 * Fire-and-forget: any queue error is caught and logged so that a Redis
 * outage never rolls back the parent booking-complete transaction.
 *
 * Called from: bookings.service.ts → completeBooking
 */
export async function enqueueReviewRequest(params: EnqueueReviewParams): Promise<void> {
  const flags = getDefaultFlags();
  if (!flags['REVIEW_REQUEST_ENABLED']) return;

  if (!params.customerEmail) return; // nothing to send

  const delayMs = params.delayMs ?? REVIEW_DEFAULT_DELAY_MS;

  const jobData: ReviewJobData = {
    bookingId:       params.bookingId,
    customerEmail:   params.customerEmail,
    customerName:    params.customerName,
    studioName:      params.studioName,
    googleReviewUrl: params.googleReviewUrl,
    artistName:      params.artistName,
    serviceName:     params.serviceName,
  };

  try {
    await reviewQueue.add(REVIEW_JOB_NAME, jobData, { delay: delayMs });
    logger.info('Review-request job enqueued', {
      bookingId: params.bookingId,
      delayMs,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Review-request job enqueue failed', {
      bookingId: params.bookingId,
      error:     errMsg,
    });
    // intentionally not re-thrown — caller is fire-and-forget
  }
}
