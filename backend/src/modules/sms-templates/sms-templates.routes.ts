/**
 * SMS Templates router — Phase 1 (Messaging Foundation)
 *
 * Mounts the SMS template management endpoints under
 * /api/messages/sms-templates.
 *
 * | Method | Path                                        | Auth  | Feature Flag           | Description                 |
 * |--------|---------------------------------------------|-------|------------------------|-----------------------------|
 * | GET    | /api/messages/sms-templates                 | ADMIN | SMS_REMINDERS_ENABLED  | List all templates          |
 * | GET    | /api/messages/sms-templates/:key            | ADMIN | SMS_REMINDERS_ENABLED  | Get single template by key  |
 * | PATCH  | /api/messages/sms-templates/:key            | ADMIN | SMS_REMINDERS_ENABLED  | Update template             |
 * | POST   | /api/messages/sms-templates/:key/preview    | ADMIN | SMS_REMINDERS_ENABLED  | Preview rendered template   |
 *
 * All routes require authentication, ADMIN role, and the SMS_REMINDERS_ENABLED
 * feature flag to be active.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './sms-templates.controller';
import {
  listSmsTemplatesSchema,
  getSmsTemplateSchema,
  updateSmsTemplateSchema,
  previewSmsTemplateSchema,
} from './sms-templates.schema';

const router = Router();

// ── All routes require auth + ADMIN + SMS_REMINDERS_ENABLED ───────────────────
router.use(requireAuth);
router.use(requireRole('ADMIN'));
router.use(requireFeature('SMS_REMINDERS_ENABLED'));

/** GET / — paginated list of SMS templates for the tenant. */
router.get(
  '/',
  validate(listSmsTemplatesSchema),
  ctrl.listTemplates,
);

/** GET /:key — single template lookup by key. */
router.get(
  '/:key',
  validate(getSmsTemplateSchema),
  ctrl.getTemplate,
);

/** PATCH /:key — partial update of template fields. */
router.patch(
  '/:key',
  validate(updateSmsTemplateSchema),
  ctrl.updateTemplate,
);

/** POST /:key/preview — render template with provided variables. */
router.post(
  '/:key/preview',
  validate(previewSmsTemplateSchema),
  ctrl.previewTemplate,
);

export { router as smsTemplateRoutes };
