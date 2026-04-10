/**
 * CRM alerts schemas — Phase 2.5
 *
 * Zod validation schemas for the CRM warning & alert system API.
 *
 * Endpoints:
 *   GET /api/alerts/booking/:id    — warnings for a specific booking
 *   GET /api/alerts/customer/:id   — warnings for a customer
 *   GET /api/alerts/dashboard      — global admin alerts
 */
import { z } from 'zod';

// ─── Alert types ──────────────────────────────────────────────────────────────

export const ALERT_TYPES = [
  'HEALTH_FLAG',
  'DEPOSIT_PENDING',
  'OVERDUE_INVOICE',
  'WAITLIST_MATCH',
  'REBOOK_DUE',
  'LOW_STOCK',
  'NO_SHOW_TIMER',
  'CARD_NOT_ON_FILE',
  'SUBSCRIPTION_FAILED',
  'BIRTHDAY_TODAY',
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = ['RED', 'AMBER', 'GREEN'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export interface Alert {
  type:       AlertType;
  severity:   AlertSeverity;
  message:    string;
  entityId:   string | null;
  entityType: string | null;
}

// ─── GET /api/alerts/booking/:id ──────────────────────────────────────────────

export const getBookingAlertsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── GET /api/alerts/customer/:id ─────────────────────────────────────────────

export const getCustomerAlertsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── GET /api/alerts/dashboard ────────────────────────────────────────────────

export const getDashboardAlertsSchema = z.object({
  query: z.object({
    /** Optional severity filter. */
    severity: z.enum(ALERT_SEVERITIES).optional(),
  }),
});

export type GetDashboardAlertsQuery = z.infer<typeof getDashboardAlertsSchema>['query'];
