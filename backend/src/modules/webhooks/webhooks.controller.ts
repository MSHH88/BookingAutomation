/**
 * Webhooks controller — Step 1.27
 *
 * Thin HTTP adapter between Express and webhooks.service.ts.
 * All request validation is handled upstream by the `validate` middleware.
 *
 * | Method | Path                               | Handler               |
 * |--------|------------------------------------|-----------------------|
 * | GET    | /api/webhooks                      | listWebhooks          |
 * | POST   | /api/webhooks                      | createWebhook         |
 * | GET    | /api/webhooks/:id                  | getWebhookById        |
 * | PATCH  | /api/webhooks/:id                  | updateWebhook         |
 * | DELETE | /api/webhooks/:id                  | deleteWebhook         |
 * | GET    | /api/webhooks/:id/deliveries       | listWebhookDeliveries |
 * | POST   | /api/webhooks/:id/test             | testWebhook           |
 */

import { Request, Response, NextFunction } from 'express';

import { success } from '../../utils/apiResponse';
import { extractTenantId } from '../../utils/extractTenantId';
import * as svc    from './webhooks.service';
import type {
  ListWebhooksQuery,
  CreateWebhookBody,
  UpdateWebhookBody,
  ListDeliveriesQuery,
} from './webhooks.schema';

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listWebhooks(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const result = await svc.listWebhooks(tenantId, req.query as unknown as ListWebhooksQuery);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const webhook = await svc.createWebhook(tenantId, req.body as CreateWebhookBody);
    // 201 Created — the secret is included in this response only
    res.status(201).json(success(webhook));
  } catch (err) {
    next(err);
  }
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getWebhookById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const webhook = await svc.getWebhookById(tenantId, req.params['id'] as string);
    res.json(success(webhook));
  } catch (err) {
    next(err);
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const webhook = await svc.updateWebhook(
      tenantId,
      req.params['id'] as string,
      req.body as UpdateWebhookBody,
    );
    res.json(success(webhook));
  } catch (err) {
    next(err);
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    await svc.deleteWebhook(tenantId, req.params['id'] as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Delivery history ─────────────────────────────────────────────────────────

export async function listWebhookDeliveries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const result = await svc.listWebhookDeliveries(
      tenantId,
      req.params['id'] as string,
      req.query as unknown as ListDeliveriesQuery,
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── Test delivery ────────────────────────────────────────────────────────────

export async function testWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const result = await svc.testWebhook(tenantId, req.params['id'] as string);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
