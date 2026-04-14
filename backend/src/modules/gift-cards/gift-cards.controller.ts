/**
 * Gift Cards controller — Phase 4.2
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';
import { extractTenantId } from '../../utils/extractTenantId';

import * as giftCardsService from './gift-cards.service';
import { success }           from '../../utils/apiResponse';
import type { CreateGiftCardBody, ListGiftCardsQuery, RedeemGiftCardBody } from './gift-cards.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/gift-cards
 * Create and sell a new gift card.
 */
export async function createGiftCard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const body     = req.body as CreateGiftCardBody;
    const card     = await giftCardsService.createGiftCard(tenantId, body);
    res.status(201).json(success(card));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/gift-cards
 * List all gift cards for tenant (paginated, ADMIN only).
 */
export async function listGiftCards(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const query    = req.query as unknown as ListGiftCardsQuery;
    const result   = await giftCardsService.listGiftCards(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/gift-cards/:code
 * Public: check balance for a gift card by code.
 */
export async function getGiftCardByCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code } = req.params as { code: string };
    // No tenantId restriction — public balance check
    const card = await giftCardsService.getGiftCardByCode(code);
    res.json(success(card));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/gift-cards/:code/redeem
 * Deduct an amount from a gift card (ADMIN).
 */
export async function redeemGiftCard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code } = req.params as { code: string };
    const tenantId = extractTenantId(req);
    const { amount } = req.body as RedeemGiftCardBody;
    const result   = await giftCardsService.redeemGiftCard(code, tenantId, amount);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
