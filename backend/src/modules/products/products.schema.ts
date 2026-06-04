/**
 * Products / Inventory module — Zod validation schemas — Phase 4.3
 *
 * Endpoints:
 *   GET    /api/products              — list products (paginated)
 *   GET    /api/products/:id          — get a single product
 *   POST   /api/products              — create a product
 *   PATCH  /api/products/:id          — update a product
 *   DELETE /api/products/:id          — deactivate a product (soft-delete)
 *   PATCH  /api/products/:id/stock    — restock / adjust stock level
 */
import { z } from 'zod';

// ─── GET /api/products ────────────────────────────────────────────────────────

export const listProductsSchema = z.object({
  query: z.object({
    page:      z.coerce.number().int().min(1).optional().default(1),
    limit:     z.coerce.number().int().min(1).max(100).optional().default(20),
    category:  z.string().optional(),
    lowStock:  z.coerce.boolean().optional(),
  }),
});

export type ListProductsQuery = z.infer<typeof listProductsSchema>['query'];

// ─── GET /api/products/:id ────────────────────────────────────────────────────

export const getProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── POST /api/products ───────────────────────────────────────────────────────

export const createProductSchema = z.object({
  body: z.object({
    name:              z.string().min(1, 'name is required').max(200),
    sku:               z.string().min(1).max(100).optional(),
    price:             z.number().min(0, 'price must be non-negative'),
    stockLevel:        z.number().int().min(0).optional().default(0),
    lowStockThreshold: z.number().int().min(0).optional().default(5),
    category:          z.string().optional(),
    imageUrl:          z.string().url('imageUrl must be a valid URL').optional(),
  }),
});

export type CreateProductBody = z.infer<typeof createProductSchema>['body'];

// ─── PATCH /api/products/:id ──────────────────────────────────────────────────

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    name:              z.string().min(1).max(200).optional(),
    sku:               z.string().min(1).max(100).optional(),
    price:             z.number().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    category:          z.string().optional(),
    imageUrl:          z.string().url().optional(),
    isActive:          z.boolean().optional(),
  }),
});

export type UpdateProductBody = z.infer<typeof updateProductSchema>['body'];

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────

export const deleteProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── PATCH /api/products/:id/stock ───────────────────────────────────────────

export const adjustStockSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    quantity: z.number().int('quantity must be an integer'),
    reason:   z.enum(['SALE', 'ADJUSTMENT', 'RESTOCK'], {
      errorMap: () => ({ message: 'reason must be SALE, ADJUSTMENT, or RESTOCK' }),
    }),
    notes:    z.string().optional(),
  }),
});

export type AdjustStockBody = z.infer<typeof adjustStockSchema>['body'];
