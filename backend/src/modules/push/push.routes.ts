/**
 * Push router — Phase 6.2
 *
 * | Method | Path                  | Auth  | Description                               |
 * |--------|-----------------------|-------|-------------------------------------------|
 * | GET    | /api/push/vapid-key   | Any   | Returns the VAPID public key              |
 * | POST   | /api/push/subscribe   | Any   | Register a Web Push subscription          |
 * | DELETE | /api/push/subscribe   | Any   | Remove a Web Push subscription            |
 *
 * All routes require authentication and STAFF_APP_ENABLED feature flag.
 * VAPID key is also publicly accessible so the browser can call it before login.
 */
import { Router } from 'express';
import { z }      from 'zod';

import { requireAuth }    from '../../middleware/auth';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import { AppError }       from '../../errors/AppError';
import { success }        from '../../utils/apiResponse';
import { extractTenantId } from '../../utils/extractTenantId';
import * as pushService   from './push.service';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const subscribeSchema = z.object({
  body: z.object({
    endpoint: z.string().url('endpoint must be a valid URL'),
    p256dh:   z.string().min(1, 'p256dh is required'),
    auth:     z.string().min(1, 'auth is required'),
  }),
});

const unsubscribeSchema = z.object({
  body: z.object({
    endpoint: z.string().url('endpoint must be a valid URL'),
  }),
});

// ─── Public: VAPID key ────────────────────────────────────────────────────────

/**
 * GET /api/push/vapid-key
 *
 * Returns the VAPID public key so the browser can create a push subscription.
 * Public — no auth required.
 */
router.get('/vapid-key', (_req, res, next) => {
  try {
    const result = pushService.getVapidKey();
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

// ─── Protected routes (auth + feature flag) ───────────────────────────────────

router.use(requireAuth, requireFeature('STAFF_APP_ENABLED'));

/**
 * POST /api/push/subscribe
 *
 * Registers a Web Push subscription for the authenticated user.
 * Idempotent — re-subscribing with the same endpoint refreshes the keys.
 */
router.post(
  '/subscribe',
  validate(subscribeSchema),
  async (req, res, next) => {
    try {
      const userId   = req.user!.id;
      const tenantId = extractTenantId(req);

      if (!tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'tenantId required for push subscriptions');
      }

      const { endpoint, p256dh, auth } = req.body as {
        endpoint: string; p256dh: string; auth: string;
      };

      const sub = await pushService.subscribe(userId, tenantId, endpoint, p256dh, auth);
      res.status(201).json(success(sub));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/push/subscribe
 *
 * Removes the push subscription for the given endpoint.
 * Idempotent — returns 200 even if subscription does not exist.
 */
router.delete(
  '/subscribe',
  validate(unsubscribeSchema),
  async (req, res, next) => {
    try {
      const userId   = req.user!.id;
      const tenantId = extractTenantId(req);

      if (!tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'tenantId required for push subscriptions');
      }

      const { endpoint } = req.body as { endpoint: string };
      await pushService.unsubscribe(userId, tenantId, endpoint);
      res.json(success({ unsubscribed: true }));
    } catch (err) {
      next(err);
    }
  },
);

export { router as pushRoutes };
