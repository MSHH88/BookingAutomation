/**
 * WhatsApp controller — Step 1.17
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic lives in whatsapp.service.ts.
 *
 * Role enforcement is handled at the router level (requireRole middleware).
 * The send-test endpoint requires ADMIN role.
 */
import { Request, Response, NextFunction } from 'express';

import * as whatsappService        from './whatsapp.service';
import { success }                 from '../../utils/apiResponse';
import type { SendTestWhatsAppBody } from './whatsapp.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/whatsapp/send-test
 * ADMIN only, WHATSAPP_CONTACT_ENABLED gate.
 *
 * Sends a WhatsApp message directly via Twilio (bypasses the BullMQ queue)
 * to verify that credentials and phone number routing are correctly configured.
 *
 * Returns the Twilio message SID on success so operators can cross-reference
 * delivery in the Twilio Console.
 *
 * Errors:
 *  - 503 WHATSAPP_NOT_CONFIGURED — Twilio credentials absent in env
 *  - 502 (propagated from lib/twilio) — Twilio API rejected the request
 */
export async function sendTestMessage(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body   = req.body as SendTestWhatsAppBody;
    const result = await whatsappService.testSendWhatsApp(body.to, body.message);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
