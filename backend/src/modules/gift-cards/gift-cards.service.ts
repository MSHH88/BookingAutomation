/**
 * Gift Cards service — Phase 4.2
 *
 * Business logic for the gift card system.
 *
 * ─── What this module does ───────────────────────────────────────────────────
 *
 *   createGiftCard(tenantId, data)
 *     Issues a new gift card with a unique 12-char code.
 *
 *   listGiftCards(tenantId, query)
 *     Paginated list of gift cards for a tenant.
 *
 *   getGiftCardByCode(code, tenantId?)
 *     Look up a gift card by code.  When tenantId is provided the card must
 *     belong to that tenant; omit for the public balance-check endpoint.
 *
 *   redeemGiftCard(code, tenantId, amount)
 *     Deducts the requested amount from a gift card's balance.
 *     Supports partial use (balance stays on card until exhausted).
 */
import crypto from 'crypto';

import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import type { CreateGiftCardBody, ListGiftCardsQuery } from './gift-cards.schema';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Length of the generated gift card code (alphanumeric). */
const CODE_LENGTH_BYTES = 6; // 6 random bytes → 12 hex chars

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * POST /api/gift-cards
 * Creates (issues) a new gift card with a cryptographically-random code.
 */
export async function createGiftCard(tenantId: string, data: CreateGiftCardBody) {
  const code = generateCode();

  const card = await prisma.giftCard.create({
    data: {
      tenantId,
      code,
      originalValue:  data.originalValue,
      currentBalance: data.originalValue,
      issuedTo:       data.issuedTo ?? null,
      purchasedById:  data.purchasedById ?? null,
      expiresAt:      data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  return card;
}

/**
 * GET /api/gift-cards
 * Paginated list of gift cards for a tenant.
 */
export async function listGiftCards(tenantId: string, query: ListGiftCardsQuery) {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const [giftCards, total] = await Promise.all([
    prisma.giftCard.findMany({
      where:   { tenantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take:    limit,
    }),
    prisma.giftCard.count({ where: { tenantId } }),
  ]);

  return { giftCards, total, page, limit };
}

/**
 * GET /api/gift-cards/:code
 * Look up a gift card by code. Returns balance and expiry info.
 * When tenantId is provided, verifies the card belongs to that tenant.
 */
export async function getGiftCardByCode(code: string, tenantId?: string) {
  const card = await prisma.giftCard.findUnique({ where: { code } });

  if (!card) {
    throw new AppError(404, 'GIFT_CARD_NOT_FOUND', 'Gift card not found');
  }

  if (tenantId !== undefined && card.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this gift card');
  }

  if (card.expiresAt && card.expiresAt < new Date()) {
    throw new AppError(410, 'GIFT_CARD_EXPIRED', 'This gift card has expired');
  }

  return {
    code:           card.code,
    currentBalance: card.currentBalance,
    originalValue:  card.originalValue,
    issuedTo:       card.issuedTo,
    expiresAt:      card.expiresAt,
    isRedeemed:     card.isRedeemed,
  };
}

/**
 * POST /api/gift-cards/:code/redeem
 * Deducts the requested amount from the gift card balance.
 * Partial redemption is supported — remaining balance stays on the card.
 * Marks the card as fully redeemed when balance reaches zero.
 */
export async function redeemGiftCard(code: string, tenantId: string, amount: number) {
  const card = await prisma.giftCard.findUnique({ where: { code } });

  if (!card) {
    throw new AppError(404, 'GIFT_CARD_NOT_FOUND', 'Gift card not found');
  }

  if (card.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this gift card');
  }

  if (card.isRedeemed) {
    throw new AppError(409, 'GIFT_CARD_FULLY_REDEEMED', 'This gift card has been fully redeemed');
  }

  if (card.expiresAt && card.expiresAt < new Date()) {
    throw new AppError(410, 'GIFT_CARD_EXPIRED', 'This gift card has expired');
  }

  const currentBalance = Number(card.currentBalance);

  if (amount > currentBalance) {
    throw new AppError(
      400,
      'INSUFFICIENT_BALANCE',
      `Redemption amount (${amount}) exceeds gift card balance (${currentBalance})`,
    );
  }

  const newBalance  = currentBalance - amount;
  const isNowRedeemed = newBalance === 0;

  const updated = await prisma.giftCard.update({
    where: { code },
    data:  {
      currentBalance: newBalance,
      isRedeemed:     isNowRedeemed,
    },
  });

  return {
    code:           updated.code,
    amountRedeemed: amount,
    newBalance:     Number(updated.currentBalance),
    isRedeemed:     updated.isRedeemed,
  };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Generates a unique 12-character uppercase hex gift card code. */
function generateCode(): string {
  return crypto.randomBytes(CODE_LENGTH_BYTES).toString('hex').toUpperCase();
}
