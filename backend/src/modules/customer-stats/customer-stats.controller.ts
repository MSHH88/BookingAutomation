/**
 * Customer LTV / Stats controller — Phase 3.4
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';
import { extractTenantId } from '../../utils/extractTenantId';

import * as statsService from './customer-stats.service';
import { success, paginated } from '../../utils/apiResponse';
import type { ListCustomersWithStatsQuery } from './customer-stats.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/customer-stats/:customerId
 * Returns computed LTV stats for a single customer.
 */
export async function getCustomerStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { customerId } = req.params as { customerId: string };
    const tenantId       = extractTenantId(req);
    const stats          = await statsService.getCustomerStats(customerId, tenantId);
    res.json(success(stats));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/customer-stats
 * Paginated list of customers with stats.
 */
export async function listCustomersWithStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const query    = req.query as unknown as ListCustomersWithStatsQuery;
    const result   = await statsService.listCustomersWithStats(tenantId, query);

    res.json(
      paginated(result.customers, {
        total:      result.total,
        page:       query.page ?? 1,
        limit:      query.limit ?? 20,
        totalPages: Math.ceil(result.total / (query.limit ?? 20)),
      }),
    );
  } catch (err) {
    next(err);
  }
}
