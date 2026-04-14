/**
 * Products / Inventory service — Phase 4.3
 *
 * Business logic for product inventory management.
 *
 * ─── What this module does ───────────────────────────────────────────────────
 *
 *   listProducts(tenantId, query)
 *     Paginated list of products with optional category and low-stock filters.
 *
 *   getProductById(id, tenantId)
 *     Get a single product, verifying tenant access.
 *
 *   createProduct(tenantId, data)
 *     Create a new product with initial stock level.
 *
 *   updateProduct(id, tenantId, data)
 *     Update product fields.
 *
 *   deleteProduct(id, tenantId)
 *     Soft-delete by setting isActive = false.
 *
 *   adjustStock(id, tenantId, data)
 *     Apply a stock movement (RESTOCK / ADJUSTMENT / SALE).
 *     Appends a StockMovement audit record.
 *     Raises LOW_STOCK alert when stockLevel ≤ lowStockThreshold after adjustment.
 */
import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { logger }   from '../../utils/logger';
import type { ListProductsQuery, CreateProductBody, UpdateProductBody, AdjustStockBody } from './products.schema';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/products
 * Paginated list of active products for a tenant.
 * Supports filtering by category and by low-stock status.
 */
export async function listProducts(tenantId: string | null, query: ListProductsQuery) {
  const { page = 1, limit = 20, category, lowStock } = query;
  const skip = (page - 1) * limit;

  // Build the where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { tenantId, isActive: true };
  if (category) {
    where.category = category;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take:    limit,
    }),
    prisma.product.count({ where }),
  ]);

  // Filter low-stock in memory to avoid a Prisma raw expression for column comparison
  const filtered = lowStock
    ? products.filter(p => p.stockLevel <= p.lowStockThreshold)
    : products;

  return { products: filtered, total, page, limit };
}

/**
 * GET /api/products/:id
 * Get a single product by ID, verifying tenant access.
 */
export async function getProductById(id: string, tenantId: string | null) {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  }

  if (product.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this product');
  }

  return product;
}

/**
 * POST /api/products
 * Create a new product for a tenant.
 */
export async function createProduct(tenantId: string | null, data: CreateProductBody) {
  const product = await prisma.product.create({
    data: {
      tenantId,
      name:              data.name,
      sku:               data.sku ?? null,
      price:             data.price,
      stockLevel:        data.stockLevel ?? 0,
      lowStockThreshold: data.lowStockThreshold ?? 5,
      category:          data.category ?? null,
      imageUrl:          data.imageUrl ?? null,
    },
  });

  // Record initial stock-in movement if stock > 0
  if (product.stockLevel > 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        tenantId,
        quantity:  product.stockLevel,
        reason:    'RESTOCK',
        notes:     'Initial stock',
      },
    });
  }

  return product;
}

/**
 * PATCH /api/products/:id
 * Update product details.
 */
export async function updateProduct(id: string, tenantId: string | null, data: UpdateProductBody) {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  }

  if (product.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this product');
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(data.name              !== undefined && { name:              data.name }),
      ...(data.sku               !== undefined && { sku:               data.sku }),
      ...(data.price             !== undefined && { price:             data.price }),
      ...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold }),
      ...(data.category          !== undefined && { category:          data.category }),
      ...(data.imageUrl          !== undefined && { imageUrl:          data.imageUrl }),
      ...(data.isActive          !== undefined && { isActive:          data.isActive }),
    },
  });

  return updated;
}

/**
 * DELETE /api/products/:id
 * Soft-delete a product (sets isActive = false).
 */
export async function deleteProduct(id: string, tenantId: string | null) {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  }

  if (product.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this product');
  }

  await prisma.product.update({
    where: { id },
    data:  { isActive: false },
  });

  return { id, deleted: true };
}

/**
 * PATCH /api/products/:id/stock
 * Apply a stock movement (in or out).
 * Creates an audit record in StockMovement.
 * Logs a LOW_STOCK warning when stock falls to or below the threshold.
 */
export async function adjustStock(id: string, tenantId: string | null, data: AdjustStockBody) {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  }

  if (product.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this product');
  }

  const newStock = product.stockLevel + data.quantity;

  if (newStock < 0) {
    throw new AppError(
      400,
      'INSUFFICIENT_STOCK',
      `Stock adjustment would result in negative stock (${newStock})`,
    );
  }

  const [updated] = await Promise.all([
    prisma.product.update({
      where: { id },
      data:  { stockLevel: newStock },
    }),
    prisma.stockMovement.create({
      data: {
        productId: id,
        tenantId,
        quantity:  data.quantity,
        reason:    data.reason,
        notes:     data.notes ?? null,
      },
    }),
  ]);

  // LOW_STOCK alert: log a warning when stock falls to or below threshold
  if (newStock <= product.lowStockThreshold) {
    logger.warn('LOW_STOCK alert: product stock is at or below threshold', {
      productId:        id,
      tenantId,
      productName:      product.name,
      currentStock:     newStock,
      lowStockThreshold: product.lowStockThreshold,
    });
  }

  return {
    id:         updated.id,
    name:       updated.name,
    stockLevel: updated.stockLevel,
    isLowStock: updated.stockLevel <= updated.lowStockThreshold,
  };
}
