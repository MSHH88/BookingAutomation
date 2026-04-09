/**
 * Campaigns controller — Phase 1, Step 1.9
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic and DB access lives in campaigns.service.ts.
 */
import { Request, Response, NextFunction } from 'express';

import * as campaignsService from './campaigns.service';
import { success, paginated } from '../../utils/apiResponse';
import type {
  ListCampaignsQuery,
  CreateCampaignBody,
  UpdateCampaignBody,
} from './campaigns.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/campaigns
 * ADMIN only. Paginated list of campaigns for the tenant.
 */
export async function listCampaigns(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const query    = req.query as unknown as ListCampaignsQuery;
    const result   = await campaignsService.listCampaigns(tenantId, query);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/campaigns/:id
 * ADMIN only. Single campaign detail.
 */
export async function getCampaign(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { id }   = req.params as { id: string };
    const record   = await campaignsService.getCampaign(tenantId, id);
    res.json(success(record));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/campaigns
 * ADMIN only. Create a new campaign.
 */
export async function createCampaign(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const body     = req.body as CreateCampaignBody;
    const record   = await campaignsService.createCampaign(tenantId, body);
    res.status(201).json(success(record));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/campaigns/:id
 * ADMIN only. Edit, schedule, or cancel a campaign.
 */
export async function updateCampaign(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { id }   = req.params as { id: string };
    const body     = req.body as UpdateCampaignBody;
    const record   = await campaignsService.updateCampaign(tenantId, id, body);
    res.json(success(record));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/campaigns/:id/stats
 * ADMIN only. Campaign delivery statistics.
 */
export async function getCampaignStats(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { id }   = req.params as { id: string };
    const stats    = await campaignsService.getCampaignStats(tenantId, id);
    res.json(success(stats));
  } catch (err) {
    next(err);
  }
}
