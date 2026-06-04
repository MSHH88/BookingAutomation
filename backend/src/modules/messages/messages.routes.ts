/**
 * Messages router — Phase 1, Step 1.4
 *
 * Unified /api/messages namespace consolidating all template management:
 *   /api/messages/whatsapp-templates → WhatsApp template CRUD
 *   /api/messages/email-templates    → Email template CRUD
 *   /api/messages/sms-templates      → SMS template CRUD
 *
 * Access: ADMIN with canManageMessages permission, or SUPER_ADMIN.
 * Each sub-router handles its own auth + feature flag gating.
 */
import { Router } from 'express';

import { whatsappTemplateRoutes } from '../whatsapp-templates/whatsapp-templates.routes';
import { emailTemplateRoutes }    from '../email-templates/email-templates.routes';
import { smsTemplateRoutes }      from '../sms-templates/sms-templates.routes';

const router = Router();

// Each sub-router handles its own auth + feature flag gating
router.use('/whatsapp-templates', whatsappTemplateRoutes);
router.use('/email-templates',    emailTemplateRoutes);
router.use('/sms-templates',      smsTemplateRoutes);

export { router as messagesRoutes };
