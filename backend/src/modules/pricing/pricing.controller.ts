/**
 * Pricing controller — Phase 8.1
 *
 * HTTP handlers for dynamic pricing rule management.
 */
import { Request, Response, NextFunction } from 'express';
import * as svc from './pricing.service';
import { success, paginated } from '../../utils/apiResponse';
import type {
  CreatePricingRuleBody,
  UpdatePricingRuleBody,
  PricingRuleIdParams,
  ListPricingRulesQuery,
  CalculatePriceQuery,
} from './pricing.schema';

// ─── listRules ────────────────────────────────────────────────────────────────

export async function listRules(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListPricingRulesQuery;
    const isActive = query.isActive === 'true'
      ? true
      : query.isActive === 'false'
        ? false
        : undefined;

    const result = await svc.listPricingRules(
      req.user!.tenantId ?? null,
      query.serviceId,
      isActive,
      query.page,
      query.limit,
    );
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

// ─── createRule ───────────────────────────────────────────────────────────────

export async function createRule(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as unknown as CreatePricingRuleBody;
    const rule = await svc.createPricingRule(req.user!.tenantId ?? null, body);
    res.status(201).json(success(rule));
  } catch (err) {
    next(err);
  }
}

// ─── updateRule ───────────────────────────────────────────────────────────────

export async function updateRule(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as PricingRuleIdParams;
    const body   = req.body  as unknown as UpdatePricingRuleBody;
    const rule   = await svc.updatePricingRule(req.user!.tenantId ?? null, id, body);
    res.json(success(rule));
  } catch (err) {
    next(err);
  }
}

// ─── deleteRule ───────────────────────────────────────────────────────────────

export async function deleteRule(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as PricingRuleIdParams;
    await svc.deletePricingRule(req.user!.tenantId ?? null, id);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}

// ─── calculatePrice ───────────────────────────────────────────────────────────

export async function calculatePriceHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as CalculatePriceQuery;
    const slotDateTime = new Date(query.slotDateTime);
    if (isNaN(slotDateTime.getTime())) {
      res.status(400).json({ success: false, error: 'INVALID_DATE', message: 'slotDateTime is not a valid ISO date' });
      return;
    }

    const result = await svc.calculateSlotPrice(
      req.user!.tenantId ?? null,
      query.serviceId,
      slotDateTime,
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

