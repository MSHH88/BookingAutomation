/**
 * Styles controller — one handler per endpoint.
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic lives in styles.service.ts.
 */
import { Request, Response, NextFunction } from 'express';

import * as stylesService from './styles.service';
import { success, paginated } from '../../utils/apiResponse';
import type { CreateStyleBody, UpdateStyleBody, ListStylesQuery } from './styles.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAdmin(req: Request): boolean {
  return req.user?.role === 'ADMIN';
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/styles
 * Public: lists active styles.
 * Admin (with JWT + ADMIN role): can filter by isActive.
 */
export async function listStyles(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as ListStylesQuery;
    const result = await stylesService.listStyles(query, isAdmin(req));
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/styles/:id
 * Public: returns a single active style.
 * Admin: can see inactive styles too.
 */
export async function getStyleById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const style = await stylesService.getStyleById(id, isAdmin(req));
    res.json(success(style));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/styles
 * ADMIN only. Creates a new style.
 */
export async function createStyle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as CreateStyleBody;
    const style = await stylesService.createStyle(body);
    res.status(201).json(success(style));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/styles/:id
 * ADMIN only. Updates a style's fields.
 */
export async function updateStyle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const body = req.body as UpdateStyleBody;
    const style = await stylesService.updateStyle(id, body);
    res.json(success(style));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/styles/:id
 * ADMIN only. Soft-deletes a style (isActive = false).
 */
export async function deleteStyle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await stylesService.deleteStyle(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
