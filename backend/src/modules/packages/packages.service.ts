/**
 * Packages service — Phase 5.1
 *
 * Business logic for service packages / bundles.
 *
 * ── What this module does ──────────────────────────────────────────────────
 *
 *  createPackage(tenantId, body)
 *    Creates a new package template that the studio offers for sale.
 *
 *  listPackages(tenantId, query)
 *    Paginated list of packages for a tenant with optional isActive filter.
 *
 *  getPackageById(id, tenantId)
 *    Fetches a single package by ID, scoped to tenant.
 *
 *  updatePackage(id, tenantId, body)
 *    Updates an existing package definition.
 *
 *  deletePackage(id, tenantId)
 *    Soft-deletes a package (sets isActive = false).
 *
 *  purchasePackage(packageId, customerId, tenantId)
 *    Creates a CustomerPackage record (purchase). Does not charge via Stripe
 *    in isolation — charge is handled by the payments flow before calling this.
 *
 *  listCustomerPackages(customerId, tenantId, query)
 *    Paginated list of packages owned by a specific customer.
 *
 *  getMyPackages(customerId, tenantId, query)
 *    Same as listCustomerPackages but scoped to the authenticated customer.
 *
 *  deductPackageUse(customerId, tenantId, serviceId)
 *    Called from bookings.service when a booking is created. Finds the first
 *    non-expired CustomerPackage that includes the requested service and
 *    decrements remainingUses. Returns the ID of the CustomerPackage used, or
 *    null if no applicable package was found.
 */
import { Prisma } from '@prisma/client';

import { prisma }                    from '../../lib/prisma';
import { AppError }                  from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import { logger }                    from '../../utils/logger';
import type {
  CreatePackageBody,
  UpdatePackageBody,
  ListPackagesQuery,
  PurchasePackageBody,
  ListCustomerPackagesQuery,
} from './packages.schema';

// ─── Prisma select shapes ─────────────────────────────────────────────────────

const packageSelect = {
  id:               true,
  tenantId:         true,
  name:             true,
  description:      true,
  price:            true,
  includedServices: true,
  totalUses:        true,
  expiryDays:       true,
  isActive:         true,
  createdAt:        true,
  updatedAt:        true,
} satisfies Prisma.PackageSelect;

const customerPackageSelect = {
  id:            true,
  customerId:    true,
  packageId:     true,
  tenantId:      true,
  remainingUses: true,
  purchasedAt:   true,
  expiresAt:     true,
  createdAt:     true,
  updatedAt:     true,
  package: {
    select: {
      id:               true,
      name:             true,
      description:      true,
      includedServices: true,
      totalUses:        true,
    },
  },
} satisfies Prisma.CustomerPackageSelect;

// ─── Inferred return types ────────────────────────────────────────────────────

export type PackageDetail         = Prisma.PackageGetPayload<{ select: typeof packageSelect }>;
export type CustomerPackageDetail = Prisma.CustomerPackageGetPayload<{ select: typeof customerPackageSelect }>;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a new package template for the tenant.
 */
export async function createPackage(
  tenantId: string | null,
  body:     CreatePackageBody,
): Promise<PackageDetail> {
  const pkg = await prisma.package.create({
    data: {
      tenantId,
      name:             body.name,
      description:      body.description ?? null,
      price:            body.price,
      includedServices: body.includedServices as unknown as Prisma.InputJsonValue,
      totalUses:        body.totalUses,
      expiryDays:       body.expiryDays ?? null,
      isActive:         body.isActive,
    },
    select: packageSelect,
  });

  logger.info('Package created', { packageId: pkg.id, tenantId });
  return pkg;
}

/**
 * Paginated list of packages for a tenant.
 */
export async function listPackages(
  tenantId: string | null,
  query:    ListPackagesQuery,
): Promise<PaginatedResult<PackageDetail>> {
  const where: Prisma.PackageWhereInput = { tenantId };

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true';
  }

  return paginate<PackageDetail>(
    prisma.package,
    { where, select: packageSelect, orderBy: { createdAt: 'desc' } },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Get a single package by ID, scoped to tenant.
 */
export async function getPackageById(
  id:       string,
  tenantId: string | null,
): Promise<PackageDetail> {
  const pkg = await prisma.package.findUnique({
    where:  { id },
    select: packageSelect,
  });

  if (!pkg) {
    throw new AppError(404, 'PACKAGE_NOT_FOUND', `Package '${id}' not found`);
  }

  if (pkg.tenantId !== tenantId) {
    throw new AppError(403, 'PACKAGE_FORBIDDEN', 'Package does not belong to your tenant');
  }

  return pkg;
}

/**
 * Update a package definition.
 */
export async function updatePackage(
  id:       string,
  tenantId: string | null,
  body:     UpdatePackageBody,
): Promise<PackageDetail> {
  const existing = await prisma.package.findUnique({
    where:  { id },
    select: { id: true, tenantId: true },
  });

  if (!existing) {
    throw new AppError(404, 'PACKAGE_NOT_FOUND', `Package '${id}' not found`);
  }

  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'PACKAGE_FORBIDDEN', 'Package does not belong to your tenant');
  }

  const updated = await prisma.package.update({
    where: { id },
    data:  {
      ...(body.name             !== undefined && { name:             body.name }),
      ...(body.description      !== undefined && { description:      body.description }),
      ...(body.price            !== undefined && { price:            body.price }),
      ...(body.includedServices !== undefined && { includedServices: body.includedServices as unknown as Prisma.InputJsonValue }),
      ...(body.totalUses        !== undefined && { totalUses:        body.totalUses }),
      ...(body.expiryDays       !== undefined && { expiryDays:       body.expiryDays }),
      ...(body.isActive         !== undefined && { isActive:         body.isActive }),
    },
    select: packageSelect,
  });

  logger.info('Package updated', { packageId: id, tenantId });
  return updated;
}

/**
 * Soft-delete a package (sets isActive = false).
 */
export async function deletePackage(
  id:       string,
  tenantId: string | null,
): Promise<PackageDetail> {
  const existing = await prisma.package.findUnique({
    where:  { id },
    select: { id: true, tenantId: true },
  });

  if (!existing) {
    throw new AppError(404, 'PACKAGE_NOT_FOUND', `Package '${id}' not found`);
  }

  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'PACKAGE_FORBIDDEN', 'Package does not belong to your tenant');
  }

  const deleted = await prisma.package.update({
    where:  { id },
    data:   { isActive: false },
    select: packageSelect,
  });

  logger.info('Package soft-deleted', { packageId: id, tenantId });
  return deleted;
}

/**
 * Record a package purchase for a customer.
 * Call this after successful Stripe payment.
 */
export async function purchasePackage(
  packageId:  string,
  body:       PurchasePackageBody,
  tenantId:   string | null,
): Promise<CustomerPackageDetail> {
  const pkg = await prisma.package.findUnique({
    where:  { id: packageId },
    select: { id: true, tenantId: true, isActive: true, totalUses: true, expiryDays: true },
  });

  if (!pkg) {
    throw new AppError(404, 'PACKAGE_NOT_FOUND', `Package '${packageId}' not found`);
  }

  if (pkg.tenantId !== tenantId) {
    throw new AppError(403, 'PACKAGE_FORBIDDEN', 'Package does not belong to your tenant');
  }

  if (!pkg.isActive) {
    throw new AppError(400, 'PACKAGE_INACTIVE', 'This package is no longer available for purchase');
  }

  // Verify customer belongs to this tenant
  const customer = await prisma.user.findUnique({
    where:  { id: body.customerId },
    select: { id: true, tenantId: true },
  });

  if (!customer) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer '${body.customerId}' not found`);
  }

  if (customer.tenantId !== tenantId) {
    throw new AppError(403, 'CUSTOMER_FORBIDDEN', 'Customer does not belong to your tenant');
  }

  const expiresAt = pkg.expiryDays
    ? new Date(Date.now() + pkg.expiryDays * 24 * 60 * 60 * 1000)
    : null;

  const customerPackage = await prisma.customerPackage.create({
    data: {
      customerId:    body.customerId,
      packageId,
      tenantId,
      remainingUses: pkg.totalUses,
      expiresAt,
    },
    select: customerPackageSelect,
  });

  logger.info('Package purchased', {
    customerPackageId: customerPackage.id,
    customerId:        body.customerId,
    packageId,
    tenantId,
  });

  return customerPackage;
}

/**
 * Paginated list of CustomerPackages for a specific customer (ADMIN view).
 */
export async function listCustomerPackages(
  customerId: string,
  tenantId:   string | null,
  query:      ListCustomerPackagesQuery,
): Promise<PaginatedResult<CustomerPackageDetail>> {
  const where: Prisma.CustomerPackageWhereInput = { customerId, tenantId };

  return paginate<CustomerPackageDetail>(
    prisma.customerPackage,
    { where, select: customerPackageSelect, orderBy: { purchasedAt: 'desc' } },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Paginated list of CustomerPackages for the authenticated customer (portal view).
 */
export async function getMyPackages(
  customerId: string,
  tenantId:   string | null,
  query:      ListCustomerPackagesQuery,
): Promise<PaginatedResult<CustomerPackageDetail>> {
  return listCustomerPackages(customerId, tenantId, query);
}

/**
 * Deducts one use from the first non-expired CustomerPackage that covers a
 * given service for a customer.
 *
 * Returns the CustomerPackage ID used, or null if no applicable package exists.
 * Call this inside a booking creation transaction.
 */
export async function deductPackageUse(
  customerId: string,
  tenantId:   string,
  serviceId:  string,
): Promise<string | null> {
  const now = new Date();

  // Find eligible packages (remainingUses > 0, not expired)
  const customerPackages = await prisma.customerPackage.findMany({
    where: {
      customerId,
      tenantId,
      remainingUses: { gt: 0 },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    select: {
      id:            true,
      remainingUses: true,
      package:       { select: { includedServices: true } },
    },
    orderBy: { purchasedAt: 'asc' }, // FIFO — use oldest package first
  });

  for (const cp of customerPackages) {
    const services = cp.package.includedServices as Array<{ serviceId: string; quantity: number }>;
    const covers   = services.some((s) => s.serviceId === serviceId);

    if (covers) {
      await prisma.customerPackage.update({
        where: { id: cp.id },
        data:  { remainingUses: { decrement: 1 } },
      });

      logger.info('Package use deducted', {
        customerPackageId: cp.id,
        customerId,
        serviceId,
        remainingAfter: cp.remainingUses - 1,
      });

      return cp.id;
    }
  }

  return null; // no applicable package found
}
