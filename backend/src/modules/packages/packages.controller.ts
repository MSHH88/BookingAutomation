/**
 * Packages controller — Phase 5.1
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';
import { extractTenantId } from '../../utils/extractTenantId';

import * as packagesService from './packages.service';
import { success }          from '../../utils/apiResponse';
import type {
  CreatePackageBody,
  UpdatePackageBody,
  ListPackagesQuery,
  PurchasePackageBody,
  ListCustomerPackagesQuery,
} from './packages.schema';

// ─── Package CRUD ─────────────────────────────────────────────────────────────

export async function createPackage(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const body     = req.body as CreatePackageBody;
    const pkg      = await packagesService.createPackage(tenantId, body);
    res.status(201).json(success(pkg));
  } catch (err) {
    next(err);
  }
}

export async function listPackages(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const query    = req.query as unknown as ListPackagesQuery;
    const result   = await packagesService.listPackages(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

export async function getPackageById(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const { id }   = req.params as { id: string };
    const pkg      = await packagesService.getPackageById(id, tenantId);
    res.json(success(pkg));
  } catch (err) {
    next(err);
  }
}

export async function updatePackage(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const { id }   = req.params as { id: string };
    const body     = req.body as UpdatePackageBody;
    const pkg      = await packagesService.updatePackage(id, tenantId, body);
    res.json(success(pkg));
  } catch (err) {
    next(err);
  }
}

export async function deletePackage(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const { id }   = req.params as { id: string };
    const pkg      = await packagesService.deletePackage(id, tenantId);
    res.json(success(pkg));
  } catch (err) {
    next(err);
  }
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export async function purchasePackage(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const { id }   = req.params as { id: string };
    const body     = req.body as PurchasePackageBody;
    const result   = await packagesService.purchasePackage(id, body, tenantId);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── Customer views ───────────────────────────────────────────────────────────

export async function listCustomerPackages(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId    = extractTenantId(req);
    const { customerId } = req.params as { customerId: string };
    const query       = req.query as unknown as ListCustomerPackagesQuery;
    const result      = await packagesService.listCustomerPackages(customerId, tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

export async function getMyPackages(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const customerId = req.user!.id;
    const tenantId   = extractTenantId(req);
    const query      = req.query as unknown as ListCustomerPackagesQuery;
    const result     = await packagesService.getMyPackages(customerId, tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
