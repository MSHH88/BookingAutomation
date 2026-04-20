/**
 * WhatsApp service — Step 1.17
 *
 * Provides the public API for the WhatsApp Automation Module:
 *
 * ── 1. Enqueue helpers (internal use) ─────────────────────────────────────────
 *   Called by other services (leads, bookings) to schedule WhatsApp messages.
 *   Each helper checks `preferWhatsApp` and the `WHATSAPP_CONTACT_ENABLED`
 *   feature flag before enqueueing.  Errors are caught and logged so that a
 *   queue failure never rolls back the parent operation (fire-and-forget).
 *
 *   | Helper                    | Enqueues                              |
 *   |---------------------------|---------------------------------------|
 *   | enqueueLeadInquiry        | lead-inquiry (immediate)              |
 *   | enqueueBookingConfirmed   | booking-confirmed (immediate)         |
 *   |                           | appointment-reminder (startAt − 24 h) |
 *   | enqueuePostVisitReview    | post-visit-review (+2 h)              |
 *   | enqueueRestaurantReminder | restaurant-reminder (startAt − 2 h)   |
 *
 * ── 2. testSendWhatsApp (admin utility) ───────────────────────────────────────
 *   Sends a WhatsApp message directly (bypassing the queue) to verify Twilio
 *   credentials and reachability.  Used by the admin `POST /send-test`
 *   endpoint.  Throws AppError 503 when Twilio is not configured.
 *
 * Architecture note:
 *   `sendWhatsAppMessage` lives in `lib/twilio` (not here) to avoid the
 *   circular dependency that would arise between this file and
 *   whatsapp.queue.ts (which imports sendWhatsAppMessage for its processor).
 *
 * Industry reference:
 *   Fresha, Booksy, and Vagaro gate every outbound WhatsApp / SMS on a
 *   per-customer opt-in flag and a per-feature toggle — matching the
 *   `preferWhatsApp` + `WHATSAPP_CONTACT_ENABLED` double-gate used here.
 *   This ensures compliance with GDPR Article 6 (consent-based processing)
 *   and Twilio's own messaging policies.
 */
import { AppError }                 from '../../errors/AppError';
import { logger }                   from '../../utils/logger';
import { isFeatureEnabled }         from '../../middleware/requireFeature';
import { sendWhatsAppMessage }      from '../../lib/twilio';
import { whatsappQueue }            from './whatsapp.queue';
import type { WhatsAppJobData, WhatsAppJobName } from './whatsapp.queue';

// ─── Shared param interfaces ──────────────────────────────────────────────────

export interface LeadInquiryParams {
  /** Customer phone number (E.164). Null → message skipped. */
  phone: string | null;
  customerName: string;
  /** Must be true — also checked here as a guard. */
  preferWhatsApp: boolean;
  studioName: string;
  leadId: string;
  /** Optional artist ID for structured logging. */
  artistId?: string;
  tenantId?: string | null;
}

export interface BookingConfirmedParams {
  phone: string | null;
  customerName: string;
  preferWhatsApp: boolean;
  studioName: string;
  artistName: string;
  /** ISO-8601 booking start time. */
  startAt: string;
  bookingId: string;
  /** e.g. "tattoo session", "haircut". Defaults to "appointment". */
  service?: string;
  tenantId?: string | null;
}

export interface PostVisitReviewParams {
  phone: string | null;
  customerName: string;
  preferWhatsApp: boolean;
  studioName: string;
  googleReviewUrl: string;
  bookingId: string;
  tenantId?: string | null;
}

export interface RestaurantReminderParams {
  phone: string | null;
  customerName: string;
  preferWhatsApp: boolean;
  studioName: string;
  /** ISO-8601 reservation start time. */
  startAt: string;
  partySize?: number;
  bookingId: string;
  tenantId?: string | null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Common guard: returns true when both the customer opt-in flag and the
 * `WHATSAPP_CONTACT_ENABLED` feature flag are active and a valid phone
 * number is present.
 *
 * Async because the flag check is DB-backed (with Redis caching).
 */
async function canSend(preferWhatsApp: boolean, phone: string | null, tenantId?: string | null): Promise<boolean> {
  if (!preferWhatsApp) return false;
  if (!phone)          return false;
  return isFeatureEnabled('WHATSAPP_CONTACT_ENABLED', tenantId ?? undefined);
}

/**
 * Adds a job to the WhatsApp BullMQ queue.
 * Catches all errors so that a queue failure never propagates to the caller.
 */
async function safeEnqueue(
  jobName: WhatsAppJobName,
  data:    Omit<WhatsAppJobData, 'jobName'>,
  opts?:   { delay?: number },
): Promise<void> {
  try {
    const jobData: WhatsAppJobData = { jobName, ...data };
    await whatsappQueue.add(jobName, jobData, opts);
    logger.info('WhatsApp job enqueued', {
      jobName,
      to:       data.to,
      delay:    opts?.delay ?? 0,
      bookingId: data.bookingId,
      leadId:    data.leadId,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('WhatsApp job enqueue failed', { jobName, to: data.to, error: errMsg });
    // intentionally not re-thrown — callers are fire-and-forget
  }
}

// ─── Public API — Enqueue helpers ─────────────────────────────────────────────

/**
 * Queues a "lead-inquiry" WhatsApp message (Message 1).
 *
 * Sent immediately when a new Lead is created and the customer has opted in.
 *
 * Called from: leads.service.ts → createLead side-effect
 */
export async function enqueueLeadInquiry(params: LeadInquiryParams): Promise<void> {
  if (!await canSend(params.preferWhatsApp, params.phone, params.tenantId)) return;

  await safeEnqueue('lead-inquiry', {
    to:           params.phone as string,
    customerName: params.customerName,
    studioName:   params.studioName,
    leadId:       params.leadId,
  });
}

/**
 * Queues two WhatsApp messages on booking confirmation:
 *
 *  - Message 2 (`booking-confirmed`)    — sent immediately
 *  - Message 3 (`appointment-reminder`) — sent at `startAt − 24 h`
 *
 * The reminder is skipped when the delay would be ≤ 0 (booking is already
 * within 24 h or in the past).
 *
 * Called from: bookings.service.ts → confirmBooking side-effect
 */
export async function enqueueBookingConfirmed(params: BookingConfirmedParams): Promise<void> {
  if (!await canSend(params.preferWhatsApp, params.phone, params.tenantId)) return;

  const commonData = {
    to:           params.phone as string,
    customerName: params.customerName,
    studioName:   params.studioName,
    artistName:   params.artistName,
    startAt:      params.startAt,
    bookingId:    params.bookingId,
    service:      params.service,
  };

  // Message 2 — immediate confirmation
  await safeEnqueue('booking-confirmed', commonData);

  // Message 3 — reminder 24 h before the appointment
  const reminderDelay = new Date(params.startAt).getTime() - Date.now() - 24 * 60 * 60 * 1000;
  if (reminderDelay > 0) {
    await safeEnqueue('appointment-reminder', commonData, { delay: reminderDelay });
  }
}

/**
 * Queues a "post-visit-review" WhatsApp message (Message 4).
 *
 * Sent 2 hours after a booking is marked COMPLETED, prompting the customer
 * to leave a Google review.
 *
 * The message is silently skipped when `googleReviewUrl` is absent or empty —
 * sending a review link without a URL produces a broken customer experience.
 *
 * Called from: bookings.service.ts → completeBooking side-effect
 */
export async function enqueuePostVisitReview(params: PostVisitReviewParams): Promise<void> {
  if (!await canSend(params.preferWhatsApp, params.phone, params.tenantId)) return;
  if (!params.googleReviewUrl) return; // skip — broken message if URL is empty

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

  await safeEnqueue(
    'post-visit-review',
    {
      to:             params.phone as string,
      customerName:   params.customerName,
      studioName:     params.studioName,
      bookingId:      params.bookingId,
      googleReviewUrl: params.googleReviewUrl,
    },
    { delay: TWO_HOURS_MS },
  );
}

/**
 * Queues a "restaurant-reminder" WhatsApp message (Message 5).
 *
 * Sent 2 hours before the reservation start time.  Only enqueued when the
 * delay would be positive (reservation is still more than 2 h away).
 *
 * The caller is responsible for checking that the business type is
 * `restaurant` before calling this function.
 *
 * Called from: bookings.service.ts → confirmBooking side-effect (restaurant only)
 */
export async function enqueueRestaurantReminder(params: RestaurantReminderParams): Promise<void> {
  if (!await canSend(params.preferWhatsApp, params.phone, params.tenantId)) return;

  const reminderDelay = new Date(params.startAt).getTime() - Date.now() - 2 * 60 * 60 * 1000;
  if (reminderDelay <= 0) return; // reservation is too close or already past

  await safeEnqueue(
    'restaurant-reminder',
    {
      to:           params.phone as string,
      customerName: params.customerName,
      studioName:   params.studioName,
      bookingId:    params.bookingId,
      startAt:      params.startAt,
      partySize:    params.partySize,
    },
    { delay: reminderDelay },
  );
}

// ─── Public API — Admin utilities ─────────────────────────────────────────────

/**
 * Sends a test WhatsApp message directly (bypassing the queue).
 *
 * Used by the admin `POST /api/whatsapp/send-test` endpoint to verify Twilio
 * credentials and reachability without going through the queue.
 *
 * Throws:
 *  - `AppError 503` when Twilio is not configured (credentials absent).
 *  - Re-throws Twilio API errors so the HTTP layer returns 502.
 *
 * @param to      Recipient phone number (E.164 format).
 * @param message Plain-text message body.
 */
export async function testSendWhatsApp(
  to:      string,
  message: string,
): Promise<{ to: string; messageSid: string }> {
  const sid = await sendWhatsAppMessage(to, message);

  if (sid === null) {
    throw new AppError(
      503,
      'WHATSAPP_NOT_CONFIGURED',
      'Twilio WhatsApp is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.',
    );
  }

  return { to, messageSid: sid };
}
