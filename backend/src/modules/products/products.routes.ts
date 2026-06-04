/**
 * Products / Inventory router — Phase 4.3
 *
 * | Method | Path                        | Auth  | Description               |
 * |--------|-----------------------------|-------|---------------------------|
 * | GET    | /api/products               | ADMIN | List products (paginated) |
 * | GET    | /api/products/:id           | ADMIN | Get a product             |
 * | POST   | /api/products               | ADMIN | Create a product          |
 * | PATCH  | /api/products/:id           | ADMIN | Update a product          |
 * | DELETE | /api/products/:id           | ADMIN | Deactivate a product      |
 * | PATCH  | /api/products/:id/stock     | ADMIN | Stock adjustment          |
 *
 * Feature-gated by INVENTORY_ENABLED.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './products.controller';
import {
  listProductsSchema,
  getProductSchema,
  createProductSchema,
  updateProductSchema,
  deleteProductSchema,
  adjustStockSchema,
} from './products.schema';

const router = Router();

// Feature gate + auth — all routes require INVENTORY_ENABLED + ADMIN
router.use(requireFeature('INVENTORY_ENABLED'), requireAuth, requireRole('ADMIN'));

router.get(
  '/',
  validate(listProductsSchema),
  ctrl.listProducts,
);

router.get(
  '/:id',
  validate(getProductSchema),
  ctrl.getProductById,
);

router.post(
  '/',
  validate(createProductSchema),
  ctrl.createProduct,
);

router.patch(
  '/:id/stock',
  validate(adjustStockSchema),
  ctrl.adjustStock,
);

router.patch(
  '/:id',
  validate(updateProductSchema),
  ctrl.updateProduct,
);

router.delete(
  '/:id',
  validate(deleteProductSchema),
  ctrl.deleteProduct,
);

export { router as productsRoutes };
