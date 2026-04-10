/**
 * Customer LTV / Stats schemas — Phase 3.4
 *
 * Zod validation schemas for the Customer Stats API.
 *
 * Endpoints:
 *   GET /api/customer-stats/:customerId  — computed stats for a single customer
 *   GET /api/customer-stats              — paginated list of customers with stats
 */
import { z } from 'zod';

// ─── GET /api/customer-stats/:customerId ──────────────────────────────────────

export const getCustomerStatsSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'customerId is required'),
  }),
});

export type GetCustomerStatsParams = z.infer<typeof getCustomerStatsSchema>['params'];

// ─── GET /api/customer-stats ──────────────────────────────────────────────────

export const listCustomersWithStatsSchema = z.object({
  query: z.object({
    page:            z.coerce.number().int().min(1).default(1),
    limit:           z.coerce.number().int().min(1).max(100).default(20),
    sortBy:          z.enum(['ltv', 'visits', 'name']).default('name'),
    minSpend:        z.coerce.number().min(0).optional(),
    lastVisitBefore: z.string().datetime().optional(),
  }),
});

export type ListCustomersWithStatsQuery = z.infer<typeof listCustomersWithStatsSchema>['query'];

// ─── Response types ───────────────────────────────────────────────────────────

export interface CustomerStats {
  totalSpend:        number;
  visitCount:        number;
  lastVisitDate:     string | null;
  firstVisitDate:    string | null;
  averageSpend:      number;
  mostBookedService: string | null;
  mostBookedArtist:  string | null;
}

export interface CustomerWithStats {
  id:        string;
  name:      string;
  email:     string;
  createdAt: string;
  stats:     CustomerStats;
}
