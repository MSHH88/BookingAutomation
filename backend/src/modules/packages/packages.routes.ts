/**
 * Packages router — Phase 5.1
 *
 * | Method | Path                                    | Auth      | Description                         |
 * |--------|-----------------------------------------|-----------|-------------------------------------|
 * | GET    | /api/packages                           | ADMIN     | List all packages                   |
 * | POST   | /api/packages                           | ADMIN     | Create a new package                |
 * | GET    | /api/packages/:id                       | ADMIN     | Get a single package                |
 * | PUT    | /api/packages/:id                       | ADMIN     | Update a package                    |
 * | DELETE | /api/packages/:id                       | ADMIN     | Soft-delete a package               |
 * | POST   | /api/packages/:id/purchase              | ADMIN     | Record customer purchase            |
 * | GET    | /api/customers/:customerId/packages     | ADMIN     | List a customer's packages          |
 * | GET    | /api/me/packages                        | CUSTOMER  | List own packages (portal)          |
 *
 * Feature-gated by PACKAGES_ENABLED.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './packages.controller';
import {
  createPackageSchema,
  updatePackageSchema,
  listPackagesSchema,
  packageIdParamSchema,
  purchasePackageSchema,
  listCustomerPackagesSchema,
} from './packages.schema';

const router = Router();

// All package routes require auth + PACKAGES_ENABLED
router.use(requireAuth, requireFeature('PACKAGES_ENABLED'));

// ── Admin package management ───────────────────────────────────────────────────

router.get(
  '/',
  requireRole('ADMIN'),
  validate(listPackagesSchema),
  ctrl.listPackages,
);

router.post(
  '/',
  requireRole('ADMIN'),
  validate(createPackageSchema),
  ctrl.createPackage,
);

router.get(
  '/:id',
  requireRole('ADMIN'),
  validate(packageIdParamSchema),
  ctrl.getPackageById,
);

router.put(
  '/:id',
  requireRole('ADMIN'),
  validate(updatePackageSchema),
  ctrl.updatePackage,
);

router.delete(
  '/:id',
  requireRole('ADMIN'),
  validate(packageIdParamSchema),
  ctrl.deletePackage,
);

router.post(
  '/:id/purchase',
  requireRole('ADMIN'),
  validate(purchasePackageSchema),
  ctrl.purchasePackage,
);

export { router as packagesRoutes };

// ── Customer-scoped routes (mounted separately on /api/customers + /api/me) ───

const customerPackagesRouter = Router({ mergeParams: true });

customerPackagesRouter.use(requireAuth, requireFeature('PACKAGES_ENABLED'));

customerPackagesRouter.get(
  '/',
  requireRole('ADMIN'),
  validate(listCustomerPackagesSchema),
  ctrl.listCustomerPackages,
);

export { customerPackagesRouter as customerPackagesRoutes };

// ── /api/me/packages ──────────────────────────────────────────────────────────

const myPackagesRouter = Router();

myPackagesRouter.use(requireAuth, requireFeature('PACKAGES_ENABLED'));

myPackagesRouter.get(
  '/',
  ctrl.getMyPackages,
);

export { myPackagesRouter as myPackagesRoutes };
