/**
 * Twilio singleton — Step 1.17
 *
 * Configures and exports a lazy-initialised Twilio client and the core
 * `sendWhatsAppMessage` utility used by the WhatsApp queue processor and
 * the admin test-send endpoint.
 *
 * Placement rationale:
 *   `sendWhatsAppMessage` lives here (not in whatsapp.service.ts) to break the
 *   circular dependency that would otherwise arise between whatsapp.service.ts
 *   (enqueue helpers) and whatsapp.queue.ts (processor that calls sendMessage).
 *   Both modules import from this file without creating a cycle.
 *
 * Credential checking at call time:
 *   Credentials are read from `process.env` directly at each call (not from
 *   the cached `config` singleton).  This design enables test isolation via
 *   `delete process.env['TWILIO_ACCOUNT_SID']` and supports runtime
 *   credential rotation without an app restart.
 *
 * Phone number normalisation:
 *   Twilio's WhatsApp API requires the `whatsapp:` URI scheme prefix on both
 *   `from` and `to` numbers.  This module normalises numbers that are supplied
 *   without the prefix.
 *
 * Error handling:
 *   API errors are logged and re-thrown so that BullMQ can apply retry /
 *   back-off logic, and so the admin test-send endpoint returns a proper 502.
 *
 * Usage:
 *   import { sendWhatsAppMessage } from '../../lib/twilio';
 *   const sid = await sendWhatsAppMessage('+447700900001', 'Hello!');
 */
import { Twilio } from 'twilio';

import { logger } from '../utils/logger';

// ─── Twilio client singleton ──────────────────────────────────────────────────

let _client: Twilio | null = null;

/**
 * Returns the singleton Twilio client, initialising it on first call.
 * Returns null when credentials are absent.
 *
 * Reads credentials from `process.env` at call time so that tests can
 * control the credential state via `delete process.env[...]`.
 */
export function getTwilioClient(): Twilio | null {
  if (_client) return _client;

  const accountSid = process.env['TWILIO_ACCOUNT_SID'] ?? '';
  const authToken  = process.env['TWILIO_AUTH_TOKEN']  ?? '';

  if (!accountSid || !authToken) {
    return null;
  }

  _client = new Twilio(accountSid, authToken);
  return _client;
}

// ─── WhatsApp send utility ────────────────────────────────────────────────────

/**
 * Sends a WhatsApp message via the Twilio Messaging API.
 *
 * Credentials are checked at call time from `process.env` so that the
 * function returns `null` gracefully in environments where Twilio is not
 * configured (e.g. test / local dev without real credentials).
 *
 * Returns:
 *  - `string`  — Twilio message SID on success
 *  - `null`    — any Twilio credential is absent; message is skipped with
 *                a warning log.  Callers treat null as "not configured".
 *
 * Throws:
 *  - Re-throws the Twilio API error on network / auth / send failures so
 *    that BullMQ workers apply retry / back-off and the admin test-send
 *    endpoint returns 502.
 *
 * @param to   Recipient phone number (E.164 format, with or without the
 *             `whatsapp:` prefix).
 * @param body Plain-text message body.
 */
export async function sendWhatsAppMessage(
  to:   string,
  body: string,
): Promise<string | null> {
  const accountSid   = process.env['TWILIO_ACCOUNT_SID']    ?? '';
  const authToken    = process.env['TWILIO_AUTH_TOKEN']     ?? '';
  const whatsAppFrom = process.env['TWILIO_WHATSAPP_FROM']  ?? '';

  if (!accountSid || !authToken || !whatsAppFrom) {
    logger.warn('Twilio WhatsApp not configured — message skipped', { to });
    return null;
  }

  const client = getTwilioClient();
  if (!client) {
    logger.warn('Twilio client unavailable — message skipped', { to });
    return null;
  }

  // ── Normalise phone numbers to whatsapp: URI scheme ──────────────────────
  const fromNumber = whatsAppFrom.startsWith('whatsapp:')
    ? whatsAppFrom
    : `whatsapp:${whatsAppFrom}`;

  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  try {
    const message = await client.messages.create({
      from: fromNumber,
      to:   toNumber,
      body,
    });

    logger.info('WhatsApp message sent', { to, sid: message.sid });
    return message.sid;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('WhatsApp message failed', { to, error: errMsg });
    throw err; // re-throw — BullMQ handles retry; admin endpoint surfaces 502
  }
}
