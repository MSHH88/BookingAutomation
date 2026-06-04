/**
 * Email Templates router — Phase 1 (Messaging Foundation)
 *
 * Mounts the email template management endpoints under
 * /api/messages/email-templates.
 *
 * | Method | Path                                         | Auth  | Feature Flag            | Description                 |
 * |--------|----------------------------------------------|-------|-------------------------|-----------------------------|
 * | GET    | /api/messages/email-templates                | ADMIN | EMAIL_REMINDERS_ENABLED | List all templates          |
 * | GET    | /api/messages/email-templates/:key           | ADMIN | EMAIL_REMINDERS_ENABLED | Get single template by key  |
 * | PATCH  | /api/messages/email-templates/:key           | ADMIN | EMAIL_REMINDERS_ENABLED | Update template             |
 * | POST   | /api/messages/email-templates/:key/preview   | ADMIN | EMAIL_REMINDERS_ENABLED | Preview rendered template   |
 *
 * All routes require authentication, ADMIN role, and the EMAIL_REMINDERS_ENABLED
 * feature flag to be active.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './email-templates.controller';
import {
  listEmailTemplatesSchema,
  getEmailTemplateSchema,
  updateEmailTemplateSchema,
  previewEmailTemplateSchema,
} from './email-templates.schema';

const router = Router();

// ── All routes require auth + ADMIN + EMAIL_REMINDERS_ENABLED ─────────────────
router.use(requireAuth);
router.use(requireRole('ADMIN'));
router.use(requireFeature('EMAIL_REMINDERS_ENABLED'));

/** GET / — paginated list of email templates for the tenant. */
router.get(
  '/',
  validate(listEmailTemplatesSchema),
  ctrl.listTemplates,
);

/** GET /:key — single template lookup by key. */
router.get(
  '/:key',
  validate(getEmailTemplateSchema),
  ctrl.getTemplate,
);

/** PATCH /:key — partial update of template fields. */
router.patch(
  '/:key',
  validate(updateEmailTemplateSchema),
  ctrl.updateTemplate,
);

/** POST /:key/preview — render template with provided variables. */
router.post(
  '/:key/preview',
  validate(previewEmailTemplateSchema),
  ctrl.previewTemplate,
);

export { router as emailTemplateRoutes };
