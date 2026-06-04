/**
 * Products / Inventory service — unit tests — Phase 4.3
 *
 * Tests:
 *  1.  listProducts — returns paginated products
 *  2.  listProducts — filters by category
 *  3.  listProducts — filters low-stock items in memory
 *  4.  getProductById — returns product for valid id
 *  5.  getProductById — throws 404 for unknown product
 *  6.  getProductById — throws 403 for wrong tenant
 *  7.  getProductById — throws 403 when product has null tenantId
 *  8.  createProduct — creates product with initial stock movement
 *  9.  createProduct — does not create stock movement when stockLevel = 0
 * 10.  updateProduct — updates product fields
 * 11.  updateProduct — throws 404 for unknown product
 * 12.  updateProduct — throws 403 for wrong tenant
 * 13.  deleteProduct — soft-deletes product (isActive = false)
 * 14.  deleteProduct — throws 404 for unknown product
 * 15.  adjustStock — adds stock and creates movement record
 * 16.  adjustStock — subtracts stock and creates movement record
 * 17.  adjustStock — throws 400 when stock would go negative
 * 18.  adjustStock — throws 404 for unknown product
 * 19.  adjustStock — throws 403 for wrong tenant
 * 20.  adjustStock — logs warning when stock falls to low-stock threshold
 *
 * Total: 20 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockProductFindUnique = jest.fn();
const mockProductFindMany   = jest.fn();
const mockProductCount      = jest.fn();
const mockProductCreate     = jest.fn();
const mockProductUpdate     = jest.fn();
const mockStockMovCreate    = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: (...a: unknown[]) => mockProductFindUnique(...a),
      findMany:   (...a: unknown[]) => mockProductFindMany(...a),
      count:      (...a: unknown[]) => mockProductCount(...a),
      create:     (...a: unknown[]) => mockProductCreate(...a),
      update:     (...a: unknown[]) => mockProductUpdate(...a),
    },
    stockMovement: {
      create: (...a: unknown[]) => mockStockMovCreate(...a),
    },
  },
}));

import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
} from './products.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id:                'prod-1',
    tenantId:          'tenant-1',
    name:              'Blue Ink',
    sku:               'INK-BLUE-001',
    price:             9.99,
    stockLevel:        20,
    lowStockThreshold: 5,
    category:          'Inks',
    imageUrl:          null,
    isActive:          true,
    createdAt:         new Date('2024-01-01'),
    updatedAt:         new Date('2024-01-01'),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('products.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── listProducts ──────────────────────────────────────────────────────────

  describe('listProducts', () => {
    it('returns paginated products', async () => {
      mockProductFindMany.mockResolvedValue([makeProduct()]);
      mockProductCount.mockResolvedValue(1);

      const result = await listProducts('tenant-1', { page: 1, limit: 20 });

      expect(result.products).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockProductFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1', isActive: true }, skip: 0, take: 20 }),
      );
    });

    it('filters by category', async () => {
      mockProductFindMany.mockResolvedValue([makeProduct({ category: 'Inks' })]);
      mockProductCount.mockResolvedValue(1);

      await listProducts('tenant-1', { page: 1, limit: 20, category: 'Inks' });

      expect(mockProductFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1', isActive: true, category: 'Inks' } }),
      );
    });

    it('filters low-stock items in memory', async () => {
      const lowStockProduct  = makeProduct({ stockLevel: 3, lowStockThreshold: 5 });
      const okStockProduct   = makeProduct({ id: 'prod-2', stockLevel: 15, lowStockThreshold: 5 });
      mockProductFindMany.mockResolvedValue([lowStockProduct, okStockProduct]);
      mockProductCount.mockResolvedValue(2);

      const result = await listProducts('tenant-1', { page: 1, limit: 20, lowStock: true });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].id).toBe('prod-1');
    });
  });

  // ── getProductById ────────────────────────────────────────────────────────

  describe('getProductById', () => {
    it('returns product for valid id', async () => {
      mockProductFindUnique.mockResolvedValue(makeProduct());

      const result = await getProductById('prod-1', 'tenant-1');

      expect(result.id).toBe('prod-1');
    });

    it('throws 404 for unknown product', async () => {
      mockProductFindUnique.mockResolvedValue(null);

      await expect(getProductById('bad-id', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'PRODUCT_NOT_FOUND',
      });
    });

    it('throws 403 for wrong tenant', async () => {
      mockProductFindUnique.mockResolvedValue(makeProduct({ tenantId: 'tenant-other' }));

      await expect(getProductById('prod-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('throws 403 when product has null tenantId', async () => {
      mockProductFindUnique.mockResolvedValue(makeProduct({ tenantId: null }));

      await expect(getProductById('prod-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  // ── createProduct ─────────────────────────────────────────────────────────

  describe('createProduct', () => {
    it('creates product and initial stock movement when stockLevel > 0', async () => {
      const created = makeProduct({ stockLevel: 10 });
      mockProductCreate.mockResolvedValue(created);
      mockStockMovCreate.mockResolvedValue({});

      const result = await createProduct('tenant-1', {
        name:              'Blue Ink',
        price:             9.99,
        stockLevel:        10,
        lowStockThreshold: 5,
      });

      expect(result.id).toBe('prod-1');
      expect(mockStockMovCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-1',
            quantity:  10,
            reason:    'RESTOCK',
          }),
        }),
      );
    });

    it('does not create stock movement when stockLevel = 0', async () => {
      const created = makeProduct({ stockLevel: 0 });
      mockProductCreate.mockResolvedValue(created);

      await createProduct('tenant-1', { name: 'Empty Product', price: 5.0, stockLevel: 0, lowStockThreshold: 5 });

      expect(mockStockMovCreate).not.toHaveBeenCalled();
    });
  });

  // ── updateProduct ─────────────────────────────────────────────────────────

  describe('updateProduct', () => {
    it('updates product fields', async () => {
      mockProductFindUnique.mockResolvedValue(makeProduct());
      mockProductUpdate.mockResolvedValue(makeProduct({ name: 'Red Ink', price: 12.0 }));

      const result = await updateProduct('prod-1', 'tenant-1', { name: 'Red Ink', price: 12.0 });

      expect(result.name).toBe('Red Ink');
      expect(mockProductUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data:  expect.objectContaining({ name: 'Red Ink', price: 12.0 }),
        }),
      );
    });

    it('throws 404 for unknown product', async () => {
      mockProductFindUnique.mockResolvedValue(null);

      await expect(updateProduct('bad-id', 'tenant-1', { name: 'X' })).rejects.toMatchObject({
        statusCode: 404,
        code: 'PRODUCT_NOT_FOUND',
      });
    });

    it('throws 403 for wrong tenant', async () => {
      mockProductFindUnique.mockResolvedValue(makeProduct({ tenantId: 'other' }));

      await expect(updateProduct('prod-1', 'tenant-1', { name: 'X' })).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  // ── deleteProduct ─────────────────────────────────────────────────────────

  describe('deleteProduct', () => {
    it('soft-deletes product by setting isActive = false', async () => {
      mockProductFindUnique.mockResolvedValue(makeProduct());
      mockProductUpdate.mockResolvedValue({});

      const result = await deleteProduct('prod-1', 'tenant-1');

      expect(result.deleted).toBe(true);
      expect(mockProductUpdate).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data:  { isActive: false },
      });
    });

    it('throws 404 for unknown product', async () => {
      mockProductFindUnique.mockResolvedValue(null);

      await expect(deleteProduct('bad-id', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'PRODUCT_NOT_FOUND',
      });
    });
  });

  // ── adjustStock ───────────────────────────────────────────────────────────

  describe('adjustStock', () => {
    it('adds stock and creates a RESTOCK movement record', async () => {
      mockProductFindUnique.mockResolvedValue(makeProduct({ stockLevel: 10 }));
      mockProductUpdate.mockResolvedValue(makeProduct({ stockLevel: 60 }));
      mockStockMovCreate.mockResolvedValue({});

      const result = await adjustStock('prod-1', 'tenant-1', { quantity: 50, reason: 'RESTOCK' });

      expect(result.stockLevel).toBe(60);
      expect(mockStockMovCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ productId: 'prod-1', quantity: 50, reason: 'RESTOCK' }),
        }),
      );
    });

    it('subtracts stock for a SALE movement', async () => {
      mockProductFindUnique.mockResolvedValue(makeProduct({ stockLevel: 20 }));
      mockProductUpdate.mockResolvedValue(makeProduct({ stockLevel: 15 }));
      mockStockMovCreate.mockResolvedValue({});

      const result = await adjustStock('prod-1', 'tenant-1', { quantity: -5, reason: 'SALE' });

      expect(result.stockLevel).toBe(15);
    });

    it('throws 400 when stock adjustment would result in negative stock', async () => {
      mockProductFindUnique.mockResolvedValue(makeProduct({ stockLevel: 2 }));

      await expect(adjustStock('prod-1', 'tenant-1', { quantity: -5, reason: 'SALE' })).rejects.toMatchObject({
        statusCode: 400,
        code: 'INSUFFICIENT_STOCK',
      });
    });

    it('throws 404 for unknown product', async () => {
      mockProductFindUnique.mockResolvedValue(null);

      await expect(adjustStock('bad-id', 'tenant-1', { quantity: 10, reason: 'RESTOCK' })).rejects.toMatchObject({
        statusCode: 404,
        code: 'PRODUCT_NOT_FOUND',
      });
    });

    it('throws 403 for wrong tenant', async () => {
      mockProductFindUnique.mockResolvedValue(makeProduct({ tenantId: 'other' }));

      await expect(adjustStock('prod-1', 'tenant-1', { quantity: 10, reason: 'RESTOCK' })).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('sets isLowStock flag when stock falls to threshold', async () => {
      // After adjustment: stockLevel = 3, threshold = 5 → low stock
      mockProductFindUnique.mockResolvedValue(makeProduct({ stockLevel: 5, lowStockThreshold: 5 }));
      mockProductUpdate.mockResolvedValue(makeProduct({ stockLevel: 3, lowStockThreshold: 5 }));
      mockStockMovCreate.mockResolvedValue({});

      const result = await adjustStock('prod-1', 'tenant-1', { quantity: -2, reason: 'SALE' });

      expect(result.isLowStock).toBe(true);
    });
  });
});
