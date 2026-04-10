/**
 * Referral tracking service — Phase 3.5
 *
 * Business logic for the referral/affiliate tracking system.
 *
 * ─── What this module does ───────────────────────────────────────────────────
 *
 *   listReferrals(tenantId, query)
 *     Paginated list of referrals for a tenant.
 *
 *   getReferralById(id, tenantId)
 *     Get a single referral, verifying tenant access.
 *
 *   generateReferralCode(userId)
 *     Generate or return existing referral code for a user.
 *
 *   lookupReferralCode(code)
 *     Public lookup — returns referrer name only (no sensitive data).
 *
 *   linkReferral(tenantId, data)
 *     Create a referral link between referrer and referee.
 *
 *   processReward(id, tenantId, rewardAmount)
 *     Mark referral as rewarded, credit referrer's loyaltyBalance.
 */
import crypto from 'crypto';

import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import type { ListReferralsQuery, LinkReferralBody } from './referrals.schema';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/referrals
 * Paginated list of referrals for a tenant.
 */
export async function listReferrals(tenantId: string, query: ListReferralsQuery) {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const [referrals, total] = await Promise.all([
    prisma.referral.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.referral.count({ where: { tenantId } }),
  ]);

  return { referrals, total, page, limit };
}

/**
 * GET /api/referrals/:id
 * Get referral details, verifying tenant access.
 */
export async function getReferralById(id: string, tenantId: string) {
  const referral = await prisma.referral.findUnique({ where: { id } });

  if (!referral) {
    throw new AppError(404, 'REFERRAL_NOT_FOUND', 'Referral not found');
  }

  if (referral.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this referral');
  }

  return referral;
}

/**
 * POST /api/referrals/generate-code
 * Generate or return existing referral code for a user.
 */
export async function generateReferralCode(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referralCode: true },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  if (user.referralCode) {
    return { referralCode: user.referralCode };
  }

  const code = `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: code },
  });

  return { referralCode: code };
}

/**
 * GET /api/referrals/lookup/:code
 * Public: look up referrer by code. Returns referrer name only.
 */
export async function lookupReferralCode(code: string) {
  const user = await prisma.user.findFirst({
    where: { referralCode: code },
    select: { id: true, name: true },
  });

  if (!user) {
    throw new AppError(404, 'REFERRAL_CODE_NOT_FOUND', 'Referral code not found');
  }

  return { referrerId: user.id, referrerName: user.name };
}

/**
 * POST /api/referrals/link
 * Create a referral link between referrer and referee.
 */
export async function linkReferral(tenantId: string, data: LinkReferralBody) {
  const { referrerCode, refereeId } = data;

  // Look up referrer by code
  const referrer = await prisma.user.findFirst({
    where: { referralCode: referrerCode },
    select: { id: true },
  });

  if (!referrer) {
    throw new AppError(404, 'REFERRER_NOT_FOUND', 'Referrer not found for the given code');
  }

  // Verify referee exists
  const referee = await prisma.user.findUnique({
    where: { id: refereeId },
    select: { id: true },
  });

  if (!referee) {
    throw new AppError(404, 'REFEREE_NOT_FOUND', 'Referee not found');
  }

  // Prevent self-referral
  if (referrer.id === refereeId) {
    throw new AppError(400, 'SELF_REFERRAL', 'A user cannot refer themselves');
  }

  // Check for duplicate referral
  const existing = await prisma.referral.findFirst({
    where: { referrerId: referrer.id, refereeId, tenantId },
  });

  if (existing) {
    throw new AppError(409, 'DUPLICATE_REFERRAL', 'This referral link already exists');
  }

  const referral = await prisma.referral.create({
    data: {
      tenantId,
      referrerId: referrer.id,
      refereeId,
      referralCode: referrerCode,
    },
  });

  return referral;
}

/**
 * POST /api/referrals/:id/process-reward
 * Mark referral as rewarded and credit referrer's loyaltyBalance.
 */
export async function processReward(id: string, tenantId: string, rewardAmount: number) {
  const referral = await prisma.referral.findUnique({ where: { id } });

  if (!referral) {
    throw new AppError(404, 'REFERRAL_NOT_FOUND', 'Referral not found');
  }

  if (referral.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this referral');
  }

  if (referral.rewardIssued) {
    throw new AppError(409, 'REWARD_ALREADY_ISSUED', 'Reward has already been issued for this referral');
  }

  // Convert decimal reward to integer for loyaltyBalance (Int field)
  const loyaltyIncrement = Math.round(rewardAmount);

  const updated = await prisma.referral.update({
    where: { id },
    data: {
      rewardIssued: true,
      rewardAmount,
    },
  });

  // Credit referrer's loyalty balance
  await prisma.user.update({
    where: { id: referral.referrerId },
    data: { loyaltyBalance: { increment: loyaltyIncrement } },
  });

  return updated;
}
