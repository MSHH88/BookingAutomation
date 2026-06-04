/**
 * Twilio SMS client — Phase 1, Step 1.5
 *
 * Sends plain-text SMS messages via the Twilio Messaging API.
 * Separate from the WhatsApp client (lib/twilio.ts) to keep
 * channel concerns isolated.
 *
 * Credential checking at call time — same pattern as lib/twilio.ts.
 * Returns null when TWILIO_SMS_FROM is absent.
 */
import { Twilio } from 'twilio';

import { logger } from '../utils/logger';

let _client: Twilio | null = null;

function getSmsClient(): Twilio | null {
  if (_client) return _client;

  const accountSid = process.env['TWILIO_ACCOUNT_SID'] ?? '';
  const authToken  = process.env['TWILIO_AUTH_TOKEN']  ?? '';

  if (!accountSid || !authToken) return null;

  _client = new Twilio(accountSid, authToken);
  return _client;
}

/**
 * Sends an SMS message via Twilio.
 *
 * @returns Twilio message SID on success, null when not configured.
 * @throws Re-throws Twilio API errors for BullMQ retry.
 */
export async function sendSmsMessage(
  to:   string,
  body: string,
): Promise<string | null> {
  const smsFrom = process.env['TWILIO_SMS_FROM'] ?? '';

  if (!smsFrom) {
    logger.warn('Twilio SMS not configured — message skipped', { to });
    return null;
  }

  const client = getSmsClient();
  if (!client) {
    logger.warn('Twilio client unavailable — SMS skipped', { to });
    return null;
  }

  try {
    const message = await client.messages.create({ from: smsFrom, to, body });
    logger.info('SMS sent', { to, sid: message.sid });
    return message.sid;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('SMS send failed', { to, error: errMsg });
    throw err;
  }
}
