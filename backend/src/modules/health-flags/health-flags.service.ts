/**
 * Health Flags service — Phase 3.1
 *
 * Manages customer health flags (allergies, medical conditions, sensitivities)
 * that artists and admins need to be aware of before performing services.
 *
 * ─── What this module does ───────────────────────────────────────────────────
 *
 *   listHealthFlags(customerId, tenantId)
 *     Returns all health flags for a customer.
 *     Verifies the customer exists and belongs to the tenant.
 *
 *   createHealthFlag(customerId, tenantId, data)
 *     Creates a new health flag for a customer.
 *     Verifies the customer exists and belongs to the tenant.
 *
 *   deleteHealthFlag(customerId, flagId, tenantId)
 *     Deletes a health flag by ID.
 *     Verifies ownership and tenant access.
 */
import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import type { CreateHealthFlagBody } from './health-flags.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyCustomerAccess(customerId: string, tenantId: string) {
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: { id: true, tenantId: true },
  });

  if (!customer) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  if (customer.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this customer');
  }

  return customer;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/health-flags/:customerId
 * Returns all health flags for a customer.
 */
export async function listHealthFlags(customerId: string, tenantId: string) {
  await verifyCustomerAccess(customerId, tenantId);

  return prisma.healthFlag.findMany({
    where: { customerId, tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * POST /api/health-flags/:customerId
 * Creates a new health flag for a customer.
 */
export async function createHealthFlag(
  customerId: string,
  tenantId: string,
  data: CreateHealthFlagBody,
) {
  await verifyCustomerAccess(customerId, tenantId);

  return prisma.healthFlag.create({
    data: {
      customerId,
      tenantId,
      type:     data.type,
      notes:    data.notes ?? null,
      severity: data.severity ?? 'MEDIUM',
    },
  });
}

/**
 * DELETE /api/health-flags/:customerId/:flagId
 * Deletes a health flag by ID.
 */
export async function deleteHealthFlag(
  customerId: string,
  flagId: string,
  tenantId: string,
) {
  const flag = await prisma.healthFlag.findUnique({
    where: { id: flagId },
    select: { id: true, customerId: true, tenantId: true },
  });

  if (!flag) {
    throw new AppError(404, 'HEALTH_FLAG_NOT_FOUND', 'Health flag not found');
  }

  if (flag.customerId !== customerId) {
    throw new AppError(404, 'HEALTH_FLAG_NOT_FOUND', 'Health flag not found');
  }

  if (flag.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this health flag');
  }

  await prisma.healthFlag.delete({ where: { id: flagId } });

  return { id: flagId };
}
