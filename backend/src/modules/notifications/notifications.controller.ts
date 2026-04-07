/**
 * Notifications controller — Step 1.15
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic and DB access lives in notifications.service.ts.
 *
 * Role enforcement is handled at the router level (requireRole middleware).
 * All endpoints in this module require ADMIN role.
 */
import { Request, Response, NextFunction } from 'express';

import * as notificationsService from './notifications.service';
import { success, paginated }    from '../../utils/apiResponse';
import type {
  ListTemplatesQuery,
  CreateTemplateBody,
  UpdateTemplateBody,
  SendTestBody,
} from './notifications.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/notifications/templates
 * ADMIN only. Returns a paginated list of email templates.
 *
 * Optional query params:
 *   isActive — filter by active/inactive ('true' or 'false')
 *   page     — page number (default 1)
 *   limit    — records per page (default 20, max 100)
 */
export async function listTemplates(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query  = req.query as unknown as ListTemplatesQuery;
    const result = await notificationsService.listTemplates(query);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/templates/:id
 * ADMIN only. Returns the full detail of a single email template, including
 * the HTML body.
 */
export async function getTemplateById(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }    = req.params as { id: string };
    const template  = await notificationsService.getTemplateById(id);
    res.json(success(template));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notifications/templates
 * ADMIN only. Creates a new email template.
 *
 * The template `key` must be unique across all templates.
 * Returns 409 when a duplicate key is detected.
 */
export async function createTemplate(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body     = req.body as CreateTemplateBody;
    const template = await notificationsService.createTemplate(body);
    res.status(201).json(success(template));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/templates/:id
 * ADMIN only. Partially updates an email template.
 *
 * At least one field (subject, htmlBody, variables, isActive) must be provided.
 * Returns 404 when the template does not exist.
 */
export async function updateTemplate(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const body     = req.body as UpdateTemplateBody;
    const template = await notificationsService.updateTemplate(id, body);
    res.json(success(template));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/notifications/templates/:id
 * ADMIN only. Soft-deletes (deactivates) an email template.
 *
 * Templates are never hard-deleted — historical references remain intact.
 * Returns 409 when the template is already inactive.
 */
export async function deleteTemplate(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const template = await notificationsService.deleteTemplate(id);
    res.json(success(template));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notifications/templates/:id/send-test
 * ADMIN only. Sends a test email for a given template to the specified address.
 *
 * Variable values supplied in the request body are rendered into the template.
 * Returns the rendered subject line plus confirmation metadata.
 */
export async function sendTestEmail(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const body   = req.body as SendTestBody;
    const result = await notificationsService.sendTestEmail(id, body);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
