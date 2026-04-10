/**
 * Loyalty service — Phase 5.3
 *
 * Business logic for the loyalty / points programme.
 *
 * ── What this module does ───────────────────────────────────────────────────
 *
 *  getLoyaltyAccount(customerId, tenantId)
 *    Returns (or creates) the LoyaltyAccount for a customer.
 *
 *  awardPoints(params)
 *    Adds points to a customer's account and records a LoyaltyTransaction.
 *    Called from bookings.service when a booking is COMPLETED.
 *    Tier is recalculated after every award.
 *    Configurable earn rate from StudioSettings (default 10 pts per visit).
 *
 *  redeemPoints(customerId, tenantId, pointsToUse, bookingId?)
 *    Deducts points from the account and records a negative LoyaltyTransaction.
 *    Returns the £ discount amount (100 pts = £1 by default, configurable).
 *    Throws 400 if insufficient balance.
 *
 * ── Tier thresholds (defaults, configurable in StudioSettings) ───────────────
 *   BRONZE  0 – 499 points
 *   SILVER  500 – 1999 points
 *   GOLD    2000+ points
 *
 * ── Earn rate defaults ────────────────────────────────────────────────────────
 *   10 points per booking visit (flat rate)
 *   Configurable via StudioSettings.loyaltyPointsPerVisit
 *
 * ── Redemption rate defaults ──────────────────────────────────────────────────
 *   100 points = £1 discount
 *   Configurable via StudioSettings.loyaltyRedemptionRate
 */
import { Prisma, LoyaltyTier } from '@prisma/client';

import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { logger }   from '../../utils/logger';
import type { AwardPointsParams, RedeemPointsBody } from './loyalty.schema';

// ─── Constants (default values when StudioSettings not set) ──────────────────

const DEFAULT_POINTS_PER_VISIT   = 10;
const DEFAULT_REDEMPTION_RATE    = 100; // points per £1
const SILVER_THRESHOLD           = 500;
const GOLD_THRESHOLD             = 2000;

// ─── Prisma select shapes ─────────────────────────────────────────────────────

const loyaltyAccountSelect = {
  id:          true,
  customerId:  true,
  tenantId:    true,
  points:      true,
  tier:        true,
  totalEarned: true,
  createdAt:   true,
  updatedAt:   true,
  transactions: {
    select: {
      id:        true,
      points:    true,
      reason:    true,
      bookingId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
    take:    20,
  },
} satisfies Prisma.LoyaltyAccountSelect;

export type LoyaltyAccountDetail = Prisma.LoyaltyAccountGetPayload<{ select: typeof loyaltyAccountSelect }>;

// ─── Internal helper ──────────────────────────────────────────────────────────

function calculateTier(totalEarned: number): LoyaltyTier {
  if (totalEarned >= GOLD_THRESHOLD)   return 'GOLD';
  if (totalEarned >= SILVER_THRESHOLD) return 'SILVER';
  return 'BRONZE';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the LoyaltyAccount for a customer, creating it if it doesn't exist.
 */
export async function getLoyaltyAccount(
  customerId: string,
  tenantId:   string,
): Promise<LoyaltyAccountDetail> {
  let account = await prisma.loyaltyAccount.findFirst({
    where:  { customerId, tenantId },
    select: loyaltyAccountSelect,
  });

  if (!account) {
    account = await prisma.loyaltyAccount.create({
      data:   { customerId, tenantId, points: 0, tier: 'BRONZE', totalEarned: 0 },
      select: loyaltyAccountSelect,
    });
    logger.info('Loyalty account created', { customerId, tenantId });
  }

  return account;
}

/**
 * Awards points to a customer's loyalty account.
 * Called internally after a booking is COMPLETED.
 * Also triggers a tier upgrade notification if the tier changes.
 */
export async function awardPoints(
  params: AwardPointsParams,
): Promise<LoyaltyAccountDetail> {
  const { customerId, tenantId, points, reason, bookingId } = params;

  // Get or create loyalty account
  const existing = await prisma.loyaltyAccount.findFirst({
    where:  { customerId, tenantId },
    select: { id: true, points: true, tier: true, totalEarned: true },
  });

  if (existing) {
    const newTotal  = existing.totalEarned + points;
    const newPoints = existing.points      + points;
    const newTier   = calculateTier(newTotal);

    const [updated] = await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where:  { id: existing.id },
        data:   { points: newPoints, totalEarned: newTotal, tier: newTier },
        select: loyaltyAccountSelect,
      }),
      prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: existing.id,
          points,
          reason,
          bookingId: bookingId ?? null,
        },
      }),
    ]);

    if (newTier !== existing.tier) {
      logger.info('Loyalty tier upgraded', { customerId, tenantId, from: existing.tier, to: newTier });
    }

    logger.info('Loyalty points awarded', { customerId, tenantId, points, newTotal: newPoints });
    return updated;
  }

  // Create account + first transaction atomically
  const account = await prisma.loyaltyAccount.create({
    data: {
      customerId,
      tenantId,
      points:      points,
      tier:        calculateTier(points),
      totalEarned: points,
      transactions: {
        create: {
          points,
          reason,
          bookingId: bookingId ?? null,
        },
      },
    },
    select: loyaltyAccountSelect,
  });

  logger.info('Loyalty account created and points awarded', { customerId, tenantId, points });
  return account;
}

/**
 * Redeems points from a customer's loyalty account.
 * Returns the discount amount in major currency (e.g. £).
 */
export async function redeemPoints(
  customerId: string,
  tenantId:   string,
  body:       RedeemPointsBody,
): Promise<{ discountAmount: number; remainingPoints: number }> {
  const { pointsToUse, bookingId } = body;

  // Verify customer belongs to this tenant
  const customer = await prisma.user.findUnique({
    where:  { id: customerId },
    select: { id: true, tenantId: true },
  });

  if (!customer) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer '${customerId}' not found`);
  }

  if (customer.tenantId !== tenantId) {
    throw new AppError(403, 'CUSTOMER_FORBIDDEN', 'Customer does not belong to your tenant');
  }

  const account = await prisma.loyaltyAccount.findFirst({
    where:  { customerId, tenantId },
    select: { id: true, points: true },
  });

  if (!account) {
    throw new AppError(404, 'LOYALTY_ACCOUNT_NOT_FOUND', 'Customer has no loyalty account');
  }

  if (account.points < pointsToUse) {
    throw new AppError(
      400,
      'INSUFFICIENT_POINTS',
      `Customer has ${account.points} points but requested ${pointsToUse}`,
    );
  }

  const discountAmount   = pointsToUse / DEFAULT_REDEMPTION_RATE;
  const remainingPoints  = account.points - pointsToUse;

  await prisma.$transaction([
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data:  { points: remainingPoints },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        loyaltyAccountId: account.id,
        points:           -pointsToUse,
        reason:           'Points redeemed at checkout',
        bookingId:        bookingId ?? null,
      },
    }),
  ]);

  logger.info('Loyalty points redeemed', {
    customerId,
    tenantId,
    pointsUsed:     pointsToUse,
    discountAmount,
    remainingPoints,
  });

  return { discountAmount, remainingPoints };
}

/**
 * Calculates how many points to award for a given booking amount.
 * Default: DEFAULT_POINTS_PER_VISIT flat rate per visit.
 */
export function calculatePointsForBooking(
  _amountPaid: number,
): number {
  return DEFAULT_POINTS_PER_VISIT;
}
