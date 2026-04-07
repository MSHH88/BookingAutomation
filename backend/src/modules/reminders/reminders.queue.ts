/**
 * Appointment-Reminder BullMQ queue — Step 1.20
 *
 * Provides the job data contract, the persistent Queue instance, and two
 * public helpers that bookings.service.ts calls on lifecycle transitions:
 *
 *   `enqueueBookingReminder`  — called by confirmBooking
 *   `cancelBookingReminder`   — called by cancelBooking and rescheduleBooking
 *
 * ── Architecture ──────────────────────────────────────────────────────────────
 *   Queue  (here)                    → imported by bookings.service.ts
 *   Worker (reminders.processor.ts)  → imported by server.ts (startup only)
 *
 *   Producer / processor split: the processor's heavy dependency chain
 *   (sendEmail → Resend SDK → Handlebars → Prisma) is never loaded in unit
 *   tests that only exercise the producer side.
 *
 * ── Job life cycle ─────────────────────────────────────────────────────────────
 *   confirmBooking
 *     → enqueueBookingReminder
 *     → BullMQ delayed queue (default: 24 h before startAt)
 *     → processReminderJob (reminders.processor.ts)
 *     → sendEmail('booking-reminder', customerEmail, vars)
 *
 *   cancelBooking / rescheduleBooking
 *     → cancelBookingReminder
 *     → Queue#getJob(jobId) + Job#remove()
 *
 * ── Deterministic job ID ──────────────────────────────────────────────────────
 *   Every reminder job is stored with jobId = `booking-reminder-{bookingId}`.
 *   This makes cancellation trivial: callers only need the bookingId.
 *   BullMQ silently discards duplicate enqueue calls for the same jobId
 *   (idempotent), so a second confirmBooking on the same booking cannot
 *   create a duplicate reminder.
 *
 * ── Delay semantics ───────────────────────────────────────────────────────────
 *   The delay is computed as:
 *     delay = bookingStartAt.getTime() − Date.now() − REMINDER_HOURS_BEFORE×h
 *
 *   If delay ≤ 0 (booking starts within the next REMINDER_HOURS_BEFORE hours)
 *   the reminder is silently skipped — too late to be useful.
 *
 *   Tests pass `delayMs` explicitly to pin the delay independent of wall-clock
 *   time.  This override bypasses the "too soon" guard.
 *
 * ── Feature flag ──────────────────────────────────────────────────────────────
 *   Gated by `EMAIL_REMINDERS_ENABLED`.  When OFF the helpers return
 *   immediately without touching Redis.
 *
 * ── Retry policy ──────────────────────────────────────────────────────────────
 *   3 attempts, exponential back-off starting at 5 s.
 *   Failed jobs retained: 100  |  Completed jobs retained: 20.
 *
 * Industry reference:
 *   Fresha, Booksy, Square Appointments, and Acuity Scheduling all send
 *   appointment reminders 24 h before each booking.  Platforms that offer
 *   configurable lead-time (Mindbody, TimeTap) default to 24 h.  Reminder
 *   emails reduce no-show rates by 25–40 % according to industry studies.
 */
import Redis    from 'ioredis';
import { Queue } from 'bullmq';

import { config }          from '../../config';
import { logger }          from '../../utils/logger';
import { getDefaultFlags } from '../../config/businessType';

// ─── Constants ────────────────────────────────────────────────────────────────

export const REMINDER_QUEUE_NAME = 'booking-reminder' as const;
export const REMINDER_JOB_NAME   = 'booking-reminder' as const;

/**
 * How many hours before a booking the reminder fires.
 * Configurable via `REMINDER_HOURS_BEFORE` env var; defaults to 24.
 */
export const REMINDER_HOURS_BEFORE: number = (() => {
  const raw = parseInt(process.env['REMINDER_HOURS_BEFORE'] ?? '24', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 24;
})();

/** Delay constant derived from REMINDER_HOURS_BEFORE (milliseconds). */
export const REMINDER_DEFAULT_DELAY_MS = REMINDER_HOURS_BEFORE * 60 * 60 * 1_000;

// ─── Job data ─────────────────────────────────────────────────────────────────

/**
 * Payload embedded in every booking-reminder BullMQ job.
 *
 * All data needed to render and send the email is captured at enqueue-time so
 * the processor is completely stateless and DB-free — making retries cheap
 * and safe with no risk of stale or missing data.
 */
export interface ReminderJobData {
  /** Booking ID — used for structured logging and idempotency. */
  bookingId:      string;
  /**
   * ISO 8601 string of the booking start time.
   * Serialised as string because BullMQ serialises payloads to JSON;
   * the processor re-hydrates with `new Date(bookingStartAt)`.
   */
  bookingStartAt: string;
  /** Customer email address — primary delivery channel. */
  customerEmail:  string;
  /** Customer display name — used for personalisation. */
  customerName:   string;
  /** Studio display name used in the email body. */
  studioName:     string;
  /** Artist display name — personalises the "your appointment with …" line. */
  artistName:     string;
  /** Service name — clarifies what the appointment is for. */
  serviceName:    string;
  /** Studio physical address — included if available. */
  studioAddress:  string;
}

// ─── Enqueue parameters ───────────────────────────────────────────────────────

/**
 * Parameters accepted by `enqueueBookingReminder`.
 * Superset of ReminderJobData: `bookingStartAt` is a real `Date` here
 * (serialised to ISO string when written into the job payload).
 */
export interface EnqueueReminderParams {
  bookingId:      string;
  /** Native Date — used to compute the BullMQ delay. */
  bookingStartAt: Date;
  customerEmail:  string;
  customerName:   string;
  studioName:     string;
  artistName:     string;
  serviceName:    string;
  studioAddress?: string;
  /**
   * Override the computed delay in milliseconds.
   * Intended for automated tests only — bypasses the "too soon" guard.
   * Do not use in production callers.
   */
  delayMs?: number;
}

// ─── Redis connection factory ─────────────────────────────────────────────────

/**
 * Creates a dedicated ioredis connection for BullMQ.
 *
 * Each Queue/Worker requires its own connection — sharing one instance
 * between different BullMQ roles causes command-pipeline conflicts.
 * `lazyConnect: true` avoids TCP handshakes at module import time,
 * keeping test startup fast.
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
 * Singleton BullMQ Queue for booking-reminder jobs.
 *
 * Exported so server.ts can call `.close()` during graceful shutdown and
 * tests can spy on `.add` / `.getJob` via jest mocks.
 */
export const reminderQueue = new Queue<ReminderJobData>(REMINDER_QUEUE_NAME, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts:         3,
    backoff:          { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 20 },
    removeOnFail:     { count: 100 },
  },
});

// ─── Deterministic job ID helper ─────────────────────────────────────────────

/**
 * Returns the deterministic BullMQ job ID for a booking's reminder.
 *
 * Using a deterministic ID means:
 *  1. The job can be found and removed by bookingId alone (no secondary index).
 *  2. Re-confirming the same booking cannot create a duplicate job.
 */
export function getReminderJobId(bookingId: string): string {
  return `booking-reminder-${bookingId}`;
}

// ─── enqueueBookingReminder ───────────────────────────────────────────────────

/**
 * Schedules a `booking-reminder` job to fire ~24 h before `bookingStartAt`.
 *
 * Guards applied before enqueueing:
 *  1. `EMAIL_REMINDERS_ENABLED` feature flag — silently no-ops when OFF.
 *  2. `customerEmail` must be non-empty — no point scheduling an email
 *     for a booking with no customer email address.
 *  3. Computed delay must be > 0 — if the booking starts within
 *     REMINDER_HOURS_BEFORE hours the reminder is too late to be useful.
 *     (This guard does NOT apply when `delayMs` is explicitly provided.)
 *
 * Fire-and-forget: any queue error is caught and logged so that a Redis
 * outage never rolls back or delays the parent booking-confirm transaction.
 *
 * Called from: bookings.service.ts → confirmBooking
 */
export async function enqueueBookingReminder(params: EnqueueReminderParams): Promise<void> {
  const flags = getDefaultFlags();
  if (!flags['EMAIL_REMINDERS_ENABLED']) return;

  if (!params.customerEmail) return; // nothing to send

  // Compute delay; respect explicit override for tests.
  let delayMs: number;
  if (params.delayMs !== undefined) {
    delayMs = params.delayMs;
  } else {
    delayMs = params.bookingStartAt.getTime() - Date.now() - REMINDER_DEFAULT_DELAY_MS;
    if (delayMs <= 0) {
      logger.info('Booking reminder skipped — appointment is too soon to schedule', {
        bookingId:      params.bookingId,
        bookingStartAt: params.bookingStartAt.toISOString(),
        hoursBeforeNow: Math.round((params.bookingStartAt.getTime() - Date.now()) / 3_600_000),
      });
      return;
    }
  }

  const jobData: ReminderJobData = {
    bookingId:      params.bookingId,
    bookingStartAt: params.bookingStartAt.toISOString(),
    customerEmail:  params.customerEmail,
    customerName:   params.customerName,
    studioName:     params.studioName,
    artistName:     params.artistName,
    serviceName:    params.serviceName,
    studioAddress:  params.studioAddress ?? '',
  };

  try {
    await reminderQueue.add(REMINDER_JOB_NAME, jobData, {
      jobId: getReminderJobId(params.bookingId),
      delay: delayMs,
    });
    logger.info('Booking reminder enqueued', {
      bookingId:      params.bookingId,
      bookingStartAt: params.bookingStartAt.toISOString(),
      delayMs,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Booking reminder enqueue failed', {
      bookingId: params.bookingId,
      error:     errMsg,
    });
    // intentionally not re-thrown — caller is fire-and-forget
  }
}

// ─── cancelBookingReminder ────────────────────────────────────────────────────

/**
 * Removes the pending reminder job for a booking.
 *
 * Called when a booking is cancelled or rescheduled to prevent a stale
 * reminder being sent for an appointment that no longer exists.
 *
 * No-ops silently if:
 *  - `EMAIL_REMINDERS_ENABLED` is OFF
 *  - The job has already fired, been removed, or was never enqueued
 *
 * Any Redis error is caught and logged — never re-thrown — so that a Redis
 * outage does not block the booking-cancel / reschedule transaction.
 *
 * Called from: bookings.service.ts → cancelBooking, rescheduleBooking
 */
export async function cancelBookingReminder(bookingId: string): Promise<void> {
  const flags = getDefaultFlags();
  if (!flags['EMAIL_REMINDERS_ENABLED']) return;

  const jobId = getReminderJobId(bookingId);
  try {
    const job = await reminderQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info('Booking reminder cancelled', { bookingId, jobId });
    }
    // Silently no-op when no pending job is found.
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to cancel booking reminder', {
      bookingId,
      jobId,
      error: errMsg,
    });
    // intentionally not re-thrown
  }
}
