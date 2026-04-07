/**
 * Unit tests for analytics.service.ts — Step 1.18
 *
 * All Prisma calls are mocked so tests run without a live database.
 *
 * Coverage:
 *  ✓ trackEvent
 *      — records event with all fields including leadId
 *      — records event without optional fields
 *      — normalises eventType to SCREAMING_SNAKE_CASE
 *      — resolves leadId when lead exists
 *      — drops leadId when lead does not exist (graceful degrade)
 *      — persists event even when leadId lookup returns null
 *
 *  ✓ getOverview
 *      — returns correct structure with all fields present
 *      — computes conversionRate correctly (bookings / leads * 100, 1 d.p.)
 *      — conversionRate is 0 when totalLeads is 0 (no divide-by-zero)
 *      — maps booking status counts correctly from groupBy result
 *      — defaults missing statuses to 0
 *      — sums revenue correctly across PAID / UNPAID / OVERDUE invoices
 *      — rounds revenue amounts to 2 decimal places
 *      — period.from / period.to are ISO strings
 *
 *  ✓ getLeadsAnalytics
 *      — returns funnel in correct pipeline order (NEW→LOST)
 *      — maps (direct) for null utmSource
 *      — maps (unknown) for null country
 *      — maps (unknown) for null deviceType
 *      — computes score distribution bands correctly
 *      — score.average rounded to 1 decimal place
 *      — passes artistId filter when provided
 *      — passes businessType filter when provided
 *
 *  ✓ getBookingsAnalytics
 *      — returns all seven day-of-week entries
 *      — computes averageDurationMinutes from bookingsList
 *      — averageDurationMinutes is 0 when no duration data
 *      — noShowRate computed correctly (1 d.p.)
 *      — cancellationRate computed correctly (1 d.p.)
 *      — rates are 0 when total is 0 (no divide-by-zero)
 *      — resolves artist names from separate lookup
 *      — resolves service names from separate lookup
 *
 *  ✓ getRevenueAnalytics
 *      — returns correct summary totals
 *      — builds monthly trend sorted chronologically
 *      — attributes revenue to service via BookingService lines
 *      — falls back to booking.service when no BookingService lines
 *      — averageInvoiceValue is 0 when no invoices
 *      — topServices is limited to 10 entries
 *      — topServices sorted by revenue descending
 *
 *  ✓ listEvents
 *      — calls paginate with correct where clause
 *      — applies eventType filter (upper-cased, case-insensitive)
 *      — applies leadId filter
 *      — passes page and limit to paginate
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockLeadFindUnique        = jest.fn();
const mockLeadCount             = jest.fn();
const mockLeadGroupBy           = jest.fn();
const mockLeadAggregate         = jest.fn();
const mockLeadFindMany          = jest.fn();
const mockBookingCount          = jest.fn();
const mockBookingGroupBy        = jest.fn();
const mockBookingFindMany       = jest.fn();
const mockArtistFindMany        = jest.fn();
const mockServiceFindMany       = jest.fn();
const mockInvoiceFindMany       = jest.fn();
const mockWaitlistEntryCount    = jest.fn();
const mockAnalyticsEventCreate  = jest.fn();
const mockAnalyticsEventCount   = jest.fn();
const mockAnalyticsEventFindMany = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    lead: {
      findUnique: (...a: unknown[]) => mockLeadFindUnique(...a),
      count:      (...a: unknown[]) => mockLeadCount(...a),
      groupBy:    (...a: unknown[]) => mockLeadGroupBy(...a),
      aggregate:  (...a: unknown[]) => mockLeadAggregate(...a),
      findMany:   (...a: unknown[]) => mockLeadFindMany(...a),
    },
    booking: {
      count:    (...a: unknown[]) => mockBookingCount(...a),
      groupBy:  (...a: unknown[]) => mockBookingGroupBy(...a),
      findMany: (...a: unknown[]) => mockBookingFindMany(...a),
    },
    artist: {
      findMany: (...a: unknown[]) => mockArtistFindMany(...a),
    },
    service: {
      findMany: (...a: unknown[]) => mockServiceFindMany(...a),
    },
    invoice: {
      findMany: (...a: unknown[]) => mockInvoiceFindMany(...a),
    },
    waitlistEntry: {
      count: (...a: unknown[]) => mockWaitlistEntryCount(...a),
    },
    analyticsEvent: {
      create:   (...a: unknown[]) => mockAnalyticsEventCreate(...a),
      count:    (...a: unknown[]) => mockAnalyticsEventCount(...a),
      findMany: (...a: unknown[]) => mockAnalyticsEventFindMany(...a),
    },
  },
}));

// ─── Import service under test ────────────────────────────────────────────────

import {
  trackEvent,
  getOverview,
  getLeadsAnalytics,
  getBookingsAnalytics,
  getRevenueAnalytics,
  listEvents,
} from './analytics.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBookingStatusRows(map: Record<string, number>) {
  return Object.entries(map).map(([status, count]) => ({
    status,
    _count: { _all: count },
  }));
}

function makeGroupByRows<K extends string>(
  field: K,
  entries: Array<[string | null, number]>,
): Array<Record<K, string | null> & { _count: { _all: number } }> {
  return entries.map(([val, count]) => ({
    [field]: val,
    _count: { _all: count },
  } as Record<K, string | null> & { _count: { _all: number } }));
}

// ─── Reset mocks between tests ────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockAnalyticsEventCreate.mockResolvedValue({ id: 'evt_1' });
  mockArtistFindMany.mockResolvedValue([]);
  mockServiceFindMany.mockResolvedValue([]);
});

// ─── trackEvent ───────────────────────────────────────────────────────────────

describe('trackEvent', () => {
  it('records event with all fields when leadId resolves', async () => {
    mockLeadFindUnique.mockResolvedValue({ id: 'lead_1' });
    mockAnalyticsEventCreate.mockResolvedValue({ id: 'evt_1' });

    const result = await trackEvent(
      {
        eventType:   'page_view',
        leadId:      'lead_1',
        sessionId:   'sess_abc',
        payload:     { page: '/home' },
        referrer:    'https://google.com',
        utmSource:   'google',
        utmMedium:   'cpc',
        utmCampaign: 'summer',
      },
      '1.2.3.4',
      'Mozilla/5.0',
    );

    expect(result).toEqual({ recorded: true });
    expect(mockAnalyticsEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType:   'PAGE_VIEW',
          leadId:      'lead_1',
          ipAddress:   '1.2.3.4',
          userAgent:   'Mozilla/5.0',
          utmSource:   'google',
          utmCampaign: 'summer',
        }),
      }),
    );
  });

  it('drops leadId and still persists event when lead does not exist', async () => {
    mockLeadFindUnique.mockResolvedValue(null);
    mockAnalyticsEventCreate.mockResolvedValue({ id: 'evt_2' });

    const result = await trackEvent({ eventType: 'FORM_START', leadId: 'non_existent_id' });

    expect(result).toEqual({ recorded: true });
    const createCall = mockAnalyticsEventCreate.mock.calls[0][0] as { data: { leadId: string | null } };
    expect(createCall.data.leadId).toBeNull();
  });

  it('records event without optional fields', async () => {
    const result = await trackEvent({ eventType: 'button_click' });
    expect(result).toEqual({ recorded: true });
    expect(mockLeadFindUnique).not.toHaveBeenCalled();
    const createCall = mockAnalyticsEventCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createCall.data.ipAddress).toBeNull();
    expect(createCall.data.sessionId).toBeNull();
  });

  it('normalises eventType to SCREAMING_SNAKE_CASE', async () => {
    await trackEvent({ eventType: 'form submit' });
    const createCall = mockAnalyticsEventCreate.mock.calls[0][0] as { data: { eventType: string } };
    expect(createCall.data.eventType).toBe('FORM_SUBMIT');
  });

  it('already-uppercase eventType is preserved', async () => {
    await trackEvent({ eventType: 'PAGE_VIEW' });
    const createCall = mockAnalyticsEventCreate.mock.calls[0][0] as { data: { eventType: string } };
    expect(createCall.data.eventType).toBe('PAGE_VIEW');
  });
});

// ─── getOverview ──────────────────────────────────────────────────────────────

describe('getOverview', () => {
  function setupOverviewMocks(overrides: {
    totalLeads?: number;
    newLeadsToday?: number;
    totalBookings?: number;
    bookingsToday?: number;
    bookingStatuses?: Record<string, number>;
    invoices?: Array<{ amount: string; status: string; currency: string }>;
    waitlistActive?: number;
    waitlistNotified?: number;
    whatsappEvents?: number;
  } = {}) {
    const {
      totalLeads    = 50,
      newLeadsToday = 3,
      totalBookings = 20,
      bookingsToday = 2,
      bookingStatuses = { CONFIRMED: 10, COMPLETED: 8, CANCELLED: 2 },
      invoices = [
        { amount: '100.00', status: 'PAID',    currency: 'GBP' },
        { amount: '50.00',  status: 'UNPAID',  currency: 'GBP' },
        { amount: '25.00',  status: 'OVERDUE', currency: 'GBP' },
      ],
      waitlistActive   = 5,
      waitlistNotified = 2,
      whatsappEvents   = 15,
    } = overrides;

    // mockBookingCount is called twice (total + today)
    mockBookingCount
      .mockResolvedValueOnce(totalBookings)
      .mockResolvedValueOnce(bookingsToday);
    mockLeadCount
      .mockResolvedValueOnce(totalLeads)
      .mockResolvedValueOnce(newLeadsToday);
    mockBookingGroupBy.mockResolvedValue(makeBookingStatusRows(bookingStatuses));
    mockInvoiceFindMany.mockResolvedValue(invoices);
    mockWaitlistEntryCount
      .mockResolvedValueOnce(waitlistActive)
      .mockResolvedValueOnce(waitlistNotified);
    mockAnalyticsEventCount.mockResolvedValue(whatsappEvents);
  }

  it('returns correct structure with all fields', async () => {
    setupOverviewMocks();
    const result = await getOverview({});

    expect(result).toMatchObject({
      period:   { from: expect.any(String), to: expect.any(String) },
      leads:    { total: 50, today: 3, conversionRate: expect.any(Number) },
      bookings: { total: 20, today: 2, confirmed: 10, completed: 8, cancelled: 2, pending: 0, noShow: 0 },
      revenue:  { totalPaid: 100, outstanding: 50, overdue: 25, currency: 'GBP' },
      waitlist: { active: 5, notified: 2 },
      whatsapp: { messagesSent: 15 },
    });
  });

  it('computes conversionRate correctly', async () => {
    setupOverviewMocks({ totalLeads: 100, totalBookings: 33 });
    const result = await getOverview({});
    expect(result.leads.conversionRate).toBe(33);
  });

  it('conversionRate is 0 when totalLeads is 0', async () => {
    setupOverviewMocks({ totalLeads: 0, totalBookings: 0 });
    const result = await getOverview({});
    expect(result.leads.conversionRate).toBe(0);
  });

  it('defaults missing booking statuses to 0', async () => {
    setupOverviewMocks({ bookingStatuses: { COMPLETED: 5 } });
    const result = await getOverview({});
    expect(result.bookings.pending).toBe(0);
    expect(result.bookings.confirmed).toBe(0);
    expect(result.bookings.cancelled).toBe(0);
    expect(result.bookings.noShow).toBe(0);
    expect(result.bookings.completed).toBe(5);
  });

  it('rounds revenue to 2 decimal places', async () => {
    setupOverviewMocks({
      invoices: [
        { amount: '33.333', status: 'PAID',   currency: 'USD' },
        { amount: '10.006', status: 'UNPAID', currency: 'USD' },
      ],
    });
    const result = await getOverview({});
    expect(result.revenue.totalPaid).toBe(33.33);
    expect(result.revenue.outstanding).toBe(10.01);
  });

  it('period.from and period.to are ISO strings', async () => {
    setupOverviewMocks();
    const result = await getOverview({ from: '2024-01-01', to: '2024-01-31' });
    expect(new Date(result.period.from).toISOString()).toBe(result.period.from);
    expect(new Date(result.period.to).toISOString()).toBe(result.period.to);
  });
});

// ─── getLeadsAnalytics ────────────────────────────────────────────────────────

describe('getLeadsAnalytics', () => {
  function setupLeadsMocks(overrides: {
    total?: number;
    statusMap?: Record<string, number>;
    scores?: number[];
  } = {}) {
    const {
      total     = 30,
      statusMap = { NEW: 10, CONTACTED: 8, QUOTED: 5, BOOKED: 4, COMPLETED: 3 },
      scores    = [10, 25, 55, 75, 90],
    } = overrides;

    mockLeadCount.mockResolvedValue(total);
    mockLeadGroupBy
      .mockResolvedValueOnce(makeBookingStatusRows(statusMap) as never) // byStatus
      .mockResolvedValueOnce(makeGroupByRows('utmSource',  [['google', 15], [null, 10]]))
      .mockResolvedValueOnce(makeGroupByRows('country',    [['GB', 20], [null, 5]]))
      .mockResolvedValueOnce(makeGroupByRows('deviceType', [['mobile', 18], ['desktop', 12]]));
    mockLeadAggregate.mockResolvedValue({
      _avg: { score: 55.0 },
      _min: { score: 10 },
      _max: { score: 90 },
    });
    mockLeadFindMany.mockResolvedValue(scores.map((score) => ({ score })));
  }

  it('returns funnel in correct pipeline order', async () => {
    setupLeadsMocks();
    const result = await getLeadsAnalytics({});
    const statuses = result.funnel.map((f) => f.status);
    expect(statuses).toEqual(['NEW', 'CONTACTED', 'QUOTED', 'BOOKED', 'COMPLETED', 'CANCELLED', 'LOST']);
  });

  it('maps (direct) for null utmSource', async () => {
    setupLeadsMocks();
    const result = await getLeadsAnalytics({});
    const direct = result.bySource.find((s) => s.source === '(direct)');
    expect(direct).toBeDefined();
    expect(direct!.count).toBe(10);
  });

  it('maps (unknown) for null country', async () => {
    setupLeadsMocks();
    const result = await getLeadsAnalytics({});
    const unknown = result.byCountry.find((c) => c.country === '(unknown)');
    expect(unknown).toBeDefined();
  });

  it('maps (unknown) for null deviceType', async () => {
    // Set up all mocks from scratch (not via setupLeadsMocks) so that only
    // null deviceType rows are returned and the assertion is unambiguous.
    mockLeadCount.mockResolvedValue(0);
    mockLeadGroupBy
      .mockResolvedValueOnce([])  // byStatus
      .mockResolvedValueOnce([])  // bySource
      .mockResolvedValueOnce([])  // byCountry
      .mockResolvedValueOnce(makeGroupByRows('deviceType', [[null, 7]]));
    mockLeadAggregate.mockResolvedValue({ _avg: { score: 0 }, _min: { score: 0 }, _max: { score: 0 } });
    mockLeadFindMany.mockResolvedValue([]);

    const result = await getLeadsAnalytics({});
    const unknown = result.byDevice.find((d) => d.deviceType === '(unknown)');
    expect(unknown?.count).toBe(7);
  });

  it('computes score distribution bands correctly', async () => {
    setupLeadsMocks({ scores: [5, 15, 30, 45, 65, 78, 95] });
    const result = await getLeadsAnalytics({});
    const dist = result.score.distribution;
    expect(dist.find((d) => d.range === '0–20')!.count).toBe(2);   // 5, 15
    expect(dist.find((d) => d.range === '21–40')!.count).toBe(1);  // 30
    expect(dist.find((d) => d.range === '41–60')!.count).toBe(1);  // 45
    expect(dist.find((d) => d.range === '61–80')!.count).toBe(2);  // 65, 78
    expect(dist.find((d) => d.range === '81–100')!.count).toBe(1); // 95
  });

  it('score.average rounded to 1 decimal place', async () => {
    setupLeadsMocks();
    mockLeadAggregate.mockResolvedValue({ _avg: { score: 66.666 }, _min: { score: 0 }, _max: { score: 100 } });
    const result = await getLeadsAnalytics({});
    expect(result.score.average).toBe(66.7);
  });

  it('passes artistId filter when provided', async () => {
    setupLeadsMocks();
    await getLeadsAnalytics({ artistId: 'artist_123' });
    const countCall = mockLeadCount.mock.calls[0][0] as { where: { artistId?: string } };
    expect(countCall.where.artistId).toBe('artist_123');
  });

  it('passes businessType filter when provided', async () => {
    setupLeadsMocks();
    await getLeadsAnalytics({ businessType: 'tattoo_studio' });
    const countCall = mockLeadCount.mock.calls[0][0] as { where: { businessType?: string } };
    expect(countCall.where.businessType).toBe('tattoo_studio');
  });
});

// ─── getBookingsAnalytics ─────────────────────────────────────────────────────

describe('getBookingsAnalytics', () => {
  function setupBookingsMocks(overrides: {
    total?: number;
    statusMap?: Record<string, number>;
    bookingsList?: Array<{ startAt: Date; totalDurationMinutes: number | null }>;
    artists?: Array<{ id: string; user: { name: string } }>;
    services?: Array<{ id: string; name: string }>;
  } = {}) {
    const {
      total       = 40,
      statusMap   = { CONFIRMED: 20, COMPLETED: 15, CANCELLED: 3, NO_SHOW: 2 },
      bookingsList = [
        { startAt: new Date('2024-06-03T09:00:00Z'), totalDurationMinutes: 90 }, // Monday
        { startAt: new Date('2024-06-03T11:00:00Z'), totalDurationMinutes: 120 },
        { startAt: new Date('2024-06-04T10:00:00Z'), totalDurationMinutes: null }, // Tuesday
      ],
      artists  = [{ id: 'artist_1', user: { name: 'Alex Ink' } }],
      services = [{ id: 'service_1', name: 'Full Sleeve' }],
    } = overrides;

    mockBookingCount.mockResolvedValue(total);
    mockBookingGroupBy
      .mockResolvedValueOnce(makeBookingStatusRows(statusMap))
      .mockResolvedValueOnce([{ artistId: 'artist_1', _count: { _all: 25 } }])
      .mockResolvedValueOnce([{ serviceId: 'service_1', _count: { _all: 18 } }]);
    mockBookingFindMany.mockResolvedValue(bookingsList);
    mockArtistFindMany.mockResolvedValue(artists);
    mockServiceFindMany.mockResolvedValue(services);
  }

  it('returns all seven day-of-week entries', async () => {
    setupBookingsMocks();
    const result = await getBookingsAnalytics({});
    expect(result.byDayOfWeek).toHaveLength(7);
    const days = result.byDayOfWeek.map((d) => d.day);
    expect(days).toContain('Monday');
    expect(days).toContain('Sunday');
    expect(days).toContain('Saturday');
  });

  it('computes averageDurationMinutes from bookingsList', async () => {
    setupBookingsMocks({
      bookingsList: [
        { startAt: new Date(), totalDurationMinutes: 60 },
        { startAt: new Date(), totalDurationMinutes: 120 },
        { startAt: new Date(), totalDurationMinutes: 90 },
      ],
    });
    const result = await getBookingsAnalytics({});
    expect(result.averageDurationMinutes).toBe(90);
  });

  it('averageDurationMinutes is 0 when no duration data', async () => {
    setupBookingsMocks({
      bookingsList: [
        { startAt: new Date(), totalDurationMinutes: null },
        { startAt: new Date(), totalDurationMinutes: null },
      ],
    });
    const result = await getBookingsAnalytics({});
    expect(result.averageDurationMinutes).toBe(0);
  });

  it('noShowRate computed correctly (1 d.p.)', async () => {
    setupBookingsMocks({ total: 40, statusMap: { NO_SHOW: 4, COMPLETED: 36 } });
    const result = await getBookingsAnalytics({});
    expect(result.noShowRate).toBe(10);
  });

  it('cancellationRate computed correctly (1 d.p.)', async () => {
    setupBookingsMocks({ total: 200, statusMap: { CANCELLED: 30, COMPLETED: 170 } });
    const result = await getBookingsAnalytics({});
    expect(result.cancellationRate).toBe(15);
  });

  it('rates are 0 when total is 0', async () => {
    setupBookingsMocks({ total: 0, statusMap: {} });
    const result = await getBookingsAnalytics({});
    expect(result.noShowRate).toBe(0);
    expect(result.cancellationRate).toBe(0);
  });

  it('resolves artist name from separate lookup', async () => {
    setupBookingsMocks();
    const result = await getBookingsAnalytics({});
    const artistRow = result.byArtist.find((a) => a.artistId === 'artist_1');
    expect(artistRow?.artistName).toBe('Alex Ink');
  });

  it('resolves service name from separate lookup', async () => {
    setupBookingsMocks();
    const result = await getBookingsAnalytics({});
    const serviceRow = result.byService.find((s) => s.serviceId === 'service_1');
    expect(serviceRow?.serviceName).toBe('Full Sleeve');
  });

  it('uses (unknown) when service name cannot be resolved', async () => {
    setupBookingsMocks();
    mockServiceFindMany.mockResolvedValue([]); // override — no services found
    const result = await getBookingsAnalytics({});
    const serviceRow = result.byService[0];
    expect(serviceRow?.serviceName).toBe('(unknown)');
  });
});

// ─── getRevenueAnalytics ──────────────────────────────────────────────────────

describe('getRevenueAnalytics', () => {
  it('returns correct summary totals', async () => {
    mockInvoiceFindMany.mockResolvedValue([
      { amount: '200.00', status: 'PAID',    currency: 'GBP', createdAt: new Date('2024-03-01'), booking: { service: null, services: [] } },
      { amount: '50.00',  status: 'UNPAID',  currency: 'GBP', createdAt: new Date('2024-03-15'), booking: { service: null, services: [] } },
      { amount: '30.00',  status: 'OVERDUE', currency: 'GBP', createdAt: new Date('2024-03-20'), booking: { service: null, services: [] } },
      { amount: '10.00',  status: 'VOID',    currency: 'GBP', createdAt: new Date('2024-03-25'), booking: { service: null, services: [] } },
    ]);

    const result = await getRevenueAnalytics({});
    expect(result.summary.totalPaid).toBe(200);
    expect(result.summary.outstanding).toBe(50);
    expect(result.summary.overdue).toBe(30);
    expect(result.summary.voided).toBe(10);
    expect(result.summary.totalInvoiced).toBe(280); // paid + unpaid + overdue
    expect(result.summary.currency).toBe('GBP');
  });

  it('builds monthly trend sorted chronologically', async () => {
    mockInvoiceFindMany.mockResolvedValue([
      { amount: '100.00', status: 'PAID', currency: 'GBP', createdAt: new Date('2024-02-10'), booking: { service: null, services: [] } },
      { amount: '150.00', status: 'PAID', currency: 'GBP', createdAt: new Date('2024-01-15'), booking: { service: null, services: [] } },
    ]);

    const result = await getRevenueAnalytics({});
    expect(result.byMonth[0].month).toBe('2024-01');
    expect(result.byMonth[1].month).toBe('2024-02');
  });

  it('attributes revenue via BookingService lines when present', async () => {
    mockInvoiceFindMany.mockResolvedValue([
      {
        amount: '300.00', status: 'PAID', currency: 'GBP',
        createdAt: new Date('2024-03-01'),
        booking: {
          service: null,
          services: [
            { price: '200.00', service: { name: 'Full Sleeve' } },
            { price: '100.00', service: { name: 'Touch-up' } },
          ],
        },
      },
    ]);

    const result = await getRevenueAnalytics({});
    const sleeve = result.topServices.find((s) => s.serviceName === 'Full Sleeve');
    const touchup = result.topServices.find((s) => s.serviceName === 'Touch-up');
    expect(sleeve?.revenue).toBe(200);
    expect(touchup?.revenue).toBe(100);
  });

  it('falls back to booking.service when no BookingService lines', async () => {
    mockInvoiceFindMany.mockResolvedValue([
      {
        amount: '250.00', status: 'PAID', currency: 'GBP',
        createdAt: new Date('2024-03-01'),
        booking: {
          service: { name: 'Half Sleeve' },
          services: [],
        },
      },
    ]);

    const result = await getRevenueAnalytics({});
    const svc = result.topServices.find((s) => s.serviceName === 'Half Sleeve');
    expect(svc?.revenue).toBe(250);
  });

  it('averageInvoiceValue is 0 when there are no invoices', async () => {
    mockInvoiceFindMany.mockResolvedValue([]);
    const result = await getRevenueAnalytics({});
    expect(result.averageInvoiceValue).toBe(0);
    expect(result.byMonth).toEqual([]);
    expect(result.topServices).toEqual([]);
  });

  it('topServices is limited to 10 entries', async () => {
    // 12 invoices, each for a distinct service — result must be capped at 10
    mockInvoiceFindMany.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({
        amount:    `${(i + 1) * 10}.00`,
        status:    'PAID',
        currency:  'GBP',
        createdAt: new Date('2024-03-01'),
        booking:   { service: { name: `Service ${String(i + 1).padStart(2, '0')}` }, services: [] },
      })),
    );

    const result = await getRevenueAnalytics({});
    expect(result.topServices).toHaveLength(10);
  });

  it('topServices is sorted by revenue descending', async () => {
    mockInvoiceFindMany.mockResolvedValue([
      { amount: '50.00',  status: 'PAID', currency: 'GBP', createdAt: new Date('2024-03-01'), booking: { service: { name: 'Small' }, services: [] } },
      { amount: '200.00', status: 'PAID', currency: 'GBP', createdAt: new Date('2024-03-02'), booking: { service: { name: 'Large' }, services: [] } },
      { amount: '100.00', status: 'PAID', currency: 'GBP', createdAt: new Date('2024-03-03'), booking: { service: { name: 'Medium' }, services: [] } },
    ]);

    const result = await getRevenueAnalytics({});
    expect(result.topServices[0].serviceName).toBe('Large');
    expect(result.topServices[1].serviceName).toBe('Medium');
    expect(result.topServices[2].serviceName).toBe('Small');
  });
});

// ─── listEvents ───────────────────────────────────────────────────────────────

describe('listEvents', () => {
  beforeEach(() => {
    // paginate uses count + findMany internally
    mockAnalyticsEventCount.mockResolvedValue(5);
    mockAnalyticsEventFindMany.mockResolvedValue([
      { id: 'evt_1', eventType: 'PAGE_VIEW', createdAt: new Date() },
    ]);
  });

  it('returns paginated result', async () => {
    const result = await listEvents({ page: 1, limit: 20 });
    expect(result).toMatchObject({
      data: expect.any(Array),
      meta: { total: 5, page: 1, limit: 20, totalPages: 1 },
    });
  });

  it('applies eventType filter in uppercase / case-insensitive mode', async () => {
    await listEvents({ page: 1, limit: 20, eventType: 'page_view' });
    // paginate delegates count call with the where clause
    const countCall = mockAnalyticsEventCount.mock.calls[0][0] as { where: { eventType?: unknown } };
    expect(countCall.where.eventType).toEqual({ equals: 'PAGE_VIEW', mode: 'insensitive' });
  });

  it('applies leadId filter', async () => {
    await listEvents({ page: 1, limit: 20, leadId: 'lead_abc' });
    const countCall = mockAnalyticsEventCount.mock.calls[0][0] as { where: { leadId?: string } };
    expect(countCall.where.leadId).toBe('lead_abc');
  });

  it('passes page and limit to paginate', async () => {
    await listEvents({ page: 3, limit: 10 });
    const findManyCall = mockAnalyticsEventFindMany.mock.calls[0][0] as { skip: number; take: number };
    expect(findManyCall.skip).toBe(20); // (page 3 - 1) * 10
    expect(findManyCall.take).toBe(10);
  });
});
