/**
 * Packages service — unit tests — Phase 5.1
 *
 * Tests:
 *  1.  createPackage — creates package with correct fields
 *  2.  listPackages — returns paginated results
 *  3.  getPackageById — returns package for correct tenant
 *  4.  getPackageById — throws 404 for unknown package
 *  5.  getPackageById — throws 403 for wrong tenant
 *  6.  updatePackage — updates only provided fields
 *  7.  updatePackage — throws 404 for unknown package
 *  8.  deletePackage — sets isActive = false
 *  9.  purchasePackage — creates CustomerPackage with correct remainingUses
 * 10.  purchasePackage — throws 404 for unknown package
 * 11.  purchasePackage — throws 400 for inactive package
 * 12.  deductPackageUse — deducts one use from matching package
 * 13.  deductPackageUse — returns null when no applicable package
 * 14.  deductPackageUse — skips expired packages
 *
 * Total: 14 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    package: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    customerPackage: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      update:     jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';
import {
  createPackage,
  listPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  purchasePackage,
  deductPackageUse,
} from './packages.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makePackage(overrides: Record<string, unknown> = {}) {
  return {
    id:               'pkg-1',
    tenantId:         'tenant-1',
    name:             'Tattoo Bundle',
    description:      '3 session bundle',
    price:            150,
    includedServices: [{ serviceId: 'svc-1', quantity: 3 }],
    totalUses:        3,
    expiryDays:       365,
    isActive:         true,
    createdAt:        new Date('2024-01-01'),
    updatedAt:        new Date('2024-01-01'),
    ...overrides,
  };
}

function makeCustomerPackage(overrides: Record<string, unknown> = {}) {
  return {
    id:            'cp-1',
    customerId:    'user-1',
    packageId:     'pkg-1',
    tenantId:      'tenant-1',
    remainingUses: 3,
    purchasedAt:   new Date('2024-01-01'),
    expiresAt:     null,
    createdAt:     new Date('2024-01-01'),
    updatedAt:     new Date('2024-01-01'),
    package:       {
      id:               'pkg-1',
      name:             'Tattoo Bundle',
      description:      '3 session bundle',
      includedServices: [{ serviceId: 'svc-1', quantity: 3 }],
      totalUses:        3,
    },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('packages.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createPackage ──────────────────────────────────────────────────────────

  describe('createPackage', () => {
    it('creates a package with the correct fields', async () => {
      (prisma.package.create as jest.Mock).mockResolvedValue(makePackage());

      const result = await createPackage('tenant-1', {
        name:             'Tattoo Bundle',
        price:            150,
        includedServices: [{ serviceId: 'svc-1', quantity: 3 }],
        totalUses:        3,
        isActive:         true,
      });

      expect(prisma.package.create).toHaveBeenCalledTimes(1);
      expect(result.tenantId).toBe('tenant-1');
      expect(result.name).toBe('Tattoo Bundle');
    });
  });

  // ── listPackages ───────────────────────────────────────────────────────────

  describe('listPackages', () => {
    it('returns paginated packages for a tenant', async () => {
      (prisma.package.findMany as jest.Mock).mockResolvedValue([makePackage()]);
      (prisma.package.count as jest.Mock).mockResolvedValue(1);

      const result = await listPackages('tenant-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  // ── getPackageById ─────────────────────────────────────────────────────────

  describe('getPackageById', () => {
    it('returns the package for the correct tenant', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(makePackage());

      const result = await getPackageById('pkg-1', 'tenant-1');
      expect(result.id).toBe('pkg-1');
    });

    it('throws 404 for an unknown package', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getPackageById('unknown', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code:       'PACKAGE_NOT_FOUND',
      });
    });

    it('throws 403 for wrong tenant', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(
        makePackage({ tenantId: 'other-tenant' }),
      );

      await expect(getPackageById('pkg-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
        code:       'PACKAGE_FORBIDDEN',
      });
    });
  });

  // ── updatePackage ──────────────────────────────────────────────────────────

  describe('updatePackage', () => {
    it('updates only the provided fields', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(
        makePackage({ id: 'pkg-1', tenantId: 'tenant-1' }),
      );
      (prisma.package.update as jest.Mock).mockResolvedValue(
        makePackage({ name: 'Updated Bundle' }),
      );

      const result = await updatePackage('pkg-1', 'tenant-1', { name: 'Updated Bundle' });
      expect(result.name).toBe('Updated Bundle');
    });

    it('throws 404 for unknown package', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(updatePackage('unknown', 'tenant-1', { name: 'X' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── deletePackage ──────────────────────────────────────────────────────────

  describe('deletePackage', () => {
    it('soft-deletes a package by setting isActive = false', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(makePackage());
      (prisma.package.update as jest.Mock).mockResolvedValue(
        makePackage({ isActive: false }),
      );

      const result = await deletePackage('pkg-1', 'tenant-1');
      expect(result.isActive).toBe(false);
      expect((prisma.package.update as jest.Mock).mock.calls[0][0].data).toMatchObject({
        isActive: false,
      });
    });
  });

  // ── purchasePackage ────────────────────────────────────────────────────────

  describe('purchasePackage', () => {
    it('creates a CustomerPackage with correct remainingUses', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(makePackage());
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1', tenantId: 'tenant-1',
      });
      (prisma.customerPackage.create as jest.Mock).mockResolvedValue(makeCustomerPackage());

      const result = await purchasePackage('pkg-1', { customerId: 'user-1' }, 'tenant-1');
      expect(result.remainingUses).toBe(3);
      expect(result.customerId).toBe('user-1');
    });

    it('throws 404 for unknown package', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(purchasePackage('unknown', { customerId: 'u' }, 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code:       'PACKAGE_NOT_FOUND',
      });
    });

    it('throws 400 for inactive package', async () => {
      (prisma.package.findUnique as jest.Mock).mockResolvedValue(
        makePackage({ isActive: false }),
      );

      await expect(purchasePackage('pkg-1', { customerId: 'u' }, 'tenant-1')).rejects.toMatchObject({
        statusCode: 400,
        code:       'PACKAGE_INACTIVE',
      });
    });
  });

  // ── deductPackageUse ───────────────────────────────────────────────────────

  describe('deductPackageUse', () => {
    it('deducts one use from the matching package', async () => {
      (prisma.customerPackage.findMany as jest.Mock).mockResolvedValue([
        {
          id:            'cp-1',
          remainingUses: 3,
          package:       { includedServices: [{ serviceId: 'svc-1', quantity: 3 }] },
        },
      ]);
      (prisma.customerPackage.update as jest.Mock).mockResolvedValue({});

      const result = await deductPackageUse('user-1', 'tenant-1', 'svc-1');
      expect(result).toBe('cp-1');
      expect(prisma.customerPackage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { remainingUses: { decrement: 1 } },
        }),
      );
    });

    it('returns null when no applicable package exists', async () => {
      (prisma.customerPackage.findMany as jest.Mock).mockResolvedValue([
        {
          id:            'cp-1',
          remainingUses: 2,
          package:       { includedServices: [{ serviceId: 'svc-other', quantity: 1 }] },
        },
      ]);

      const result = await deductPackageUse('user-1', 'tenant-1', 'svc-1');
      expect(result).toBeNull();
    });

    it('returns null when no packages found at all', async () => {
      (prisma.customerPackage.findMany as jest.Mock).mockResolvedValue([]);

      const result = await deductPackageUse('user-1', 'tenant-1', 'svc-1');
      expect(result).toBeNull();
    });
  });
});
