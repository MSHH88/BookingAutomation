/**
 * Rota service — unit tests — Phase 6.1
 *
 * Tests:
 *  1.  listShifts — returns shifts for tenant
 *  2.  listShifts — filters by artistId when provided
 *  3.  createShift — creates shift for valid artist in same tenant
 *  4.  createShift — throws 404 when artist not found
 *  5.  createShift — throws 403 when artist belongs to different tenant
 *  6.  getShift — returns shift with overrides
 *  7.  getShift — throws 404 when shift not found
 *  8.  getShift — throws 404 when tenant mismatch
 *  9.  updateShift — updates specified fields
 *  10. updateShift — throws 404 when shift not found
 *  11. deleteShift — deletes shift
 *  12. deleteShift — throws 404 when shift not found
 *  13. createOverride — creates override for valid shift
 *  14. createOverride — throws 404 when shift not found
 *
 * Total: 14 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    shift: {
      findMany:  jest.fn(),
      findUnique: jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
      delete:    jest.fn(),
    },
    shiftOverride: {
      upsert: jest.fn(),
    },
    artist: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';
import {
  listShifts,
  createShift,
  getShift,
  updateShift,
  deleteShift,
  createOverride,
} from './rota.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeShift(overrides: Record<string, unknown> = {}) {
  return {
    id:             'shift-1',
    tenantId:       'tenant-1',
    artistId:       'artist-1',
    dayOfWeek:      1,
    startTime:      '09:00',
    endTime:        '17:00',
    isRecurring:    true,
    effectiveFrom:  new Date('2024-01-01'),
    effectiveUntil: null,
    createdAt:      new Date('2024-01-01'),
    updatedAt:      new Date('2024-01-01'),
    overrides:      [],
    artist: {
      id:   'artist-1',
      slug: 'artist-one',
      user: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
    },
    ...overrides,
  };
}

function makeArtist(overrides: Record<string, unknown> = {}) {
  return {
    id:       'artist-1',
    tenantId: 'tenant-1',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('rota.service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // ── listShifts ─────────────────────────────────────────────────────────────

  describe('listShifts', () => {
    it('returns shifts for tenant', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([makeShift()]);

      const result = await listShifts('tenant-1');
      expect(result).toHaveLength(1);
      expect(prisma.shift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1' }) }),
      );
    });

    it('filters by artistId when provided', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([]);

      await listShifts('tenant-1', 'artist-99');
      expect(prisma.shift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1', artistId: 'artist-99' }),
        }),
      );
    });
  });

  // ── createShift ────────────────────────────────────────────────────────────

  describe('createShift', () => {
    const body = {
      artistId:      'artist-1',
      dayOfWeek:     1,
      startTime:     '09:00',
      endTime:       '17:00',
      isRecurring:   true,
      effectiveFrom: '2024-01-01T00:00:00.000Z',
    };

    it('creates shift for valid artist in same tenant', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue(makeArtist());
      (prisma.shift.create as jest.Mock).mockResolvedValue(makeShift());

      const result = await createShift('tenant-1', body);
      expect(result.id).toBe('shift-1');
      expect(prisma.shift.create).toHaveBeenCalled();
    });

    it('throws 404 when artist not found', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(createShift('tenant-1', body)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('throws 403 when artist belongs to different tenant', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue(
        makeArtist({ tenantId: 'other-tenant' }),
      );

      await expect(createShift('tenant-1', body)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  // ── getShift ───────────────────────────────────────────────────────────────

  describe('getShift', () => {
    it('returns shift with overrides', async () => {
      (prisma.shift.findUnique as jest.Mock).mockResolvedValue(makeShift());

      const result = await getShift('shift-1', 'tenant-1');
      expect(result.id).toBe('shift-1');
    });

    it('throws 404 when shift not found', async () => {
      (prisma.shift.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getShift('missing', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('throws 404 when tenant mismatch', async () => {
      (prisma.shift.findUnique as jest.Mock).mockResolvedValue(
        makeShift({ tenantId: 'other-tenant' }),
      );

      await expect(getShift('shift-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── updateShift ────────────────────────────────────────────────────────────

  describe('updateShift', () => {
    it('updates specified fields', async () => {
      (prisma.shift.findUnique as jest.Mock).mockResolvedValue(
        makeShift({ tenantId: 'tenant-1', startTime: '09:00', endTime: '17:00' }),
      );
      (prisma.shift.update as jest.Mock).mockResolvedValue(
        makeShift({ endTime: '18:00' }),
      );

      const result = await updateShift('shift-1', 'tenant-1', { endTime: '18:00' });
      expect(result.endTime).toBe('18:00');
    });

    it('throws 404 when shift not found', async () => {
      (prisma.shift.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        updateShift('missing', 'tenant-1', { dayOfWeek: 2 }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── deleteShift ────────────────────────────────────────────────────────────

  describe('deleteShift', () => {
    it('deletes shift', async () => {
      (prisma.shift.findUnique as jest.Mock).mockResolvedValue(makeShift());
      (prisma.shift.delete as jest.Mock).mockResolvedValue(undefined);

      await expect(deleteShift('shift-1', 'tenant-1')).resolves.toBeUndefined();
      expect(prisma.shift.delete).toHaveBeenCalledWith({ where: { id: 'shift-1' } });
    });

    it('throws 404 when shift not found', async () => {
      (prisma.shift.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteShift('missing', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── createOverride ─────────────────────────────────────────────────────────

  describe('createOverride', () => {
    const body = { date: '2024-01-08', isOff: true };

    it('creates override for valid shift', async () => {
      (prisma.shift.findUnique as jest.Mock).mockResolvedValue(makeShift());
      (prisma.shiftOverride.upsert as jest.Mock).mockResolvedValue({
        id:        'override-1',
        shiftId:   'shift-1',
        date:      new Date('2024-01-08'),
        startTime: null,
        endTime:   null,
        isOff:     true,
        createdAt: new Date(),
      });

      const result = await createOverride('shift-1', 'tenant-1', body);
      expect(result.isOff).toBe(true);
    });

    it('throws 404 when shift not found', async () => {
      (prisma.shift.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        createOverride('missing', 'tenant-1', body),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
