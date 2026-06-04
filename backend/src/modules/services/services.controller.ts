/**
 * Services controller — Step 1.13
 *
 * HTTP handlers for the Services Catalogue API.
 *
 * Every handler follows the same pattern:
 *  1. Extract validated data from req.body / req.params / req.query
 *  2. Delegate to the corresponding service function
 *  3. Return a standard success / paginated envelope
 *  4. Forward unexpected errors to the global errorHandler via next(err)
 */
import { Request, Response, NextFunction } from 'express';

import { success, paginated } from '../../utils/apiResponse';
import { extractTenantId } from '../../utils/extractTenantId';
import * as svc from './services.service';
import type {
  ListCategoriesQuery,
  CreateCategoryBody,
  UpdateCategoryBody,
  ListServicesQuery,
  CreateServiceBody,
  UpdateServiceBody,
  LinkServiceBody,
} from './services.schema';

// ─── Category handlers ────────────────────────────────────────────────────────

/**
 * GET /api/services/categories
 * Public — returns all categories, optionally filtered by isActive.
 */
export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query  = req.query as ListCategoriesQuery;
    const result = await svc.listCategories(query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/services/categories
 * ADMIN — creates a new service category.
 */
export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body   = req.body as CreateCategoryBody;
    const result = await svc.createCategory(body);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/services/categories/:id
 * ADMIN — partially updates a service category.
 */
export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const body   = req.body as UpdateCategoryBody;
    const result = await svc.updateCategory(id, body);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/services/categories/:id
 * ADMIN — deletes a service category (409 if it has services).
 */
export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await svc.deleteCategory(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ─── Service handlers ─────────────────────────────────────────────────────────

/**
 * GET /api/services
 * Public — paginated list of services with optional filters.
 */
export async function listServices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query  = req.query as ListServicesQuery;
    const tenantId = extractTenantId(req);
    const result = await svc.listServices(query, tenantId);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/services/:id
 * Public — returns a single service with full artist roster.
 */
export async function getService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await svc.getService(id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/services
 * ADMIN — creates a new service.
 */
export async function createService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body   = req.body as CreateServiceBody;
    const tenantId = extractTenantId(req);
    const result = await svc.createService(body, tenantId);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/services/:id
 * ADMIN — partially updates a service.
 */
export async function updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const body   = req.body as UpdateServiceBody;
    const tenantId = extractTenantId(req);
    const result = await svc.updateService(id, body, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/services/:id
 * ADMIN — deactivates a service (soft-delete, 409 if active bookings).
 */
export async function deleteService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const tenantId = extractTenantId(req);
    await svc.deleteService(id, tenantId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ─── Link handlers ────────────────────────────────────────────────────────────

/**
 * POST /api/services/:id/link
 * ARTIST/ADMIN — links an artist to a service.
 */
export async function linkService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const actor  = req.user!;
    const body   = req.body as LinkServiceBody;
    await svc.linkService(id, actor.id, actor.role as 'ADMIN' | 'ARTIST', body);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/services/:id/link
 * ARTIST/ADMIN — unlinks an artist from a service.
 */
export async function unlinkService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const actor  = req.user!;
    const body   = req.body as LinkServiceBody;
    await svc.unlinkService(id, actor.id, actor.role as 'ADMIN' | 'ARTIST', body);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
