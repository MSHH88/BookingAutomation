/**
 * SMS Templates controller — Phase 1 (Messaging Foundation)
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic lives in sms-templates.service.ts.
 *
 * Route-level auth is enforced in sms-templates.routes.ts:
 *   All endpoints: requireAuth + requireRole('ADMIN') + requireFeature('SMS_REMINDERS_ENABLED')
 */
import { Request, Response, NextFunction } from 'express';

import * as templateService from './sms-templates.service';
import { success, paginated } from '../../utils/apiResponse';
import type {
  ListSmsTemplatesQuery,
  UpdateSmsTemplateBody,
  PreviewSmsTemplateBody,
} from './sms-templates.schema';

// ─── GET / — list templates ───────────────────────────────────────────────────

/**
 * GET /api/messages/sms-templates
 *
 * Returns a paginated list of SMS templates for the authenticated
 * user's tenant.
 */
export async function listTemplates(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId as string;
    const query = req.query as unknown as ListSmsTemplatesQuery;
    const result = await templateService.listTemplates(tenantId, query);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

// ─── GET /:key — single template ─────────────────────────────────────────────

/**
 * GET /api/messages/sms-templates/:key
 *
 * Returns a single SMS template by key.
 */
export async function getTemplate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId as string;
    const { key } = req.params;
    const template = await templateService.getTemplateByKey(tenantId, key);
    res.json(success(template));
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /:key — update template ───────────────────────────────────────────

/**
 * PATCH /api/messages/sms-templates/:key
 *
 * Updates an existing SMS template.
 */
export async function updateTemplate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId as string;
    const { key } = req.params;
    const body = req.body as UpdateSmsTemplateBody;
    const template = await templateService.updateTemplate(tenantId, key, body);
    res.json(success(template));
  } catch (err) {
    next(err);
  }
}

// ─── POST /:key/preview — preview rendered template ──────────────────────────

/**
 * POST /api/messages/sms-templates/:key/preview
 *
 * Renders the template with the provided variables and returns the preview.
 */
export async function previewTemplate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId as string;
    const { key } = req.params;
    const { variables } = req.body as PreviewSmsTemplateBody;
    const preview = await templateService.previewTemplate(tenantId, key, variables);
    res.json(success(preview));
  } catch (err) {
    next(err);
  }
}
