/**
 * Payroll module — Zod validation schemas — Phase 4.6
 *
 * Endpoints:
 *   POST  /api/payroll/generate        — generate payroll report for date range (ADMIN)
 *   GET   /api/payroll/reports         — list payroll reports (ADMIN)
 *   GET   /api/payroll/reports/:id     — get single payroll report (ADMIN)
 *   GET   /api/payroll/my-earnings     — artist self-service earnings view (ARTIST)
 */
import { z } from 'zod';

// ─── POST /api/payroll/generate ───────────────────────────────────────────────

export const generatePayrollSchema = z.object({
  body: z.object({
    /** Optional: restrict to a specific artist. Omit to generate for all artists. */
    artistId:    z.string().optional(),
    /** Period start date (ISO-8601). */
    periodStart: z.string().min(1, 'periodStart is required'),
    /** Period end date (ISO-8601). */
    periodEnd:   z.string().min(1, 'periodEnd is required'),
  }),
});

export type GeneratePayrollBody = z.infer<typeof generatePayrollSchema>['body'];

// ─── GET /api/payroll/reports ─────────────────────────────────────────────────

export const listPayrollReportsSchema = z.object({
  query: z.object({
    page:     z.coerce.number().int().positive().default(1),
    limit:    z.coerce.number().int().min(1).max(100).default(20),
    artistId: z.string().optional(),
  }),
});

export type ListPayrollReportsQuery = z.infer<typeof listPayrollReportsSchema>['query'];

// ─── GET /api/payroll/my-earnings ─────────────────────────────────────────────

export const myEarningsSchema = z.object({
  query: z.object({
    from:  z.string().optional(),
    to:    z.string().optional(),
    page:  z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export type MyEarningsQuery = z.infer<typeof myEarningsSchema>['query'];
