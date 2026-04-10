/**
 * Customer LTV / Stats service — Phase 3.4
 *
 * Computes lifetime-value and behavioural statistics for customers using
 * existing Booking, Invoice, Service and Artist models.  No new Prisma model
 * is required — everything is aggregated on the fly.
 *
 * ─── What this module does ───────────────────────────────────────────────────
 *
 *   getCustomerStats(customerId, tenantId)
 *     Returns computed stats for a single customer:
 *       totalSpend, visitCount, lastVisitDate, firstVisitDate,
 *       averageSpend, mostBookedService, mostBookedArtist
 *     Redis-cached for 1 hour per customer.
 *
 *   listCustomersWithStats(tenantId, query)
 *     Paginated list of CUSTOMER-role users with stats appended.
 *     Supports sorting by LTV, visit count, or name, plus optional
 *     minSpend and lastVisitBefore filters.
 *     NOT cached — only individual stats are cached.
 */
import { prisma }   from '../../lib/prisma';
import { getRedis } from '../../lib/redis';
import { AppError } from '../../errors/AppError';
import { logger }   from '../../utils/logger';
import type {
  CustomerStats,
  CustomerWithStats,
  ListCustomersWithStatsQuery,
} from './customer-stats.schema';

// ─── Cache configuration ──────────────────────────────────────────────────────

const CACHE_PREFIX = 'customer_stats';
const CACHE_TTL    = 3600; // 1 hour

function cacheKey(tenantId: string, customerId: string): string {
  return `${CACHE_PREFIX}:${tenantId}:${customerId}`;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function computeStats(customerId: string, tenantId: string): Promise<CustomerStats> {
  // 1 — Completed bookings
  const completedBookings = await prisma.booking.findMany({
    where: { customerId, tenantId, status: 'COMPLETED' },
    select: {
      id:          true,
      completedAt: true,
      serviceId:   true,
      artistId:    true,
    },
    orderBy: { completedAt: 'desc' },
  });

  const visitCount = completedBookings.length;

  // 2 — Total spend from PAID invoices on this customer's bookings
  // Include invoices for ALL of the customer's bookings, not just completed ones
  const allBookingIds = await prisma.booking.findMany({
    where: { customerId, tenantId },
    select: { id: true },
  });

  const paidInvoices = await prisma.invoice.findMany({
    where: {
      bookingId: { in: allBookingIds.map((b) => b.id) },
      status: 'PAID',
    },
    select: { amount: true },
  });

  const totalSpend = paidInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount),
    0,
  );

  // 3 — Visit dates
  const lastVisitDate  = completedBookings[0]?.completedAt ?? null;
  const firstVisitDate = completedBookings.length > 0
    ? completedBookings[completedBookings.length - 1]!.completedAt
    : null;

  // 4 — Average spend
  const averageSpend = visitCount > 0 ? totalSpend / visitCount : 0;

  // 5 — Most booked service
  let mostBookedService: string | null = null;
  const serviceCounts = new Map<string, number>();
  for (const b of completedBookings) {
    if (b.serviceId) {
      serviceCounts.set(b.serviceId, (serviceCounts.get(b.serviceId) ?? 0) + 1);
    }
  }
  if (serviceCounts.size > 0) {
    const topServiceId = [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    const svc = await prisma.service.findUnique({
      where: { id: topServiceId },
      select: { name: true },
    });
    mostBookedService = svc?.name ?? null;
  }

  // 6 — Most booked artist
  let mostBookedArtist: string | null = null;
  const artistCounts = new Map<string, number>();
  for (const b of completedBookings) {
    if (b.artistId) {
      artistCounts.set(b.artistId, (artistCounts.get(b.artistId) ?? 0) + 1);
    }
  }
  if (artistCounts.size > 0) {
    const topArtistId = [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    const artist = await prisma.artist.findUnique({
      where: { id: topArtistId },
      select: { user: { select: { name: true } } },
    });
    mostBookedArtist = artist?.user?.name ?? null;
  }

  return {
    totalSpend,
    visitCount,
    lastVisitDate:  lastVisitDate  ? new Date(lastVisitDate).toISOString()  : null,
    firstVisitDate: firstVisitDate ? new Date(firstVisitDate).toISOString() : null,
    averageSpend:   Math.round(averageSpend * 100) / 100,
    mostBookedService,
    mostBookedArtist,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/customer-stats/:customerId
 * Returns computed lifetime-value stats for a single customer.
 */
export async function getCustomerStats(
  customerId: string,
  tenantId: string,
): Promise<CustomerStats> {
  // Verify customer exists and belongs to the tenant
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

  // 1 — Try Redis cache
  const redis = getRedis();
  const key   = cacheKey(tenantId, customerId);

  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as CustomerStats;
    }
  } catch (err) {
    logger.warn('[CustomerStats] Redis GET failed, falling through to DB', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2 — Compute from DB
  const stats = await computeStats(customerId, tenantId);

  // 3 — Store in cache (non-fatal on error)
  try {
    await redis.set(key, JSON.stringify(stats), 'EX', CACHE_TTL);
  } catch (err) {
    logger.warn('[CustomerStats] Redis SET failed, continuing without cache', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return stats;
}

/**
 * GET /api/customer-stats
 * Paginated list of CUSTOMER-role users with stats appended.
 */
export async function listCustomersWithStats(
  tenantId: string,
  query: ListCustomersWithStatsQuery,
): Promise<{ customers: CustomerWithStats[]; total: number }> {
  const { page, limit, sortBy, minSpend, lastVisitBefore } = query;
  const skip = (page - 1) * limit;

  // Fetch all matching customers
  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, role: 'CUSTOMER' },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: sortBy === 'name' ? { name: 'asc' } : { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({
      where: { tenantId, role: 'CUSTOMER' },
    }),
  ]);

  // Append stats to each customer
  const results: CustomerWithStats[] = [];

  for (const c of customers) {
    const stats = await computeStats(c.id, tenantId);
    results.push({
      id:        c.id,
      name:      c.name ?? '',
      email:     c.email ?? '',
      createdAt: new Date(c.createdAt).toISOString(),
      stats,
    });
  }

  // Post-query filtering (minSpend, lastVisitBefore)
  let filtered = results;

  if (minSpend !== undefined) {
    filtered = filtered.filter((r) => r.stats.totalSpend >= minSpend);
  }

  if (lastVisitBefore) {
    const cutoff = new Date(lastVisitBefore);
    filtered = filtered.filter((r) => {
      if (!r.stats.lastVisitDate) return true; // never visited passes filter
      return new Date(r.stats.lastVisitDate) < cutoff;
    });
  }

  // Post-query sorting for ltv/visits (name sorting already applied via Prisma)
  if (sortBy === 'ltv') {
    filtered.sort((a, b) => b.stats.totalSpend - a.stats.totalSpend);
  } else if (sortBy === 'visits') {
    filtered.sort((a, b) => b.stats.visitCount - a.stats.visitCount);
  }

  return { customers: filtered, total };
}
