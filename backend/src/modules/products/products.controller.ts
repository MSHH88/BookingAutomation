/**
 * Products / Inventory controller — Phase 4.3
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';
import { extractTenantId } from '../../utils/extractTenantId';

import * as productsService from './products.service';
import { success }          from '../../utils/apiResponse';
import type {
  ListProductsQuery,
  CreateProductBody,
  UpdateProductBody,
  AdjustStockBody,
} from './products.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/products
 */
export async function listProducts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const query    = req.query as unknown as ListProductsQuery;
    const result   = await productsService.listProducts(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/:id
 */
export async function getProductById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const tenantId = extractTenantId(req);
    const product  = await productsService.getProductById(id, tenantId);
    res.json(success(product));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/products
 */
export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const body     = req.body as CreateProductBody;
    const product  = await productsService.createProduct(tenantId, body);
    res.status(201).json(success(product));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/products/:id
 */
export async function updateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const tenantId = extractTenantId(req);
    const body     = req.body as UpdateProductBody;
    const product  = await productsService.updateProduct(id, tenantId, body);
    res.json(success(product));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/products/:id
 */
export async function deleteProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const tenantId = extractTenantId(req);
    const result   = await productsService.deleteProduct(id, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/products/:id/stock
 */
export async function adjustStock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const tenantId = extractTenantId(req);
    const body     = req.body as AdjustStockBody;
    const result   = await productsService.adjustStock(id, tenantId, body);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
