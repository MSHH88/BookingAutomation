/**
 * Analytics service — Step 1.18
 *
 * Provides read-only aggregations across all operational tables for the admin
 * analytics dashboard, plus a public event-tracking endpoint for frontend
 * instrumentation.
 *
 * Functions:
 *  - trackEvent            — records a single AnalyticsEvent row (public)
 *  - getOverview           — KPI summary (ADMIN)
 *  - getLeadsAnalytics     — lead funnel + attribution breakdown (ADMIN)
 *  - getBookingsAnalytics  — booking stats by status / artist / service (ADMIN)
 *  - getRevenueAnalytics   — invoice revenue breakdown + monthly trend (ADMIN)
 *  - listEvents            — paginated raw AnalyticsEvent log (ADMIN)
 *
 * Design principles:
 *  - Every aggregation is pushed to the database.  JS post-processing is
 *    limited to formatting and joining supplementary name lookups.
 *  - All DB round-trips within a single endpoint run in a single
 *    `Promise.all()` to minimise latency.
 *  - Date ranges default to the last 30 days when not supplied, matching
 *    the default view on Fresha / Booksy / Vagaro dashboards.
 *  - Amounts are returned as JavaScript `number` (2 d.p. rounded) rather
 *    than Prisma `Decimal` so JSON serialisation is always consistent.
 *
 * Industry reference:
 *   Fresha, Booksy, and Vagaro all surface these six metric categories in
 *   their "Insights" / "Reports" sections.  Keeping aggregations in the DB
 *   means queries stay fast even at millions of bookings.
 */
import { Prisma } from '@prisma/client';

import { prisma }                      from '../../lib/prisma';
import { getRedis }                    from '../../lib/redis';
import { paginate, PaginatedResult }   from '../../utils/paginate';
import { logger }                      from '../../utils/logger';
import type {
  TrackEventBody,
  OverviewQuery,
  LeadsAnalyticsQuery,
  BookingsAnalyticsQuery,
  RevenueAnalyticsQuery,
  EventsListQuery,
} from './analytics.schema';

// ─── Return-type interfaces ───────────────────────────────────────────────────

export interface OverviewResult {
  period:   { from: string; to: string };
  leads:    { total: number; today: number; conversionRate: number };
  bookings: {
    total:     number;
    today:     number;
    pending:   number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow:    number;
  };
  revenue:  { totalPaid: number; outstanding: number; overdue: number; currency: string };
  waitlist: { active: number; notified: number };
  whatsapp: { messagesSent: number };
}

export interface LeadsAnalyticsResult {
  period:    { from: string; to: string };
  total:     number;
  funnel:    Array<{ status: string; count: number }>;
  bySource:  Array<{ source: string; count: number }>;
  byCountry: Array<{ country: string; count: number }>;
  byDevice:  Array<{ deviceType: string; count: number }>;
  score: {
    average:      number;
    min:          number;
    max:          number;
    distribution: Array<{ range: string; count: number }>;
  };
}

export interface BookingsAnalyticsResult {
  period:                 { from: string; to: string };
  total:                  number;
  byStatus:               Array<{ status: string; count: number }>;
  byArtist:               Array<{ artistId: string; artistName: string; count: number }>;
  byService:              Array<{ serviceId: string; serviceName: string; count: number }>;
  byDayOfWeek:            Array<{ day: string; count: number }>;
  averageDurationMinutes: number;
  noShowRate:             number;
  cancellationRate:       number;
}

export interface RevenueAnalyticsResult {
  period:  { from: string; to: string };
  summary: {
    totalPaid:     number;
    outstanding:   number;
    overdue:       number;
    voided:        number;
    totalInvoiced: number;
    currency:      string;
  };
  byMonth:             Array<{ month: string; paid: number; issued: number }>;
  topServices:         Array<{ serviceName: string; revenue: number }>;
  averageInvoiceValue: number;
}

export interface AnalyticsEventItem {
  id:          string;
  eventType:   string;
  leadId:      string | null;
  sessionId:   string | null;
  payload:     Prisma.JsonValue;
  referrer:    string | null;
  ipAddress:   string | null;
  userAgent:   string | null;
  utmSource:   string | null;
  utmMedium:   string | null;
  utmCampaign: string | null;
  createdAt:   Date;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DEFAULT_RANGE_DAYS = 30;

/**
 * Parse an optional ISO date string.
 * Returns `undefined` when the string is absent or not a valid date.
 * When `endOfDay = true` the time is set to 23:59:59.999 UTC so the
 * entire calendar day is included in the range.
 */
function parseDateFilter(raw: string | undefined, endOfDay = false): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Resolve the effective [from, to] range.
 * Falls back to `DEFAULT_RANGE_DAYS` ago → now when params are not supplied.
 */
function resolveRange(from: string | undefined, to: string | undefined): { from: Date; to: Date } {
  const now         = new Date();
  const defaultFrom = new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
  return {
    from: parseDateFilter(from)       ?? defaultFrom,
    to:   parseDateFilter(to, true)   ?? now,
  };
}

/** Build a Prisma DateTimeFilter from a resolved date range. */
function mkDateFilter(from: Date, to: Date): Prisma.DateTimeFilter {
  return { gte: from, lte: to };
}

/** Round a number to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Round a number to 1 decimal place. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a single AnalyticsEvent (public — no auth required).
 *
 * The `leadId` foreign key is optional.  When provided and the referenced
 * lead does not exist the event is still persisted with `leadId = null` so
 * that a stale or incorrect leadId in the frontend never causes a 4xx.
 */
export async function trackEvent(
  body:      TrackEventBody,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ recorded: boolean }> {
  // Soft-link: verify leadId exists; degrade gracefully if it does not.
  let resolvedLeadId: string | null = null;
  if (body.leadId) {
    const exists = await prisma.lead.findUnique({
      where:  { id: body.leadId },
      select: { id: true },
    });
    if (exists) {
      resolvedLeadId = body.leadId;
    } else {
      logger.warn('trackEvent: leadId not found — persisting without lead link', {
        leadId:    body.leadId,
        eventType: body.eventType,
      });
    }
  }

  await prisma.analyticsEvent.create({
    data: {
      eventType:   body.eventType.toUpperCase().replace(/\s+/g, '_'),
      leadId:      resolvedLeadId,
      sessionId:   body.sessionId   ?? null,
      payload:     body.payload     ? (body.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
      referrer:    body.referrer    ?? null,
      ipAddress:   ipAddress        ?? null,
      userAgent:   userAgent        ?? null,
      utmSource:   body.utmSource   ?? null,
      utmMedium:   body.utmMedium   ?? null,
      utmCampaign: body.utmCampaign ?? null,
    },
  });

  return { recorded: true };
}

/**
 * KPI overview — aggregates leads, bookings, revenue and waitlist counts
 * for the requested date range.
 *
 * All DB round-trips run in a single `Promise.all()` for minimal latency.
 */
export async function getOverview(query: OverviewQuery): Promise<OverviewResult> {
  const range = resolveRange(query.from, query.to);
  const df    = mkDateFilter(range.from, range.to);

  // Today's UTC boundaries for "today" counters
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);
  const todayFilter: Prisma.DateTimeFilter = { gte: todayStart, lte: todayEnd };

  const [
    totalLeads,
    newLeadsToday,
    totalBookings,
    bookingsToday,
    bookingsByStatus,
    invoiceStats,
    waitlistActive,
    waitlistNotified,
    whatsappEventCount,
  ] = await Promise.all([
    prisma.lead.count({ where: { createdAt: df } }),
    prisma.lead.count({ where: { createdAt: todayFilter } }),
    prisma.booking.count({ where: { createdAt: df } }),
    prisma.booking.count({ where: { createdAt: todayFilter } }),
    prisma.booking.groupBy({
      by:     ['status'],
      where:  { createdAt: df },
      _count: { _all: true },
    }),
    prisma.invoice.findMany({
      where:  { createdAt: df },
      select: { amount: true, status: true, currency: true },
    }),
    prisma.waitlistEntry.count({ where: { status: 'WAITING' } }),
    prisma.waitlistEntry.count({ where: { status: 'NOTIFIED' } }),
    // WhatsApp automation events tracked as ANALYTICS events with the prefix
    prisma.analyticsEvent.count({
      where: { eventType: { startsWith: 'WHATSAPP_' }, createdAt: df },
    }),
  ]);

  // Revenue aggregation (Prisma Decimal → number)
  let totalPaid   = 0;
  let outstanding = 0;
  let overdue     = 0;
  let currency    = 'GBP';
  for (const inv of invoiceStats) {
    const amount = Number(inv.amount);
    currency = inv.currency;
    if (inv.status === 'PAID')    totalPaid   += amount;
    if (inv.status === 'UNPAID')  outstanding += amount;
    if (inv.status === 'OVERDUE') overdue     += amount;
  }

  // Booking status map
  const statusMap: Record<string, number> = {};
  for (const row of bookingsByStatus) statusMap[row.status] = row._count._all;

  // Conversion rate: bookings created in period / leads in period
  const conversionRate =
    totalLeads > 0 ? round1((totalBookings / totalLeads) * 100) : 0;

  return {
    period: { from: range.from.toISOString(), to: range.to.toISOString() },
    leads: {
      total:          totalLeads,
      today:          newLeadsToday,
      conversionRate,
    },
    bookings: {
      total:     totalBookings,
      today:     bookingsToday,
      pending:   statusMap['PENDING']    ?? 0,
      confirmed: statusMap['CONFIRMED']  ?? 0,
      completed: statusMap['COMPLETED']  ?? 0,
      cancelled: statusMap['CANCELLED']  ?? 0,
      noShow:    statusMap['NO_SHOW']    ?? 0,
    },
    revenue: {
      totalPaid:   round2(totalPaid),
      outstanding: round2(outstanding),
      overdue:     round2(overdue),
      currency,
    },
    waitlist: { active: waitlistActive, notified: waitlistNotified },
    whatsapp: { messagesSent: whatsappEventCount },
  };
}

/**
 * Lead funnel and attribution analytics for the requested period.
 */
export async function getLeadsAnalytics(query: LeadsAnalyticsQuery): Promise<LeadsAnalyticsResult> {
  const range = resolveRange(query.from, query.to);
  const df    = mkDateFilter(range.from, range.to);

  const where: Prisma.LeadWhereInput = { createdAt: df };
  if (query.artistId)    where.artistId    = query.artistId;
  if (query.businessType) where.businessType = query.businessType;

  const [
    total,
    byStatus,
    bySource,
    byCountry,
    byDevice,
    scoreAgg,
    leadsWithScore,
  ] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by:     ['status'],
      where,
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by:      ['utmSource'],
      where,
      _count:  { _all: true },
      orderBy: { _count: { utmSource: 'desc' } },
      take:    10,
    }),
    prisma.lead.groupBy({
      by:      ['country'],
      where,
      _count:  { _all: true },
      orderBy: { _count: { country: 'desc' } },
      take:    10,
    }),
    prisma.lead.groupBy({
      by:      ['deviceType'],
      where,
      _count:  { _all: true },
      orderBy: { _count: { deviceType: 'desc' } },
    }),
    prisma.lead.aggregate({
      where,
      _avg: { score: true },
      _min: { score: true },
      _max: { score: true },
    }),
    prisma.lead.findMany({ where, select: { score: true } }),
  ]);

  // Funnel ordered by pipeline stage
  const FUNNEL_ORDER = ['NEW', 'CONTACTED', 'QUOTED', 'BOOKED', 'COMPLETED', 'CANCELLED', 'LOST'];
  const statusCountMap: Record<string, number> = {};
  for (const row of byStatus) statusCountMap[row.status] = row._count._all;
  const funnel = FUNNEL_ORDER.map((status) => ({
    status,
    count: statusCountMap[status] ?? 0,
  }));

  // Score distribution in 20-point bands computed in JS (single fetch)
  const bands = [0, 0, 0, 0, 0]; // 0–20, 21–40, 41–60, 61–80, 81–100
  for (const { score } of leadsWithScore) {
    if      (score <= 20) bands[0]++;
    else if (score <= 40) bands[1]++;
    else if (score <= 60) bands[2]++;
    else if (score <= 80) bands[3]++;
    else                  bands[4]++;
  }
  const BAND_LABELS = ['0–20', '21–40', '41–60', '61–80', '81–100'];
  const distribution = BAND_LABELS.map((range, i) => ({ range, count: bands[i] }));

  return {
    period: { from: range.from.toISOString(), to: range.to.toISOString() },
    total,
    funnel,
    bySource:  bySource.map((r) => ({ source:     r.utmSource  ?? '(direct)',  count: r._count._all })),
    byCountry: byCountry.map((r) => ({ country:    r.country    ?? '(unknown)', count: r._count._all })),
    byDevice:  byDevice.map((r) => ({ deviceType: r.deviceType ?? '(unknown)', count: r._count._all })),
    score: {
      average:      round1(scoreAgg._avg.score ?? 0),
      min:          scoreAgg._min.score ?? 0,
      max:          scoreAgg._max.score ?? 0,
      distribution,
    },
  };
}

/**
 * Booking breakdown by status, artist, service and day-of-week.
 */
export async function getBookingsAnalytics(
  query: BookingsAnalyticsQuery,
): Promise<BookingsAnalyticsResult> {
  const range = resolveRange(query.from, query.to);
  const df    = mkDateFilter(range.from, range.to);

  const where: Prisma.BookingWhereInput = { createdAt: df };
  if (query.artistId) where.artistId = query.artistId;

  const [
    total,
    byStatus,
    byArtistRaw,
    byServiceRaw,
    bookingsList,
  ] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.groupBy({
      by:     ['status'],
      where,
      _count: { _all: true },
      orderBy: { _count: { status: 'desc' } },
    }),
    prisma.booking.groupBy({
      by:      ['artistId'],
      where,
      _count:  { _all: true },
      orderBy: { _count: { artistId: 'desc' } },
      take:    10,
    }),
    prisma.booking.groupBy({
      by:      ['serviceId'],
      where:   { ...where, serviceId: { not: null } },
      _count:  { _all: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take:    10,
    }),
    // Fetch startAt + duration for day-of-week and average duration calculations
    prisma.booking.findMany({
      where,
      select: { startAt: true, totalDurationMinutes: true },
    }),
  ]);

  // Resolve artist names for the top-10 (one extra query, runs after groupBy)
  const artistIds = byArtistRaw.map((r) => r.artistId);
  const artists = await prisma.artist.findMany({
    where:  { id: { in: artistIds } },
    select: { id: true, user: { select: { name: true } } },
  });
  const artistNameMap: Record<string, string> = {};
  for (const a of artists) artistNameMap[a.id] = a.user.name;

  // Resolve service names for the top-10
  const serviceIds = byServiceRaw.map((r) => r.serviceId).filter(Boolean) as string[];
  const services = await prisma.service.findMany({
    where:  { id: { in: serviceIds } },
    select: { id: true, name: true },
  });
  const serviceNameMap: Record<string, string> = {};
  for (const s of services) serviceNameMap[s.id] = s.name;

  // Day-of-week breakdown + average duration (computed in JS — UTC day)
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dowCounts = new Array<number>(7).fill(0);
  let durationTotal = 0;
  let durationCount = 0;
  for (const b of bookingsList) {
    dowCounts[b.startAt.getUTCDay()]++;
    if (b.totalDurationMinutes != null && b.totalDurationMinutes > 0) {
      durationTotal += b.totalDurationMinutes;
      durationCount++;
    }
  }

  const statusMap: Record<string, number> = {};
  for (const row of byStatus) statusMap[row.status] = row._count._all;

  const noShowRate      = total > 0 ? round1(((statusMap['NO_SHOW']   ?? 0) / total) * 100) : 0;
  const cancellationRate = total > 0 ? round1(((statusMap['CANCELLED'] ?? 0) / total) * 100) : 0;

  return {
    period: { from: range.from.toISOString(), to: range.to.toISOString() },
    total,
    byStatus:   byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    byArtist:   byArtistRaw.map((r) => ({
      artistId:   r.artistId,
      artistName: artistNameMap[r.artistId] ?? r.artistId,
      count:      r._count._all,
    })),
    byService:  byServiceRaw.map((r) => ({
      serviceId:   r.serviceId ?? '',
      serviceName: serviceNameMap[r.serviceId ?? ''] ?? '(unknown)',
      count:       r._count._all,
    })),
    byDayOfWeek:            dowCounts.map((count, i) => ({ day: DAY_NAMES[i], count })),
    averageDurationMinutes: durationCount > 0 ? Math.round(durationTotal / durationCount) : 0,
    noShowRate,
    cancellationRate,
  };
}

/**
 * Revenue analytics — invoice aggregations with monthly trend and
 * per-service attribution.
 */
export async function getRevenueAnalytics(query: RevenueAnalyticsQuery): Promise<RevenueAnalyticsResult> {
  const range = resolveRange(query.from, query.to);
  const df    = mkDateFilter(range.from, range.to);

  const invoices = await prisma.invoice.findMany({
    where: { createdAt: df },
    select: {
      amount:    true,
      status:    true,
      currency:  true,
      createdAt: true,
      booking: {
        select: {
          service: { select: { name: true } },
          services: {
            select: {
              price:   true,
              service: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  let totalPaid    = 0;
  let outstanding  = 0;
  let overdue      = 0;
  let voided       = 0;
  let currency     = 'GBP';
  let invoiceCount = 0;

  const monthlyMap: Record<string, { paid: number; issued: number }> = {};
  const serviceRevMap: Record<string, number> = {};

  for (const inv of invoices) {
    const amount = Number(inv.amount);
    currency     = inv.currency;
    invoiceCount++;

    const month = inv.createdAt.toISOString().slice(0, 7); // "YYYY-MM"
    if (!monthlyMap[month]) monthlyMap[month] = { paid: 0, issued: 0 };
    monthlyMap[month].issued += amount;

    if (inv.status === 'PAID') {
      totalPaid += amount;
      monthlyMap[month].paid += amount;
    } else if (inv.status === 'UNPAID')  outstanding += amount;
    else if  (inv.status === 'OVERDUE')  overdue     += amount;
    else if  (inv.status === 'VOID')     voided      += amount;

    // Service revenue attribution: use BookingService lines when available;
    // fall back to the booking's top-level service.
    if (inv.booking?.services && inv.booking.services.length > 0) {
      for (const bs of inv.booking.services) {
        const svcName = bs.service.name;
        serviceRevMap[svcName] = (serviceRevMap[svcName] ?? 0) + Number(bs.price);
      }
    } else if (inv.booking?.service?.name) {
      const svcName = inv.booking.service.name;
      serviceRevMap[svcName] = (serviceRevMap[svcName] ?? 0) + amount;
    }
  }

  const totalInvoiced = totalPaid + outstanding + overdue;

  const byMonth = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      paid:   round2(data.paid),
      issued: round2(data.issued),
    }));

  const topServices = Object.entries(serviceRevMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([serviceName, revenue]) => ({ serviceName, revenue: round2(revenue) }));

  return {
    period: { from: range.from.toISOString(), to: range.to.toISOString() },
    summary: {
      totalPaid:     round2(totalPaid),
      outstanding:   round2(outstanding),
      overdue:       round2(overdue),
      voided:        round2(voided),
      totalInvoiced: round2(totalInvoiced),
      currency,
    },
    byMonth,
    topServices,
    averageInvoiceValue: invoiceCount > 0 ? round2(totalInvoiced / invoiceCount) : 0,
  };
}

/**
 * Paginated raw AnalyticsEvent log (admin only).
 */
export async function listEvents(query: EventsListQuery): Promise<PaginatedResult<AnalyticsEventItem>> {
  const range = resolveRange(query.from, query.to);
  const df    = mkDateFilter(range.from, range.to);

  const where: Prisma.AnalyticsEventWhereInput = { createdAt: df };
  if (query.eventType) {
    where.eventType = { equals: query.eventType.toUpperCase(), mode: 'insensitive' };
  }
  if (query.leadId) where.leadId = query.leadId;

  return paginate<AnalyticsEventItem>(
    prisma.analyticsEvent,
    {
      where,
      select: {
        id:          true,
        eventType:   true,
        leadId:      true,
        sessionId:   true,
        payload:     true,
        referrer:    true,
        ipAddress:   true,
        userAgent:   true,
        utmSource:   true,
        utmMedium:   true,
        utmCampaign: true,
        createdAt:   true,
      },
      orderBy: { createdAt: 'desc' },
    },
    { page: query.page, limit: query.limit },
  );
}

// ─── Helpers (Phase 4.7) ──────────────────────────────────────────────────────

function parseDateRange(from?: string, to?: string): { fromDate: Date; toDate: Date } {
  const toDate   = to   ? new Date(to)   : new Date();
  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return { fromDate, toDate };
}

async function getCached<T>(key: string): Promise<T | null> {
  const redis  = getRedis();
  const cached = await redis.get(key).catch(() => null);
  if (cached) {
    try { return JSON.parse(cached) as T; } catch { return null; }
  }
  return null;
}

async function setCache(key: string, value: unknown): Promise<void> {
  const redis = getRedis();
  await redis.set(key, JSON.stringify(value), 'EX', 900).catch(() => {});
}

// ─── Artists analytics (Phase 4.7) ───────────────────────────────────────────

/**
 * GET /api/analytics/artists
 * Revenue and booking count per artist for the date range.
 */
export async function getArtistsAnalytics(
  tenantId: string,
  query: import('./analytics.schema').ArtistsAnalyticsQuery,
) {
  const cacheKey = `analytics:artists:${tenantId}:${JSON.stringify(query)}`;
  const cached   = await getCached<unknown>(cacheKey);
  if (cached) return cached;

  const { fromDate, toDate } = parseDateRange(query.from, query.to);

  const artists = await prisma.artist.findMany({
    where: { tenantId, isActive: true },
    select: {
      id:   true,
      user: { select: { email: true } },
    },
  });

  const artistStats = await Promise.all(
    artists.map(async (artist) => {
      const bookings = await prisma.booking.findMany({
        where: {
          tenantId,
          artistId: artist.id,
          status:   'COMPLETED',
          startAt:  { gte: fromDate, lte: toDate },
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

      const revenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const tips    = payments.reduce((sum, p) => sum + Number(p.tipAmount ?? 0), 0);

      return {
        artistId:     artist.id,
        email:        artist.user.email,
        bookingCount: bookings.length,
        revenue:      Math.round(revenue * 100) / 100,
        totalTips:    Math.round(tips * 100) / 100,
      };
    }),
  );

  const result = {
    period:  { from: fromDate.toISOString(), to: toDate.toISOString() },
    artists: artistStats.sort((a, b) => b.revenue - a.revenue),
  };

  await setCache(cacheKey, result);
  return result;
}

// ─── Services analytics (Phase 4.7) ──────────────────────────────────────────

/**
 * GET /api/analytics/services
 * Revenue per service type for the date range.
 */
export async function getServicesAnalytics(
  tenantId: string,
  query: import('./analytics.schema').ServicesAnalyticsQuery,
) {
  const cacheKey = `analytics:services:${tenantId}:${JSON.stringify(query)}`;
  const cached   = await getCached<unknown>(cacheKey);
  if (cached) return cached;

  const { fromDate, toDate } = parseDateRange(query.from, query.to);

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      status:    'COMPLETED',
      startAt:   { gte: fromDate, lte: toDate },
      serviceId: { not: null },
    },
    select: {
      id:      true,
      service: { select: { id: true, name: true } },
    },
  });

  const serviceMap: Record<string, { serviceId: string; serviceName: string; bookingIds: string[] }> = {};

  for (const booking of bookings) {
    if (!booking.service) continue;
    const sid = booking.service.id;
    if (!serviceMap[sid]) {
      serviceMap[sid] = {
        serviceId:   sid,
        serviceName: booking.service.name,
        bookingIds:  [],
      };
    }
    serviceMap[sid].bookingIds.push(booking.id);
  }

  const serviceStats = await Promise.all(
    Object.values(serviceMap).map(async (entry) => {
      const payments = await prisma.payment.findMany({
        where: {
          tenantId,
          status:    'SUCCEEDED',
          bookingId: { in: entry.bookingIds },
        },
        select: { amount: true },
      });

      const revenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        serviceId:    entry.serviceId,
        serviceName:  entry.serviceName,
        bookingCount: entry.bookingIds.length,
        revenue:      Math.round(revenue * 100) / 100,
      };
    }),
  );

  const result = {
    period:   { from: fromDate.toISOString(), to: toDate.toISOString() },
    services: serviceStats.sort((a, b) => b.revenue - a.revenue),
  };

  await setCache(cacheKey, result);
  return result;
}

// ─── Customers analytics (Phase 4.7) ─────────────────────────────────────────

/**
 * GET /api/analytics/customers
 * New vs returning customers, top spenders, LTV distribution.
 * Uses customerId to identify customers (null = walk-in).
 */
export async function getCustomersAnalytics(
  tenantId: string,
  query: import('./analytics.schema').CustomersAnalyticsQuery,
) {
  const cacheKey = `analytics:customers:${tenantId}:${JSON.stringify(query)}`;
  const cached   = await getCached<unknown>(cacheKey);
  if (cached) return cached;

  const { fromDate, toDate } = parseDateRange(query.from, query.to);

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      status:  'COMPLETED',
      startAt: { gte: fromDate, lte: toDate },
    },
    select: {
      id:         true,
      customerId: true,
    },
  });

  // Count bookings per customer (walk-ins grouped as "(walk-in)")
  const customerBookingCount: Record<string, number> = {};
  for (const b of bookings) {
    const key = b.customerId ?? '(walk-in)';
    customerBookingCount[key] = (customerBookingCount[key] ?? 0) + 1;
  }

  const returningCustomers = Object.values(customerBookingCount).filter((c) => c > 1).length;
  const newCustomers       = Object.keys(customerBookingCount).length - returningCustomers;

  const bookingIds = bookings.map((b) => b.id);

  const payments = await prisma.payment.findMany({
    where: {
      tenantId,
      status:    'SUCCEEDED',
      bookingId: { in: bookingIds },
    },
    select: { amount: true, bookingId: true },
  });

  const bookingCustomerMap: Record<string, string> = {};
  for (const b of bookings) {
    bookingCustomerMap[b.id] = b.customerId ?? '(walk-in)';
  }

  const revenuePerCustomer: Record<string, number> = {};
  for (const p of payments) {
    const key = bookingCustomerMap[p.bookingId ?? ''] ?? '(unknown)';
    revenuePerCustomer[key] = (revenuePerCustomer[key] ?? 0) + Number(p.amount);
  }

  const topSpenders = Object.entries(revenuePerCustomer)
    .map(([customerId, revenue]) => ({ customerId, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const ltvValues = Object.values(revenuePerCustomer);
  const ltvBands = {
    under50:    ltvValues.filter((v) => v < 50).length,
    '50to200':  ltvValues.filter((v) => v >= 50 && v < 200).length,
    '200to500': ltvValues.filter((v) => v >= 200 && v < 500).length,
    over500:    ltvValues.filter((v) => v >= 500).length,
  };

  const totalCustomers = Object.keys(customerBookingCount).length;

  const result = {
    period:            { from: fromDate.toISOString(), to: toDate.toISOString() },
    totalCustomers,
    newCustomers,
    returningCustomers,
    repeatRate:        totalCustomers > 0
      ? Math.round((returningCustomers / totalCustomers) * 1000) / 10
      : 0,
    topSpenders,
    ltvDistribution: ltvBands,
  };

  await setCache(cacheKey, result);
  return result;
}

// ─── Artist performance (Phase 4.8) ──────────────────────────────────────────

/**
 * GET /api/analytics/my-performance
 * Artist self-service stats, scoped to the calling artist.
 */
export async function getArtistPerformance(
  artistId: string,
  query: import('./analytics.schema').MyPerformanceQuery,
) {
  const cacheKey = `analytics:performance:${artistId}:${JSON.stringify(query)}`;
  const cached   = await getCached<unknown>(cacheKey);
  if (cached) return cached;

  const { fromDate, toDate } = parseDateRange(query.from, query.to);

  const rangeDays = query.compareDays
    ?? Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
  const compareEnd   = new Date(fromDate.getTime() - 1);
  const compareStart = new Date(compareEnd.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  async function getPeriodStats(start: Date, end: Date) {
    const bookings = await prisma.booking.findMany({
      where: {
        artistId,
        status:  'COMPLETED',
        startAt: { gte: start, lte: end },
      },
      select: {
        id:         true,
        startAt:    true,
        customerId: true,
        service:    { select: { id: true, name: true } },
      },
    });

    const bookingIds = bookings.map((b) => b.id);

    const payments = await prisma.payment.findMany({
      where: {
        status:    'SUCCEEDED',
        bookingId: { in: bookingIds },
      },
      select: { amount: true, tipAmount: true, bookingId: true },
    });

    const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalTips    = payments.reduce((s, p) => s + Number(p.tipAmount ?? 0), 0);

    const revenueByService: Record<string, { serviceName: string; revenue: number; count: number }> = {};
    for (const b of bookings) {
      if (!b.service) continue;
      const sid = b.service.id;
      if (!revenueByService[sid]) {
        revenueByService[sid] = { serviceName: b.service.name, revenue: 0, count: 0 };
      }
      const bp = payments.filter((p) => p.bookingId === b.id);
      revenueByService[sid].revenue += bp.reduce((s, p) => s + Number(p.amount), 0);
      revenueByService[sid].count   += 1;
    }

    const revenueByMonth: Record<string, number> = {};
    for (const b of bookings) {
      const monthKey = b.startAt.toISOString().slice(0, 7);
      const bp = payments.filter((p) => p.bookingId === b.id);
      revenueByMonth[monthKey] = (revenueByMonth[monthKey] ?? 0) +
        bp.reduce((s, p) => s + Number(p.amount), 0);
    }

    const hourCounts: Record<number, number> = {};
    for (const b of bookings) {
      const hour = b.startAt.getUTCHours();
      hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
    }

    const dayCounts: Record<number, number> = {};
    for (const b of bookings) {
      const day = b.startAt.getUTCDay();
      dayCounts[day] = (dayCounts[day] ?? 0) + 1;
    }

    const customerBookingCount: Record<string, number> = {};
    for (const b of bookings) {
      const key = b.customerId ?? '(walk-in)';
      customerBookingCount[key] = (customerBookingCount[key] ?? 0) + 1;
    }
    const uniqueCustomers    = Object.keys(customerBookingCount).length;
    const returningCustomers = Object.values(customerBookingCount).filter((c) => c > 1).length;
    const repeatRate         = uniqueCustomers > 0
      ? Math.round((returningCustomers / uniqueCustomers) * 1000) / 10
      : 0;

    const avgBookingValue = bookings.length > 0
      ? Math.round((totalRevenue / bookings.length) * 100) / 100
      : 0;

    return {
      bookingCount:   bookings.length,
      totalRevenue:   Math.round(totalRevenue * 100) / 100,
      totalTips:      Math.round(totalTips * 100) / 100,
      avgBookingValue,
      repeatRate,
      revenueByService: Object.values(revenueByService).sort((a, b) => b.revenue - a.revenue),
      revenueByMonth:   Object.entries(revenueByMonth)
        .map(([month, revenue]) => ({ month, revenue: Math.round(revenue * 100) / 100 }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      busiestHours: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourCounts[h] ?? 0 })),
      busiestDays:  Array.from({ length: 7 }, (_, d) => ({ day: d, count: dayCounts[d] ?? 0 })),
    };
  }

  const [current, previous] = await Promise.all([
    getPeriodStats(fromDate, toDate),
    getPeriodStats(compareStart, compareEnd),
  ]);

  const result = {
    period:        { from: fromDate.toISOString(), to: toDate.toISOString() },
    comparePeriod: { from: compareStart.toISOString(), to: compareEnd.toISOString() },
    current,
    previous,
    delta: {
      bookingCount:    current.bookingCount   - previous.bookingCount,
      totalRevenue:    Math.round((current.totalRevenue   - previous.totalRevenue)   * 100) / 100,
      totalTips:       Math.round((current.totalTips      - previous.totalTips)      * 100) / 100,
      avgBookingValue: Math.round((current.avgBookingValue - previous.avgBookingValue) * 100) / 100,
      repeatRate:      Math.round((current.repeatRate - previous.repeatRate) * 10) / 10,
    },
  };

  await setCache(cacheKey, result);
  return result;
}
