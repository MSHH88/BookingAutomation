/**
 * Webhooks router — Step 1.27
 *
 * | Method | Path                               | Auth  | Description           |
 * |--------|------------------------------------|-------|-----------------------|
 * | GET    | /api/webhooks                      | ADMIN | List all webhooks     |
 * | POST   | /api/webhooks                      | ADMIN | Register webhook      |
 * | GET    | /api/webhooks/:id                  | ADMIN | Get webhook details   |
 * | PATCH  | /api/webhooks/:id                  | ADMIN | Update webhook        |
 * | DELETE | /api/webhooks/:id                  | ADMIN | Delete webhook        |
 * | GET    | /api/webhooks/:id/deliveries       | ADMIN | Delivery history      |
 * | POST   | /api/webhooks/:id/test             | ADMIN | Send test event       |
 *
 * Security:
 *   - All routes require a valid JWT with the ADMIN role.
 *   - No feature flag gate — outgoing webhooks are always available once
 *     configured (same pattern as /api/admin).
 *
 * Route registration order:
 *   Sub-routes (/:id/deliveries, /:id/test) MUST be registered before /:id
 *   routes to prevent Express from treating the sub-path segment as an id.
 */

import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate }    from '../../middleware/validate';
import * as ctrl       from './webhooks.controller';
import {
  listWebhooksSchema,
  createWebhookSchema,
  getWebhookByIdSchema,
  updateWebhookSchema,
  deleteWebhookSchema,
  listDeliveriesSchema,
  testWebhookSchema,
} from './webhooks.schema';

const router = Router();

// All webhook routes require authentication + ADMIN role
router.use(requireAuth);
router.use(requireRole('ADMIN'));

// ─── Collection endpoints ─────────────────────────────────────────────────────

/** GET /api/webhooks — paginated list */
router.get(
  '/',
  validate(listWebhooksSchema),
  ctrl.listWebhooks,
);

/** POST /api/webhooks — register new webhook (secret returned once) */
router.post(
  '/',
  validate(createWebhookSchema),
  ctrl.createWebhook,
);

// ─── Sub-action routes (MUST precede /:id) ────────────────────────────────────

/** GET /api/webhooks/:id/deliveries — delivery history */
router.get(
  '/:id/deliveries',
  validate(listDeliveriesSchema),
  ctrl.listWebhookDeliveries,
);

/** POST /api/webhooks/:id/test — send a test event */
router.post(
  '/:id/test',
  validate(testWebhookSchema),
  ctrl.testWebhook,
);

// ─── Resource routes (MUST follow sub-actions) ────────────────────────────────

/** GET /api/webhooks/:id — get single webhook (secret excluded) */
router.get(
  '/:id',
  validate(getWebhookByIdSchema),
  ctrl.getWebhookById,
);

/** PATCH /api/webhooks/:id — partial update */
router.patch(
  '/:id',
  validate(updateWebhookSchema),
  ctrl.updateWebhook,
);

/** DELETE /api/webhooks/:id — permanently delete + cascade deliveries */
router.delete(
  '/:id',
  validate(deleteWebhookSchema),
  ctrl.deleteWebhook,
);

export { router as webhookRoutes };
