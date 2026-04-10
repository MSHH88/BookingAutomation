/**
 * Loyalty controller — Phase 5.3
 */
import { Request, Response, NextFunction } from 'express';

import * as loyaltyService from './loyalty.service';
import { success }         from '../../utils/apiResponse';
import type { RedeemPointsBody } from './loyalty.schema';

export async function getMyLoyalty(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const customerId = req.user!.id;
    const tenantId   = req.user!.tenantId!;
    const account    = await loyaltyService.getLoyaltyAccount(customerId, tenantId);
    res.json(success(account));
  } catch (err) {
    next(err);
  }
}

export async function getCustomerLoyalty(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId       = req.user!.tenantId!;
    const { customerId } = req.params as { customerId: string };
    const account        = await loyaltyService.getLoyaltyAccount(customerId, tenantId);
    res.json(success(account));
  } catch (err) {
    next(err);
  }
}

export async function redeemPoints(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const body     = req.body as RedeemPointsBody;
    const result   = await loyaltyService.redeemPoints(body.customerId, tenantId, body);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
