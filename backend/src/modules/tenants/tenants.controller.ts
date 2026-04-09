/**
 * Tenants controller — Phase 0
 *
 * HTTP handlers for /api/tenants endpoints.
 * Business logic lives in tenants.service.ts.
 * All endpoints require SUPER_ADMIN (enforced in the router).
 */
import { Request, Response, NextFunction } from 'express';

import { success, paginated } from '../../utils/apiResponse';
import * as svc from './tenants.service';
import type {
  CreateTenantBody,
  ListTenantsQuery,
  GetTenantParams,
  UpdateTenantParams,
  UpdateTenantBody,
  DeleteTenantParams,
} from './tenants.schema';

/**
 * POST /api/tenants
 * Provision a new tenant on the platform.
 */
export async function createTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenant = await svc.createTenant(req.body as CreateTenantBody);
    res.status(201).json(success(tenant));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tenants
 * Paginated list of all tenants.
 */
export async function listTenants(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await svc.listTenants(req.query as unknown as ListTenantsQuery);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tenants/:id
 * Get a single tenant by ID.
 */
export async function getTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as GetTenantParams;
    const tenant = await svc.getTenantById(id);
    res.json(success(tenant));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/tenants/:id
 * Update a tenant's details.
 */
export async function updateTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as UpdateTenantParams;
    const tenant = await svc.updateTenant(id, req.body as UpdateTenantBody);
    res.json(success(tenant));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/tenants/:id
 * Soft-delete (deactivate) a tenant.
 */
export async function deleteTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as DeleteTenantParams;
    const tenant = await svc.deleteTenant(id);
    res.json(success(tenant));
  } catch (err) {
    next(err);
  }
}
