/**
 * WhatsApp Templates router — Phase 1 (Messaging Foundation)
 *
 * Mounts the WhatsApp template management endpoints under
 * /api/messages/whatsapp-templates.
 *
 * | Method | Path                                          | Auth  | Feature Flag             | Description                 |
 * |--------|-----------------------------------------------|-------|--------------------------|-----------------------------|
 * | GET    | /api/messages/whatsapp-templates               | ADMIN | WHATSAPP_CONTACT_ENABLED | List all templates          |
 * | GET    | /api/messages/whatsapp-templates/:key          | ADMIN | WHATSAPP_CONTACT_ENABLED | Get single template by key  |
 * | PATCH  | /api/messages/whatsapp-templates/:key          | ADMIN | WHATSAPP_CONTACT_ENABLED | Update template             |
 * | POST   | /api/messages/whatsapp-templates/:key/preview  | ADMIN | WHATSAPP_CONTACT_ENABLED | Preview rendered template   |
 *
 * All routes require authentication, ADMIN role, and the WHATSAPP_CONTACT_ENABLED
 * feature flag to be active.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './whatsapp-templates.controller';
import {
  listWhatsAppTemplatesSchema,
  getWhatsAppTemplateSchema,
  updateWhatsAppTemplateSchema,
  previewWhatsAppTemplateSchema,
} from './whatsapp-templates.schema';

const router = Router();

// ── All routes require auth + ADMIN + WHATSAPP_CONTACT_ENABLED ────────────────
router.use(requireAuth);
router.use(requireRole('ADMIN'));
router.use(requireFeature('WHATSAPP_CONTACT_ENABLED'));

/** GET / — paginated list of WhatsApp templates for the tenant. */
router.get(
  '/',
  validate(listWhatsAppTemplatesSchema),
  ctrl.listTemplates,
);

/** GET /:key — single template lookup by key. */
router.get(
  '/:key',
  validate(getWhatsAppTemplateSchema),
  ctrl.getTemplate,
);

/** PATCH /:key — partial update of template fields. */
router.patch(
  '/:key',
  validate(updateWhatsAppTemplateSchema),
  ctrl.updateTemplate,
);

/** POST /:key/preview — render template with provided variables. */
router.post(
  '/:key/preview',
  validate(previewWhatsAppTemplateSchema),
  ctrl.previewTemplate,
);

export { router as whatsappTemplateRoutes };
