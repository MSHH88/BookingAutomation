/**
 * WhatsApp Templates controller — Phase 1 (Messaging Foundation)
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic lives in whatsapp-templates.service.ts.
 *
 * Route-level auth is enforced in whatsapp-templates.routes.ts:
 *   All endpoints: requireAuth + requireRole('ADMIN') + requireFeature('WHATSAPP_CONTACT_ENABLED')
 */
import { Request, Response, NextFunction } from 'express';

import * as templateService from './whatsapp-templates.service';
import { extractTenantId } from '../../utils/extractTenantId';
import { AppError } from '../../errors/AppError';
import { success, paginated } from '../../utils/apiResponse';
import type {
  ListWhatsAppTemplatesQuery,
  UpdateWhatsAppTemplateBody,
  PreviewWhatsAppTemplateBody,
} from './whatsapp-templates.schema';

// ─── GET / — list templates ───────────────────────────────────────────────────

/**
 * GET /api/messages/whatsapp-templates
 *
 * Returns a paginated list of WhatsApp templates for the authenticated
 * user's tenant.
 */
export async function listTemplates(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    if (!tenantId) throw new AppError(403, 'FORBIDDEN', 'Tenant context required');
    const query = req.query as unknown as ListWhatsAppTemplatesQuery;
    const result = await templateService.listTemplates(tenantId, query);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

// ─── GET /:key — single template ─────────────────────────────────────────────

/**
 * GET /api/messages/whatsapp-templates/:key
 *
 * Returns a single WhatsApp template by key.
 */
export async function getTemplate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    if (!tenantId) throw new AppError(403, 'FORBIDDEN', 'Tenant context required');
    const { key } = req.params;
    const template = await templateService.getTemplateByKey(tenantId, key);
    res.json(success(template));
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /:key — update template ───────────────────────────────────────────

/**
 * PATCH /api/messages/whatsapp-templates/:key
 *
 * Updates an existing WhatsApp template.
 */
export async function updateTemplate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    if (!tenantId) throw new AppError(403, 'FORBIDDEN', 'Tenant context required');
    const { key } = req.params;
    const body = req.body as UpdateWhatsAppTemplateBody;
    const template = await templateService.updateTemplate(tenantId, key, body);
    res.json(success(template));
  } catch (err) {
    next(err);
  }
}

// ─── POST /:key/preview — preview rendered template ──────────────────────────

/**
 * POST /api/messages/whatsapp-templates/:key/preview
 *
 * Renders the template with the provided variables and returns the preview.
 */
export async function previewTemplate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    if (!tenantId) throw new AppError(403, 'FORBIDDEN', 'Tenant context required');
    const { key } = req.params;
    const { variables } = req.body as PreviewWhatsAppTemplateBody;
    const preview = await templateService.previewTemplate(tenantId, key, variables);
    res.json(success(preview));
  } catch (err) {
    next(err);
  }
}
