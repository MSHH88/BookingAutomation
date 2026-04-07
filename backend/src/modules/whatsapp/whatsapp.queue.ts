/**
 * WhatsApp BullMQ queue — Step 1.17
 *
 * Defines the job contract (name + data types), creates the persistent Queue
 * instance, implements the pure `buildWhatsAppMessage` message-body factory,
 * and provides the `startWhatsAppWorker` function that boots the background
 * Worker process.
 *
 * ── Job types ──────────────────────────────────────────────────────────────────
 *
 * | Job name                | Trigger                          | Delay             |
 * |-------------------------|----------------------------------|-------------------|
 * | `lead-inquiry`          | Lead created (opt-in)            | immediate         |
 * | `booking-confirmed`     | Booking status → CONFIRMED       | immediate         |
 * | `appointment-reminder`  | Booking status → CONFIRMED       | startAt − 24 h    |
 * | `post-visit-review`     | Booking status → COMPLETED       | +2 h              |
 * | `restaurant-reminder`   | Booking status → CONFIRMED (restaurant) | startAt − 2 h |
 *
 * ── Architecture ──────────────────────────────────────────────────────────────
 *   - The Queue is created at module load (connection uses lazyConnect so no
 *     TCP handshake happens at import time — safe in tests).
 *   - `sendWhatsAppMessage` is imported from `lib/twilio` to break the
 *     circular dependency that would arise if it lived in whatsapp.service.ts.
 *   - `startWhatsAppWorker()` is called once from server.ts startup.
 *     Step 1.18 will refactor into the central queue worker infrastructure.
 *
 * ── Retry policy ──────────────────────────────────────────────────────────────
 *   3 attempts, exponential back-off starting at 2 s.
 *   Failed jobs retained: 100  |  Completed jobs retained: 20.
 *
 * Industry reference:
 *   Fresha, Booksy, and Mindbody all use persistent job queues (SQS, Bull,
 *   Sidekiq) for WhatsApp / SMS delivery with at-least-once semantics.
 *   The exponential back-off prevents Twilio rate-limit cascades.
 */
import Redis                    from 'ioredis';
import { Queue, Worker, Job }   from 'bullmq';

import { config }              from '../../config';
import { logger }              from '../../utils/logger';
import { sendWhatsAppMessage } from '../../lib/twilio';

// ─── Constants ────────────────────────────────────────────────────────────────

export const WHATSAPP_QUEUE_NAME = 'whatsapp' as const;

// ─── Job types ────────────────────────────────────────────────────────────────

export type WhatsAppJobName =
  | 'lead-inquiry'
  | 'booking-confirmed'
  | 'appointment-reminder'
  | 'post-visit-review'
  | 'restaurant-reminder';

/**
 * Payload attached to every WhatsApp job.
 *
 * All fields needed to build the message body are embedded in the payload so
 * that the processor is stateless and requires no DB lookups.  This keeps
 * retry logic simple and fast.
 */
export interface WhatsAppJobData {
  /** Mirrors the BullMQ job name for convenient access inside the processor. */
  jobName: WhatsAppJobName;
  /** Recipient phone number (E.164 format; normalised to `whatsapp:` in lib/twilio). */
  to: string;
  /** Customer display name used in the message greeting. */
  customerName: string;
  /** Studio display name used in the message sign-off. */
  studioName: string;
  /** Artist display name (optional — defaults to "our team" when absent). */
  artistName?: string;
  /** Booking ID for structured logging and deduplication. */
  bookingId?: string;
  /** Lead ID for structured logging. */
  leadId?: string;
  /** Booking start time as ISO-8601 string (used for date/time formatting). */
  startAt?: string;
  /** Service or appointment type label (e.g. "tattoo session", "haircut"). */
  service?: string;
  /** Party size for restaurant reservations. */
  partySize?: number;
  /** Google Review URL included in post-visit review messages. */
  googleReviewUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
] as const;

/**
 * Formats a date portion of an ISO-8601 string using UTC.
 * Example: "Monday, 1 May 2026"
 *
 * UTC is used explicitly so that message bodies are consistent regardless of
 * the server's local timezone — ISO-8601 strings stored in the DB are UTC.
 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Formats a time portion of an ISO-8601 string using UTC.
 * Example: "14:30"
 *
 * UTC is used explicitly — see formatDate rationale above.
 */
function formatTime(iso: string): string {
  const d   = new Date(iso);
  const h   = d.getUTCHours().toString().padStart(2, '0');
  const min = d.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${min}`;
}

// ─── Message factory ──────────────────────────────────────────────────────────

/**
 * Pure function that builds the WhatsApp message body from a job payload.
 *
 * Exported for unit testing (deterministic, zero side-effects).
 *
 * Message templates match the format specified in PHASE1.md §Step 1.17 and
 * are consistent with the tone used by Fresha, Booksy, and Vagaro's
 * automated message suites.
 */
export function buildWhatsAppMessage(jobData: WhatsAppJobData): string {
  const {
    jobName,
    customerName,
    studioName,
    artistName,
    startAt,
    service,
    partySize,
    googleReviewUrl,
  } = jobData;

  const artist   = artistName ?? 'our team';
  const svc      = service   ?? 'appointment';
  const date     = startAt ? formatDate(startAt) : '';
  const time     = startAt ? formatTime(startAt) : '';
  const reviewUrl = googleReviewUrl ?? '';

  switch (jobName) {
    case 'lead-inquiry':
      return (
        `Hi ${customerName}! 👋 Thanks for reaching out to ${studioName}. ` +
        `We've received your inquiry and ${artist} will be in touch shortly. — ${studioName}`
      );

    case 'booking-confirmed':
      return (
        `Hi ${customerName}! ✅ Your ${svc} at ${studioName} is confirmed ` +
        `for ${date} at ${time} with ${artist}. See you then! — ${studioName}`
      );

    case 'appointment-reminder':
      return (
        `Hi ${customerName}! 🗓 Just a reminder — your ${svc} at ${studioName} ` +
        `is tomorrow at ${time} with ${artist}. Reply CANCEL to cancel. — ${studioName}`
      );

    case 'post-visit-review':
      return (
        `Hi ${customerName}! 🙏 Thank you for visiting ${studioName} today! ` +
        `We'd love a Google review: ${reviewUrl} — ${studioName}`
      );

    case 'restaurant-reminder':
      return (
        `Hi ${customerName}! 🍽 Looking forward to seeing you at ${studioName} ` +
        `tonight at ${time}` +
        (partySize ? ` (party of ${partySize})` : '') +
        `. — ${studioName}`
      );

    default: {
      // Exhaustiveness guard — TypeScript will warn if a new job type is added
      // without updating this switch.
      const _exhaustive: never = jobName;
      logger.warn('Unknown WhatsApp job type', { jobName: _exhaustive });
      return `Hi ${customerName}! A message from ${studioName}.`;
    }
  }
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
 * Exported so that tests can spy on `whatsappQueue.add` via jest mocks.
 */
export const whatsappQueue = new Queue<WhatsAppJobData>(WHATSAPP_QUEUE_NAME, {
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
 * Processes a single WhatsApp job.
 *
 * Builds the message body from the job payload using `buildWhatsAppMessage`,
 * then dispatches via `sendWhatsAppMessage`.  Errors propagate so BullMQ
 * applies the configured retry / back-off policy.
 */
async function processWhatsAppJob(job: Job<WhatsAppJobData>): Promise<void> {
  const message = buildWhatsAppMessage(job.data);
  await sendWhatsAppMessage(job.data.to, message);
}

// ─── Worker factory ───────────────────────────────────────────────────────────

/**
 * Creates and starts the WhatsApp BullMQ Worker.
 *
 * Called once from `server.ts` during startup (Step 1.18 will consolidate
 * this into the central queue worker infrastructure).
 *
 * Concurrency is set to 5 — Twilio's WhatsApp API supports well above this
 * rate limit so multiple jobs are processed in parallel without throttling.
 *
 * @returns The running Worker instance (can be used for graceful shutdown).
 */
export function startWhatsAppWorker(): Worker<WhatsAppJobData> {
  const worker = new Worker<WhatsAppJobData>(
    WHATSAPP_QUEUE_NAME,
    processWhatsAppJob,
    {
      connection:  createBullConnection(),
      concurrency: 5,
    },
  );

  worker.on('completed', (job: Job<WhatsAppJobData>) => {
    logger.info('WhatsApp job completed', {
      jobId:   job.id,
      jobName: job.data.jobName,
      to:      job.data.to,
    });
  });

  worker.on('failed', (job: Job<WhatsAppJobData> | undefined, error: Error) => {
    logger.error('WhatsApp job failed', {
      jobId:   job?.id,
      jobName: job?.data?.jobName,
      to:      job?.data?.to,
      error:   error.message,
      attempt: job?.attemptsMade,
    });
  });

  logger.info('WhatsApp worker started', { queue: WHATSAPP_QUEUE_NAME, concurrency: 5 });
  return worker;
}
