/**
 * Payroll service — unit tests — Phase 4.6
 */

const mockArtistFindUnique       = jest.fn();
const mockArtistFindMany         = jest.fn();
const mockBookingFindMany        = jest.fn();
const mockPaymentFindMany        = jest.fn();
const mockStockMovFindMany       = jest.fn();
const mockPayrollReportCreate    = jest.fn();
const mockPayrollReportFindMany  = jest.fn();
const mockPayrollReportFindUnique = jest.fn();
const mockPayrollReportCount     = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    artist: {
      findUnique: (...a: unknown[]) => mockArtistFindUnique(...a),
      findMany:   (...a: unknown[]) => mockArtistFindMany(...a),
    },
    booking: {
      findMany: (...a: unknown[]) => mockBookingFindMany(...a),
    },
    payment: {
      findMany: (...a: unknown[]) => mockPaymentFindMany(...a),
    },
    stockMovement: {
      findMany: (...a: unknown[]) => mockStockMovFindMany(...a),
    },
    payrollReport: {
      create:     (...a: unknown[]) => mockPayrollReportCreate(...a),
      findMany:   (...a: unknown[]) => mockPayrollReportFindMany(...a),
      findUnique: (...a: unknown[]) => mockPayrollReportFindUnique(...a),
      count:      (...a: unknown[]) => mockPayrollReportCount(...a),
    },
  },
}));

import {
  generatePayroll,
  listReports,
  getReport,
  getMyEarnings,
} from './payroll.service';

function makeArtist(overrides: Record<string, unknown> = {}) {
  return {
    id:                   'artist-1',
    tenantId:             'tenant-1',
    basePay:              100,
    serviceCommissionPct: 10,
    productCommissionPct: 5,
    ...overrides,
  };
}

function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    id:                'report-1',
    tenantId:          'tenant-1',
    artistId:          'artist-1',
    periodStart:       new Date('2024-06-01'),
    periodEnd:         new Date('2024-06-30'),
    basePay:           100,
    serviceCommission: 50,
    productCommission: 10,
    totalTips:         20,
    totalPay:          160,
    generatedAt:       new Date(),
    ...overrides,
  };
}

describe('payroll.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockArtistFindUnique.mockResolvedValue(makeArtist());
    mockBookingFindMany.mockResolvedValue([{ id: 'book-1' }]);
    mockPaymentFindMany.mockResolvedValue([
      { amount: 500, tipAmount: 20 },
    ]);
    mockStockMovFindMany.mockResolvedValue([
      { quantity: -2, product: { price: 10 } },
    ]);
    mockPayrollReportCreate.mockResolvedValue(makeReport());
  });

  describe('generatePayroll', () => {
    it('creates report for a specific artist', async () => {
      const result = await generatePayroll('tenant-1', {
        artistId:    'artist-1',
        periodStart: '2024-06-01',
        periodEnd:   '2024-06-30',
      });

      expect(result.reports).toHaveLength(1);
      expect(mockPayrollReportCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            artistId: 'artist-1',
          }),
        }),
      );
    });

    it('creates reports for all active artists when no artistId provided', async () => {
      mockArtistFindMany.mockResolvedValue([{ id: 'artist-1' }, { id: 'artist-2' }]);
      mockArtistFindUnique
        .mockResolvedValueOnce(makeArtist({ id: 'artist-1' }))
        .mockResolvedValueOnce(makeArtist({ id: 'artist-2' }));
      mockBookingFindMany.mockResolvedValue([]);
      mockPaymentFindMany.mockResolvedValue([]);
      mockStockMovFindMany.mockResolvedValue([]);
      mockPayrollReportCreate
        .mockResolvedValueOnce(makeReport({ id: 'report-1', artistId: 'artist-1' }))
        .mockResolvedValueOnce(makeReport({ id: 'report-2', artistId: 'artist-2' }));

      const result = await generatePayroll('tenant-1', {
        periodStart: '2024-06-01',
        periodEnd:   '2024-06-30',
      });

      expect(result.reports).toHaveLength(2);
    });

    it('throws 400 for invalid dates', async () => {
      await expect(
        generatePayroll('tenant-1', {
          periodStart: 'invalid',
          periodEnd:   '2024-06-30',
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_DATE' });
    });

    it('throws 400 when periodStart >= periodEnd', async () => {
      await expect(
        generatePayroll('tenant-1', {
          artistId:    'artist-1',
          periodStart: '2024-06-30',
          periodEnd:   '2024-06-01',
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_DATE_RANGE' });
    });

    it('throws 404 when artist not found', async () => {
      mockArtistFindUnique.mockResolvedValue(null);

      await expect(
        generatePayroll('tenant-1', {
          artistId:    'bad-artist',
          periodStart: '2024-06-01',
          periodEnd:   '2024-06-30',
        }),
      ).rejects.toMatchObject({ statusCode: 404, code: 'ARTIST_NOT_FOUND' });
    });

    it('throws 403 when artist belongs to different tenant', async () => {
      mockArtistFindUnique.mockResolvedValue(makeArtist({ tenantId: 'other-tenant' }));

      await expect(
        generatePayroll('tenant-1', {
          artistId:    'artist-1',
          periodStart: '2024-06-01',
          periodEnd:   '2024-06-30',
        }),
      ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });

    it('returns empty reports when no active artists', async () => {
      mockArtistFindMany.mockResolvedValue([]);

      const result = await generatePayroll('tenant-1', {
        periodStart: '2024-06-01',
        periodEnd:   '2024-06-30',
      });

      expect(result.reports).toHaveLength(0);
    });
  });

  describe('listReports', () => {
    it('returns paginated reports', async () => {
      mockPayrollReportFindMany.mockResolvedValue([makeReport()]);
      mockPayrollReportCount.mockResolvedValue(1);

      const result = await listReports('tenant-1', { page: 1, limit: 20 });

      expect(result.reports).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by artistId', async () => {
      mockPayrollReportFindMany.mockResolvedValue([makeReport()]);
      mockPayrollReportCount.mockResolvedValue(1);

      await listReports('tenant-1', { page: 1, limit: 20, artistId: 'artist-1' });

      expect(mockPayrollReportFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ artistId: 'artist-1' }),
        }),
      );
    });
  });

  describe('getReport', () => {
    it('returns a single report', async () => {
      mockPayrollReportFindUnique.mockResolvedValue(makeReport());

      const result = await getReport('tenant-1', 'report-1');

      expect(result.id).toBe('report-1');
    });

    it('throws 404 when report not found', async () => {
      mockPayrollReportFindUnique.mockResolvedValue(null);

      await expect(getReport('tenant-1', 'bad-id')).rejects.toMatchObject({
        statusCode: 404,
        code: 'REPORT_NOT_FOUND',
      });
    });

    it('throws 403 when report belongs to different tenant', async () => {
      mockPayrollReportFindUnique.mockResolvedValue(makeReport({ tenantId: 'other-tenant' }));

      await expect(getReport('tenant-1', 'report-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  describe('getMyEarnings', () => {
    it('returns artist earnings with totals', async () => {
      mockPayrollReportFindMany.mockResolvedValue([makeReport()]);
      mockPayrollReportCount.mockResolvedValue(1);

      const result = await getMyEarnings('artist-1', { page: 1, limit: 20 });

      expect(result.reports).toHaveLength(1);
      expect(result.totals.totalPay).toBeGreaterThanOrEqual(0);
    });
  });
});
