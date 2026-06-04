/**
 * Zod schemas for the WhatsApp API — Step 1.17
 *
 * Covers the admin test-send endpoint and the internal job-data types.
 *
 * Role permissions:
 *   ADMIN : test-send endpoint only
 *
 * The WhatsApp module is primarily an internal automation engine — most
 * outbound messages are triggered by other services (leads, bookings) via
 * the enqueue helpers in whatsapp.service.ts.  The only public-facing API
 * surface is the admin test-send endpoint for verifying Twilio connectivity.
 */
import { z } from 'zod';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Non-empty trimmed string helper. */
const reqStr = (label: string) =>
  z.string({ required_error: `${label} is required` }).min(1, `${label} cannot be empty`).trim();

// ─── POST /api/whatsapp/send-test ─────────────────────────────────────────────

/**
 * Admin test-send: verifies Twilio connectivity by sending a real WhatsApp
 * message to the supplied phone number.
 *
 * This is the "Send Test" button every professional messaging platform
 * (Twilio Console, MessageBird, etc.) exposes in its admin UI so operators
 * can confirm credentials and template rendering before going live.
 */
export const sendTestWhatsAppSchema = z.object({
  body: z.object({
    /**
     * Recipient phone number in E.164 format (e.g. +447700900001).
     * The `whatsapp:` prefix is optional — the service normalises it.
     */
    to: reqStr('to').regex(
      /^\+?[1-9]\d{6,14}$/,
      'to must be a valid E.164 phone number (e.g. +447700900001)',
    ),

    /**
     * Plain-text message body to send.
     * Minimum 1 character, maximum 1600 characters (Twilio WhatsApp limit).
     */
    message: reqStr('message').max(1600, 'message cannot exceed 1600 characters'),
  }),
});

export type SendTestWhatsAppBody = z.infer<typeof sendTestWhatsAppSchema>['body'];
