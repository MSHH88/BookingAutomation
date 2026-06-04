/**
 * Tenants router — Phase 0
 *
 * All endpoints require SUPER_ADMIN — the platform owner is the only user
 * who can provision, inspect, modify, or deactivate business instances.
 *
 * | Method | Path              | Auth        | Description                            |
 * |--------|-------------------|-------------|----------------------------------------|
 * | POST   | /api/tenants      | SUPER_ADMIN | Provision a new tenant                 |
 * | GET    | /api/tenants      | SUPER_ADMIN | List all tenants (paginated)           |
 * | GET    | /api/tenants/:id  | SUPER_ADMIN | Get a single tenant                    |
 * | PATCH  | /api/tenants/:id  | SUPER_ADMIN | Update tenant (name/type/plan/active)  |
 * | DELETE | /api/tenants/:id  | SUPER_ADMIN | Soft-delete (deactivate) a tenant      |
 */
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate }    from '../../middleware/validate';
import * as ctrl from './tenants.controller';
import {
  createTenantSchema,
  listTenantsSchema,
  getTenantSchema,
  updateTenantSchema,
  deleteTenantSchema,
} from './tenants.schema';

const router = Router();

// ── All /api/tenants routes: authentication + SUPER_ADMIN role ────────────────
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN'));

// ─── Create ───────────────────────────────────────────────────────────────────
router.post('/', validate(createTenantSchema), ctrl.createTenant);

// ─── List ─────────────────────────────────────────────────────────────────────
router.get('/', validate(listTenantsSchema), ctrl.listTenants);

// ─── Single (must come before /:id to avoid conflict with future nested routes)
router.get('/:id', validate(getTenantSchema), ctrl.getTenant);

// ─── Update ───────────────────────────────────────────────────────────────────
router.patch('/:id', validate(updateTenantSchema), ctrl.updateTenant);

// ─── Soft-delete ──────────────────────────────────────────────────────────────
router.delete('/:id', validate(deleteTenantSchema), ctrl.deleteTenant);

export { router as tenantRoutes };
