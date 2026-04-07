/**
 * Analytics module — Zod schemas — Step 1.18
 *
 * Validates incoming requests for:
 *  - POST /api/analytics/events   (track a frontend event — public)
 *  - GET  /api/analytics/overview (admin KPI summary)
 *  - GET  /api/analytics/leads    (admin lead funnel + attribution)
 *  - GET  /api/analytics/bookings (admin booking breakdown)
 *  - GET  /api/analytics/revenue  (admin revenue metrics)
 *  - GET  /api/analytics/events   (admin raw event log — paginated)
 */
import { z } from 'zod';

// ─── Track event (public) ─────────────────────────────────────────────────────

export const trackEventSchema = z.object({
  body: z.object({
    /** e.g. "PAGE_VIEW", "FORM_START", "FORM_SUBMIT", "BUTTON_CLICK". */
    eventType: z
      .string()
      .min(1, 'eventType is required')
      .max(64, 'eventType must be 64 characters or fewer'),
    /** Browser / app session identifier — set by the frontend. */
    sessionId: z.string().max(128).optional(),
    /** Optionally links this event to an existing lead. */
    leadId: z.string().cuid().optional(),
    /** Free-form extra data (e.g. page URL, component name). */
    payload: z.record(z.unknown()).optional(),
    /** Referring page URL. */
    referrer: z.string().max(512).optional(),
    utmSource:   z.string().max(128).optional(),
    utmMedium:   z.string().max(128).optional(),
    utmCampaign: z.string().max(128).optional(),
  }),
});

export type TrackEventBody = z.infer<typeof trackEventSchema>['body'];

// ─── Shared date-range (used by all admin query schemas) ──────────────────────

const dateRangeQuery = z.object({
  /**
   * ISO-8601 date string (or date-time with offset).
   * When omitted the service defaults to 30 days ago.
   */
  from: z.string().optional(),
  /** ISO-8601 date string. When omitted the service defaults to now. */
  to: z.string().optional(),
});

// ─── Overview query ───────────────────────────────────────────────────────────

export const overviewQuerySchema = z.object({ query: dateRangeQuery });
export type OverviewQuery = z.infer<typeof overviewQuerySchema>['query'];

// ─── Leads analytics query ────────────────────────────────────────────────────

export const leadsAnalyticsQuerySchema = z.object({
  query: dateRangeQuery.extend({
    artistId:     z.string().cuid().optional(),
    businessType: z.string().max(64).optional(),
  }),
});
export type LeadsAnalyticsQuery = z.infer<typeof leadsAnalyticsQuerySchema>['query'];

// ─── Bookings analytics query ─────────────────────────────────────────────────

export const bookingsAnalyticsQuerySchema = z.object({
  query: dateRangeQuery.extend({
    artistId: z.string().cuid().optional(),
  }),
});
export type BookingsAnalyticsQuery = z.infer<typeof bookingsAnalyticsQuerySchema>['query'];

// ─── Revenue analytics query ──────────────────────────────────────────────────

export const revenueAnalyticsQuerySchema = z.object({ query: dateRangeQuery });
export type RevenueAnalyticsQuery = z.infer<typeof revenueAnalyticsQuerySchema>['query'];

// ─── Events list query (admin raw log) ───────────────────────────────────────

export const eventsListQuerySchema = z.object({
  query: dateRangeQuery.extend({
    eventType: z.string().max(64).optional(),
    leadId:    z.string().cuid().optional(),
    page:      z.coerce.number().int().positive().default(1),
    limit:     z.coerce.number().int().min(1).max(100).default(20),
  }),
});
export type EventsListQuery = z.infer<typeof eventsListQuerySchema>['query'];
