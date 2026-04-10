/**
 * Health Flags service — unit tests — Phase 3.1
 *
 * Tests:
 *  1. listHealthFlags — returns flags for a customer
 *  2. listHealthFlags — returns empty when no flags exist
 *  3. listHealthFlags — throws 404 for unknown customer
 *  4. listHealthFlags — throws 403 for wrong tenant
 *  5. createHealthFlag — creates a flag with defaults
 *  6. createHealthFlag — creates a flag with explicit severity and notes
 *  7. createHealthFlag — throws 404 for unknown customer
 *  8. createHealthFlag — throws 403 for wrong tenant
 *  9. deleteHealthFlag — deletes a flag and returns its id
 * 10. deleteHealthFlag — throws 404 for unknown flag
 * 11. deleteHealthFlag — throws 404 when flag belongs to different customer
 * 12. deleteHealthFlag — throws 403 for wrong tenant
 *
 * Total: 12 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    healthFlag: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      delete:     jest.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';
import { listHealthFlags, createHealthFlag, deleteHealthFlag } from './health-flags.service';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('health-flags.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── listHealthFlags ─────────────────────────────────────────────────────────

  describe('listHealthFlags', () => {
    it('should return flags for a customer', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', tenantId: 'tenant-1',
      });
      const mockFlags = [
        { id: 'hf-1', customerId: 'cust-1', tenantId: 'tenant-1', type: 'LATEX_ALLERGY', severity: 'HIGH', notes: null, createdAt: new Date() },
        { id: 'hf-2', customerId: 'cust-1', tenantId: 'tenant-1', type: 'PREGNANCY', severity: 'MEDIUM', notes: 'First trimester', createdAt: new Date() },
      ];
      (prisma.healthFlag.findMany as jest.Mock).mockResolvedValue(mockFlags);

      const result = await listHealthFlags('cust-1', 'tenant-1');

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('LATEX_ALLERGY');
      expect(prisma.healthFlag.findMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1', tenantId: 'tenant-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no flags exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', tenantId: 'tenant-1',
      });
      (prisma.healthFlag.findMany as jest.Mock).mockResolvedValue([]);

      const result = await listHealthFlags('cust-1', 'tenant-1');

      expect(result).toEqual([]);
    });

    it('should throw 404 for unknown customer', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(listHealthFlags('bad-id', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'CUSTOMER_NOT_FOUND',
      });
    });

    it('should throw 403 for wrong tenant', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', tenantId: 'tenant-other',
      });

      await expect(listHealthFlags('cust-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  // ── createHealthFlag ────────────────────────────────────────────────────────

  describe('createHealthFlag', () => {
    it('should create a flag with defaults', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', tenantId: 'tenant-1',
      });
      const created = {
        id: 'hf-new', customerId: 'cust-1', tenantId: 'tenant-1',
        type: 'BLOOD_THINNERS', severity: 'MEDIUM', notes: null,
        createdAt: new Date(), updatedAt: new Date(),
      };
      (prisma.healthFlag.create as jest.Mock).mockResolvedValue(created);

      const result = await createHealthFlag('cust-1', 'tenant-1', {
        type: 'BLOOD_THINNERS',
      });

      expect(result.type).toBe('BLOOD_THINNERS');
      expect(result.severity).toBe('MEDIUM');
      expect(prisma.healthFlag.create).toHaveBeenCalledWith({
        data: {
          customerId: 'cust-1',
          tenantId: 'tenant-1',
          type: 'BLOOD_THINNERS',
          notes: null,
          severity: 'MEDIUM',
        },
      });
    });

    it('should create a flag with explicit severity and notes', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', tenantId: 'tenant-1',
      });
      const created = {
        id: 'hf-new', customerId: 'cust-1', tenantId: 'tenant-1',
        type: 'SKIN_CONDITION', severity: 'HIGH', notes: 'Eczema on forearm',
        createdAt: new Date(), updatedAt: new Date(),
      };
      (prisma.healthFlag.create as jest.Mock).mockResolvedValue(created);

      const result = await createHealthFlag('cust-1', 'tenant-1', {
        type: 'SKIN_CONDITION',
        severity: 'HIGH',
        notes: 'Eczema on forearm',
      });

      expect(result.severity).toBe('HIGH');
      expect(result.notes).toBe('Eczema on forearm');
      expect(prisma.healthFlag.create).toHaveBeenCalledWith({
        data: {
          customerId: 'cust-1',
          tenantId: 'tenant-1',
          type: 'SKIN_CONDITION',
          notes: 'Eczema on forearm',
          severity: 'HIGH',
        },
      });
    });

    it('should throw 404 for unknown customer', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        createHealthFlag('bad-id', 'tenant-1', { type: 'LATEX_ALLERGY' }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'CUSTOMER_NOT_FOUND',
      });
    });

    it('should throw 403 for wrong tenant', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', tenantId: 'tenant-other',
      });

      await expect(
        createHealthFlag('cust-1', 'tenant-1', { type: 'EPILEPSY' }),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  // ── deleteHealthFlag ────────────────────────────────────────────────────────

  describe('deleteHealthFlag', () => {
    it('should delete a flag and return its id', async () => {
      (prisma.healthFlag.findUnique as jest.Mock).mockResolvedValue({
        id: 'hf-1', customerId: 'cust-1', tenantId: 'tenant-1',
      });
      (prisma.healthFlag.delete as jest.Mock).mockResolvedValue({ id: 'hf-1' });

      const result = await deleteHealthFlag('cust-1', 'hf-1', 'tenant-1');

      expect(result).toEqual({ id: 'hf-1' });
      expect(prisma.healthFlag.delete).toHaveBeenCalledWith({ where: { id: 'hf-1' } });
    });

    it('should throw 404 for unknown flag', async () => {
      (prisma.healthFlag.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        deleteHealthFlag('cust-1', 'bad-id', 'tenant-1'),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'HEALTH_FLAG_NOT_FOUND',
      });
    });

    it('should throw 404 when flag belongs to different customer', async () => {
      (prisma.healthFlag.findUnique as jest.Mock).mockResolvedValue({
        id: 'hf-1', customerId: 'cust-other', tenantId: 'tenant-1',
      });

      await expect(
        deleteHealthFlag('cust-1', 'hf-1', 'tenant-1'),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'HEALTH_FLAG_NOT_FOUND',
      });
    });

    it('should throw 403 for wrong tenant', async () => {
      (prisma.healthFlag.findUnique as jest.Mock).mockResolvedValue({
        id: 'hf-1', customerId: 'cust-1', tenantId: 'tenant-other',
      });

      await expect(
        deleteHealthFlag('cust-1', 'hf-1', 'tenant-1'),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });
});
