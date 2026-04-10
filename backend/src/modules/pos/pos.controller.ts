/**
 * POS controller — Phase 4.4
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';

import * as posService from './pos.service';
import { success }     from '../../utils/apiResponse';
import type { PosCheckoutBody, PosListTransactionsQuery, PosSummaryQuery, TerminalPaymentIntentBody } from './pos.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/pos/checkout
 * Process a walk-in sale (creates booking + payment record).
 */
export async function checkout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId   = req.user!.tenantId!;
    const operatorId = req.user!.id;
    const body       = req.body as PosCheckoutBody;
    const result     = await posService.checkout(tenantId, operatorId, body);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/pos/transactions
 * List POS payment transactions for a tenant (paginated).
 */
export async function listTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const query    = req.query as unknown as PosListTransactionsQuery;
    const result   = await posService.listTransactions(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/pos/summary
 * Daily revenue summary for POS transactions.
 */
export async function getDailySummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const query    = req.query as unknown as PosSummaryQuery;
    const result   = await posService.getDailySummary(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/pos/terminal/connection-token
 * Returns a Stripe Terminal connection token for the frontend SDK.
 */
export async function terminalConnectionToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const result   = await posService.getTerminalConnectionToken(tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/pos/terminal/payment-intent
 * Creates a Stripe PaymentIntent for Terminal capture.
 */
export async function terminalPaymentIntent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const body     = req.body as TerminalPaymentIntentBody;
    const result   = await posService.createTerminalPaymentIntent(tenantId, body);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
}
