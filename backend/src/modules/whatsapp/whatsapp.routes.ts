/**
 * WhatsApp router — Step 1.17
 *
 * | Method | Path                        | Auth  | Feature Flag              | Description                     |
 * |--------|-----------------------------|-------|---------------------------|---------------------------------|
 * | POST   | /api/whatsapp/send-test     | ADMIN | WHATSAPP_CONTACT_ENABLED  | Send a test WhatsApp message    |
 *
 * All routes:
 *   - Require authentication (requireAuth)
 *   - Require ADMIN role (requireRole('ADMIN'))
 *   - Gated by WHATSAPP_CONTACT_ENABLED feature flag (requireFeature)
 *
 * The WhatsApp module is primarily an internal automation engine.  The only
 * public-facing endpoint is `send-test`, which allows admins to verify Twilio
 * connectivity without going through the full booking or lead flow.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl          from './whatsapp.controller';
import { sendTestWhatsAppSchema } from './whatsapp.schema';

const router = Router();

// ── All WhatsApp admin routes require auth + ADMIN + WHATSAPP_CONTACT_ENABLED ─
router.use(requireAuth);
router.use(requireRole('ADMIN'));
router.use(requireFeature('WHATSAPP_CONTACT_ENABLED'));

/**
 * POST /api/whatsapp/send-test
 * ADMIN only.  Sends a real WhatsApp message to the specified phone number,
 * bypassing the BullMQ queue, to verify Twilio credentials and connectivity.
 *
 * Body: { to: string, message: string }
 * Returns: { success: true, data: { to: string, messageSid: string } }
 */
router.post(
  '/send-test',
  validate(sendTestWhatsAppSchema),
  ctrl.sendTestMessage,
);

export { router as whatsappRoutes };
