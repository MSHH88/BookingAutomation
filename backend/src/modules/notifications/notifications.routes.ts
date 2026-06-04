/**
 * Notifications router — Step 1.15
 *
 * | Method | Path                                        | Auth  | Feature Flag            | Description                              |
 * |--------|---------------------------------------------|-------|-------------------------|------------------------------------------|
 * | GET    | /api/notifications/templates                | ADMIN | EMAIL_REMINDERS_ENABLED | List all email templates                 |
 * | POST   | /api/notifications/templates                | ADMIN | EMAIL_REMINDERS_ENABLED | Create a new email template              |
 * | GET    | /api/notifications/templates/:id            | ADMIN | EMAIL_REMINDERS_ENABLED | Get full template detail                 |
 * | PATCH  | /api/notifications/templates/:id            | ADMIN | EMAIL_REMINDERS_ENABLED | Partially update an email template       |
 * | DELETE | /api/notifications/templates/:id            | ADMIN | EMAIL_REMINDERS_ENABLED | Soft-delete (deactivate) a template      |
 * | POST   | /api/notifications/templates/:id/send-test  | ADMIN | EMAIL_REMINDERS_ENABLED | Test-send a template to a given email    |
 *
 * All routes:
 *   - Require authentication (requireAuth)
 *   - Require ADMIN role (requireRole('ADMIN'))
 *   - Gated by EMAIL_REMINDERS_ENABLED feature flag (requireFeature)
 *
 * IMPORTANT — route order:
 *   The static path `/api/notifications/templates` MUST be registered before
 *   the param path `/api/notifications/templates/:id` to avoid Express
 *   treating "templates" as an id parameter.  Sub-routes (/:id/send-test)
 *   MUST be registered before plain /:id routes.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './notifications.controller';
import {
  listTemplatesSchema,
  createTemplateSchema,
  getTemplateByIdSchema,
  updateTemplateSchema,
  deleteTemplateSchema,
  sendTestSchema,
} from './notifications.schema';

const router = Router();

// ── All notifications routes require auth + ADMIN + EMAIL_REMINDERS_ENABLED ──
router.use(requireAuth);
router.use(requireRole('ADMIN'));
router.use(requireFeature('EMAIL_REMINDERS_ENABLED'));

// ─── Collection endpoints ─────────────────────────────────────────────────────

/**
 * GET /api/notifications/templates
 * ADMIN only. Paginated list of email templates.
 */
router.get(
  '/templates',
  validate(listTemplatesSchema),
  ctrl.listTemplates,
);

/**
 * POST /api/notifications/templates
 * ADMIN only. Create a new email template.
 */
router.post(
  '/templates',
  validate(createTemplateSchema),
  ctrl.createTemplate,
);

// ─── Sub-action routes (MUST be before /:id) ──────────────────────────────────

/**
 * POST /api/notifications/templates/:id/send-test
 * ADMIN only. Test-send a template to a specified email address.
 */
router.post(
  '/templates/:id/send-test',
  validate(sendTestSchema),
  ctrl.sendTestEmail,
);

// ─── Detail / mutation routes (MUST be after sub-actions) ─────────────────────

/**
 * GET /api/notifications/templates/:id
 * ADMIN only. Full template detail including HTML body.
 */
router.get(
  '/templates/:id',
  validate(getTemplateByIdSchema),
  ctrl.getTemplateById,
);

/**
 * PATCH /api/notifications/templates/:id
 * ADMIN only. Partially update an email template.
 */
router.patch(
  '/templates/:id',
  validate(updateTemplateSchema),
  ctrl.updateTemplate,
);

/**
 * DELETE /api/notifications/templates/:id
 * ADMIN only. Soft-delete (deactivate) an email template.
 */
router.delete(
  '/templates/:id',
  validate(deleteTemplateSchema),
  ctrl.deleteTemplate,
);

export { router as notificationRoutes };
