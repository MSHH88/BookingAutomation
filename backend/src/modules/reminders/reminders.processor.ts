/**
 * Appointment-Reminder BullMQ worker — Step 1.20
 *
 * Processes `booking-reminder` jobs that were scheduled by
 * `enqueueBookingReminder` (reminders.queue.ts) ~24 h before a confirmed
 * booking's start time.
 *
 * ── What the processor does ───────────────────────────────────────────────────
 *   For each job it calls `sendEmail('booking-reminder', customerEmail, vars)`
 *   so the customer receives a personalised, studio-branded reminder email
 *   with the booking date, time, artist name, and service name.
 *
 * ── Separation from reminders.queue.ts ────────────────────────────────────────
 *   The processor lives in its own file so that the heavy dependency chain
 *   (sendEmail → Resend SDK → Handlebars → Prisma) is never loaded in unit
 *   tests that only exercise the producer side (enqueueBookingReminder /
 *   cancelBookingReminder).  server.ts is the only file that imports from
 *   this module.
 *
 * ── Template key ──────────────────────────────────────────────────────────────
 *   `booking-reminder` — must exist in the `EmailTemplate` DB table.
 *   Expected Handlebars variables:
 *     {{ customerName }}  — customer's first/full name
 *     {{ studioName }}    — studio display name
 *     {{ artistName }}    — performing artist name
 *     {{ serviceName }}   — service to be performed
 *     {{ bookingDate }}   — formatted date string (e.g. "Monday, 14 April 2025")
 *     {{ bookingTime }}   — formatted time string (e.g. "14:30")
 *     {{ studioAddress }} — studio physical address (may be empty string)
 *     {{ bookingId }}     — booking ID for tracking / reference
 *
 * ── Error handling ────────────────────────────────────────────────────────────
 *   • TEMPLATE_NOT_FOUND / TEMPLATE_INACTIVE:
 *       Retrying a misconfigured template is futile.  The error is logged and
 *       the job is silently completed (not failed) so it does not fill the
 *       dead-letter queue.  Admins must create/activate the template.
 *   • All other errors (Resend API error, network timeout):
 *       Propagated to BullMQ — the 3-attempt exponential back-off retry
 *       policy (configured in reminders.queue.ts) applies.
 *
 * ── Industry reference ────────────────────────────────────────────────────────
 *   Fresha, Booksy, Square Appointments, and Acuity Scheduling all send a
 *   single appointment reminder email 24 h before each booking.  No-show
 *   rates drop 25–40 % when automated reminders are active (reported
 *   independently by Fresha and Mindbody).
 */
import { Worker, Job } from 'bullmq';
import Redis           from 'ioredis';

import { config }    from '../../config';
import { logger }    from '../../utils/logger';
import { sendEmail } from '../notifications/notifications.service';
import { AppError }  from '../../errors/AppError';
import {
  REMINDER_QUEUE_NAME,
  type ReminderJobData,
} from './reminders.queue';

// ─── Redis connection factory ─────────────────────────────────────────────────

/**
 * Creates a dedicated ioredis connection for the BullMQ Worker.
 * Uses the same options as the Queue connection in reminders.queue.ts.
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
 * Key used to look up the booking-reminder email template in the DB.
 * Exported for test assertions.
 */
export const REMINDER_EMAIL_TEMPLATE_KEY = 'booking-reminder' as const;

// ─── Job processor ────────────────────────────────────────────────────────────

/**
 * Processes a single booking-reminder job.
 *
 * Exported (not just passed inline) so unit tests can call it directly
 * without needing a live BullMQ Worker.
 *
 * The `bookingStartAt` ISO string in the payload is re-hydrated to a Date
 * here so the processor can format it in any locale / timezone needed.
 * All formatting uses UTC to be deterministic regardless of the server
 * timezone — matching the convention used throughout the codebase.
 */
export async function processReminderJob(job: Job<ReminderJobData>): Promise<void> {
  const {
    bookingId,
    bookingStartAt,
    customerEmail,
    customerName,
    studioName,
    artistName,
    serviceName,
    studioAddress,
  } = job.data;

  logger.info('Processing booking reminder job', {
    jobId:     job.id,
    bookingId,
    to:        customerEmail,
  });

  // Re-hydrate the ISO string and format for the email template.
  const startAt = new Date(bookingStartAt);

  const bookingDate = startAt.toLocaleDateString('en-GB', {
    weekday:  'long',
    year:     'numeric',
    month:    'long',
    day:      'numeric',
    timeZone: 'UTC',
  });

  const bookingTime = startAt.toLocaleTimeString('en-GB', {
    hour:     '2-digit',
    minute:   '2-digit',
    timeZone: 'UTC',
  });

  try {
    await sendEmail(REMINDER_EMAIL_TEMPLATE_KEY, customerEmail, {
      customerName,
      studioName,
      artistName,
      serviceName,
      bookingDate,
      bookingTime,
      studioAddress: studioAddress || '',
      bookingId,
    });

    logger.info('Booking reminder email sent', {
      jobId:     job.id,
      bookingId,
      to:        customerEmail,
    });
  } catch (err: unknown) {
    // Template misconfiguration errors are unrecoverable — retrying will not
    // help.  Mark the job as completed (not failed) so the dead-letter queue
    // is not flooded.  Admins should be alerted via log monitoring.
    if (
      err instanceof AppError &&
      (err.code === 'TEMPLATE_NOT_FOUND' || err.code === 'TEMPLATE_INACTIVE')
    ) {
      logger.error('Booking reminder email template unavailable — job will not retry', {
        jobId:     job.id,
        bookingId,
        errorCode: err.code,
        message:   err.message,
      });
      return; // treat as completed — re-enqueue would loop forever
    }

    // All other errors (Resend API failure, network timeout) propagate so
    // BullMQ applies the retry/back-off policy defined in reminders.queue.ts.
    throw err;
  }
}

// ─── Worker factory ───────────────────────────────────────────────────────────

/**
 * Creates and starts the booking-reminder BullMQ Worker.
 *
 * Called once from `server.ts` during application startup — before the HTTP
 * server begins accepting connections so that any delayed jobs recovered from
 * Redis (e.g. from a previous deployment) are processed immediately.
 *
 * Concurrency is set to 5 — reminder emails are moderate-volume (one per
 * confirmed booking, ~24 h in advance) and Resend's rate limits comfortably
 * support this throughput for a busy studio.
 *
 * @returns The running Worker instance (stored by server.ts for graceful
 *          shutdown via `worker.close()`).
 */
export function startReminderWorker(): Worker<ReminderJobData> {
  const worker = new Worker<ReminderJobData>(
    REMINDER_QUEUE_NAME,
    processReminderJob,
    {
      connection:  createBullConnection(),
      concurrency: 5,
    },
  );

  worker.on('completed', (job: Job<ReminderJobData>) => {
    logger.info('Booking reminder job completed', {
      jobId:     job.id,
      bookingId: job.data.bookingId,
      to:        job.data.customerEmail,
    });
  });

  worker.on('failed', (job: Job<ReminderJobData> | undefined, error: Error) => {
    logger.error('Booking reminder job failed', {
      jobId:     job?.id,
      bookingId: job?.data?.bookingId,
      to:        job?.data?.customerEmail,
      error:     error.message,
      attempt:   job?.attemptsMade,
    });
  });

  logger.info('Reminder worker started', { queue: REMINDER_QUEUE_NAME, concurrency: 5 });
  return worker;
}
