/**
 * Referral tracking controller — Phase 3.5
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';
import { extractTenantId } from '../../utils/extractTenantId';

import * as referralsService from './referrals.service';
import { success }           from '../../utils/apiResponse';
import type { ListReferralsQuery, LinkReferralBody, ProcessRewardBody } from './referrals.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/referrals
 * List all referrals for tenant (paginated).
 */
export async function listReferrals(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const query    = req.query as unknown as ListReferralsQuery;
    const result   = await referralsService.listReferrals(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/referrals/:id
 * Get referral details.
 */
export async function getReferralById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const tenantId = extractTenantId(req);
    const referral = await referralsService.getReferralById(id, tenantId);
    res.json(success(referral));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/referrals/generate-code
 * Generate/get referral code for authenticated user.
 */
export async function generateReferralCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await referralsService.generateReferralCode(userId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/referrals/lookup/:code
 * Public: look up referrer info by referral code.
 */
export async function lookupReferralCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code } = req.params as { code: string };
    const result   = await referralsService.lookupReferralCode(code);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/referrals/link
 * Manually link a referee to a referrer.
 */
export async function linkReferral(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const body     = req.body as LinkReferralBody;
    const referral = await referralsService.linkReferral(tenantId, body);
    res.status(201).json(success(referral));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/referrals/:id/process-reward
 * Process/issue reward for a referral.
 */
export async function processReward(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const tenantId = extractTenantId(req);
    const { rewardAmount } = req.body as ProcessRewardBody;
    const referral = await referralsService.processReward(id, tenantId, rewardAmount);
    res.json(success(referral));
  } catch (err) {
    next(err);
  }
}
