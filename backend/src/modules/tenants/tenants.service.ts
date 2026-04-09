/**
 * Tenants service — Phase 0
 *
 * Business logic for the /api/tenants endpoints (SUPER_ADMIN only).
 *
 * Responsibilities:
 *  - createTenant  — provision a new business instance on the platform
 *  - listTenants   — paginated list of all tenants with optional filters
 *  - getTenantById — single tenant detail
 *  - updateTenant  — update name, businessType, plan, or active state
 *  - deleteTenant  — soft-delete (set isActive=false); data is preserved
 *
 * All functions assume the caller is SUPER_ADMIN (enforced at the route level).
 *
 * Total: 11 tests (see tenants.service.test.ts)
 */
import { Prisma } from '@prisma/client';

import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import type {
  CreateTenantBody,
  ListTenantsQuery,
  UpdateTenantBody,
} from './tenants.schema';

// ─── Prisma select shape ──────────────────────────────────────────────────────

const tenantSelect = {
  id:           true,
  slug:         true,
  name:         true,
  businessType: true,
  plan:         true,
  isActive:     true,
  createdAt:    true,
  updatedAt:    true,
} satisfies Prisma.TenantSelect;

type TenantResult = Prisma.TenantGetPayload<{ select: typeof tenantSelect }>;

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Provisions a new tenant on the platform.
 *
 * @throws AppError 409 — a tenant with the given slug already exists.
 */
export async function createTenant(body: CreateTenantBody): Promise<TenantResult> {
  const existing = await prisma.tenant.findUnique({ where: { slug: body.slug } });

  if (existing) {
    throw new AppError(409, 'CONFLICT', `A tenant with slug "${body.slug}" already exists`);
  }

  return prisma.tenant.create({
    data: {
      slug:         body.slug,
      name:         body.name,
      businessType: body.businessType ?? 'tattoo_studio',
      plan:         body.plan         ?? 'starter',
    },
    select: tenantSelect,
  });
}

/**
 * Returns a paginated list of all tenants.
 *
 * Supports optional filters:
 *  - isActive — "true" / "false" string converted to boolean
 *  - search   — case-insensitive match on name or slug
 */
export async function listTenants(
  query: ListTenantsQuery,
): Promise<PaginatedResult<TenantResult>> {
  const where: Prisma.TenantWhereInput = {};

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true';
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { slug: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return paginate(
    prisma.tenant,
    {
      where,
      select:  tenantSelect,
      orderBy: { createdAt: 'desc' },
    },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Returns a single tenant by its ID.
 *
 * @throws AppError 404 — tenant not found.
 */
export async function getTenantById(id: string): Promise<TenantResult> {
  const tenant = await prisma.tenant.findUnique({
    where:  { id },
    select: tenantSelect,
  });

  if (!tenant) {
    throw new AppError(404, 'NOT_FOUND', 'Tenant not found');
  }

  return tenant;
}

/**
 * Updates a tenant's display name, business type, plan, or active state.
 *
 * @throws AppError 404 — tenant not found.
 */
export async function updateTenant(
  id:   string,
  body: UpdateTenantBody,
): Promise<TenantResult> {
  const tenant = await prisma.tenant.findUnique({ where: { id } });

  if (!tenant) {
    throw new AppError(404, 'NOT_FOUND', 'Tenant not found');
  }

  const data: Prisma.TenantUpdateInput = {};
  if (body.name         !== undefined) data.name         = body.name;
  if (body.businessType !== undefined) data.businessType = body.businessType;
  if (body.plan         !== undefined) data.plan         = body.plan;
  if (body.isActive     !== undefined) data.isActive     = body.isActive;

  return prisma.tenant.update({
    where:  { id },
    data,
    select: tenantSelect,
  });
}

/**
 * Soft-deletes a tenant by setting isActive=false.
 * Data (users, bookings, leads) is preserved for audit purposes.
 *
 * @throws AppError 404 — tenant not found.
 * @throws AppError 409 — tenant is already deactivated.
 */
export async function deleteTenant(id: string): Promise<TenantResult> {
  const tenant = await prisma.tenant.findUnique({ where: { id } });

  if (!tenant) {
    throw new AppError(404, 'NOT_FOUND', 'Tenant not found');
  }

  if (!tenant.isActive) {
    throw new AppError(409, 'CONFLICT', 'Tenant is already deactivated');
  }

  return prisma.tenant.update({
    where:  { id },
    data:   { isActive: false },
    select: tenantSelect,
  });
}
