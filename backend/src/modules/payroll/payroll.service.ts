/**
 * Payroll service — Phase 4.6
 *
 * Calculates staff payroll and commission reports.
 *
 * Functions:
 *  - generatePayroll(tenantId, data)     — compute + persist report(s)
 *  - listReports(tenantId, query)        — paginated list of reports
 *  - getReport(tenantId, id)             — single report by ID
 *  - getMyEarnings(artistId, query)      — artist self-view of earnings/reports
 */
import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { logger }   from '../../utils/logger';
import type {
  GeneratePayrollBody,
  ListPayrollReportsQuery,
  MyEarningsQuery,
} from './payroll.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayrollCalculation {
  artistId:          string;
  basePay:           number;
  serviceCommission: number;
  productCommission: number;
  totalTips:         number;
  totalPay:          number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function calculateForArtist(
  tenantId: string,
  artistId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<PayrollCalculation> {
  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: {
      id:                   true,
      tenantId:             true,
      basePay:              true,
      serviceCommissionPct: true,
      productCommissionPct: true,
    },
  });

  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist ${artistId} not found`);
  }

  if (artist.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Artist does not belong to this tenant');
  }

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      artistId,
      status:  'COMPLETED',
      startAt: { gte: periodStart, lte: periodEnd },
    },
    select: { id: true },
  });

  const bookingIds = bookings.map((b) => b.id);

  const payments = await prisma.payment.findMany({
    where: {
      tenantId,
      status:    'SUCCEEDED',
      bookingId: { in: bookingIds },
    },
    select: { amount: true, tipAmount: true },
  });

  const serviceRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalTips      = payments.reduce((sum, p) => sum + Number(p.tipAmount ?? 0), 0);

  const stockMoves = await prisma.stockMovement.findMany({
    where: {
      tenantId,
      reason:    'SALE',
      bookingId: { in: bookingIds },
    },
    select: {
      quantity: true,
      product:  { select: { price: true } },
    },
  });

  const productRevenue = stockMoves.reduce(
    (sum, m) => sum + Math.abs(m.quantity) * Number(m.product.price),
    0,
  );

  const serviceCommissionPct = artist.serviceCommissionPct ? Number(artist.serviceCommissionPct) : 0;
  const productCommissionPct = artist.productCommissionPct ? Number(artist.productCommissionPct) : 0;
  const basePay              = artist.basePay ? Number(artist.basePay) : 0;

  const serviceCommission = Math.round(serviceRevenue * (serviceCommissionPct / 100) * 100) / 100;
  const productCommission = Math.round(productRevenue * (productCommissionPct / 100) * 100) / 100;
  const totalPay          = Math.round((basePay + serviceCommission + productCommission) * 100) / 100;

  return {
    artistId,
    basePay:          Math.round(basePay * 100) / 100,
    serviceCommission,
    productCommission,
    totalTips:        Math.round(totalTips * 100) / 100,
    totalPay,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * POST /api/payroll/generate
 * Generates payroll report(s) for the given period.
 */
export async function generatePayroll(tenantId: string, data: GeneratePayrollBody) {
  const periodStart = new Date(data.periodStart);
  const periodEnd   = new Date(data.periodEnd);

  if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
    throw new AppError(400, 'INVALID_DATE', 'periodStart and periodEnd must be valid ISO-8601 dates');
  }

  if (periodStart >= periodEnd) {
    throw new AppError(400, 'INVALID_DATE_RANGE', 'periodStart must be before periodEnd');
  }

  let artistIds: string[];

  if (data.artistId) {
    artistIds = [data.artistId];
  } else {
    const artists = await prisma.artist.findMany({
      where:  { tenantId, isActive: true },
      select: { id: true },
    });
    artistIds = artists.map((a) => a.id);
  }

  if (artistIds.length === 0) {
    return { reports: [] };
  }

  const reports = await Promise.all(
    artistIds.map(async (artistId) => {
      const calc = await calculateForArtist(tenantId, artistId, periodStart, periodEnd);

      const report = await prisma.payrollReport.create({
        data: {
          tenantId,
          artistId:          calc.artistId,
          periodStart,
          periodEnd,
          basePay:           calc.basePay,
          serviceCommission: calc.serviceCommission,
          productCommission: calc.productCommission,
          totalTips:         calc.totalTips,
          totalPay:          calc.totalPay,
        },
      });

      logger.info('Payroll report generated', {
        tenantId,
        reportId:    report.id,
        artistId:    calc.artistId,
        totalPay:    calc.totalPay,
        periodStart: periodStart.toISOString(),
        periodEnd:   periodEnd.toISOString(),
      });

      return report;
    }),
  );

  return { reports };
}

/**
 * GET /api/payroll/reports
 * Paginated list of payroll reports for a tenant.
 */
export async function listReports(tenantId: string, query: ListPayrollReportsQuery) {
  const { page = 1, limit = 20, artistId } = query;
  const skip = (page - 1) * limit;

  const where = {
    tenantId,
    ...(artistId ? { artistId } : {}),
  };

  const [reports, total] = await Promise.all([
    prisma.payrollReport.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      skip,
      take: limit,
      include: {
        artist: {
          select: {
            id:   true,
            user: { select: { email: true } },
          },
        },
      },
    }),
    prisma.payrollReport.count({ where }),
  ]);

  return { reports, total, page, limit };
}

/**
 * GET /api/payroll/reports/:id
 * Get a single payroll report by ID.
 */
export async function getReport(tenantId: string, id: string) {
  const report = await prisma.payrollReport.findUnique({
    where: { id },
    include: {
      artist: {
        select: {
          id:                   true,
          basePay:              true,
          serviceCommissionPct: true,
          productCommissionPct: true,
          user:                 { select: { email: true } },
        },
      },
    },
  });

  if (!report) {
    throw new AppError(404, 'REPORT_NOT_FOUND', 'Payroll report not found');
  }

  if (report.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Payroll report does not belong to this tenant');
  }

  return report;
}

/**
 * GET /api/payroll/my-earnings
 * Artist self-service view of their payroll reports.
 */
export async function getMyEarnings(artistId: string, query: MyEarningsQuery) {
  const { page = 1, limit = 20, from, to } = query;
  const skip = (page - 1) * limit;

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(from);
  if (to)   dateFilter.lte = new Date(to);

  const where = {
    artistId,
    ...(Object.keys(dateFilter).length > 0 ? { periodStart: dateFilter } : {}),
  };

  const [reports, total] = await Promise.all([
    prisma.payrollReport.findMany({
      where,
      orderBy: { periodStart: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payrollReport.count({ where }),
  ]);

  const totals = reports.reduce(
    (acc, r) => ({
      totalPay:          acc.totalPay          + Number(r.totalPay),
      totalTips:         acc.totalTips         + Number(r.totalTips),
      serviceCommission: acc.serviceCommission + Number(r.serviceCommission),
      productCommission: acc.productCommission + Number(r.productCommission),
      basePay:           acc.basePay           + Number(r.basePay),
    }),
    { totalPay: 0, totalTips: 0, serviceCommission: 0, productCommission: 0, basePay: 0 },
  );

  return { reports, total, page, limit, totals };
}
