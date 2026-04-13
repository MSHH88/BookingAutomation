/**
 * Pricing service — Phase 8.1
 *
 * CRUD operations for PricingRule records.
 * Price calculation is delegated to lib/pricing-engine.ts.
 *
 * Tests: pricing.test.ts
 */

import { prisma }      from '../../lib/prisma';
import { AppError }    from '../../errors/AppError';
import { logger }      from '../../utils/logger';
import { calculatePrice } from '../../lib/pricing-engine';
import type {
  CreatePricingRuleBody,
  UpdatePricingRuleBody,
} from './pricing.schema';

// ─── list ─────────────────────────────────────────────────────────────────────

export async function listPricingRules(
  tenantId:  string | null,
  serviceId? : string,
  isActive?:  boolean,
) {
  return prisma.pricingRule.findMany({
    where: {
      tenantId,
      ...(serviceId !== undefined ? { serviceId } : {}),
      ...(isActive  !== undefined ? { isActive  } : {}),
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });
}

// ─── create ───────────────────────────────────────────────────────────────────

export async function createPricingRule(
  tenantId: string | null,
  body:     CreatePricingRuleBody,
) {
  // Validate serviceId belongs to this tenant if provided
  if (body.serviceId) {
    const service = await prisma.service.findUnique({
      where:  { id: body.serviceId },
      select: { id: true, tenantId: true },
    });
    if (!service) {
      throw new AppError(404, 'SERVICE_NOT_FOUND', `Service ${body.serviceId} not found`);
    }
    if (service.tenantId !== tenantId) {
      throw new AppError(403, 'FORBIDDEN', 'Service does not belong to this tenant');
    }
  }

  const rule = await prisma.pricingRule.create({
    data: {
      tenantId,
      serviceId:       body.serviceId ?? null,
      ruleType:        body.ruleType,
      daysOfWeek:      body.daysOfWeek,
      startTime:       body.startTime ?? null,
      endTime:         body.endTime   ?? null,
      dateFrom:        body.dateFrom  ?? null,
      dateTo:          body.dateTo    ?? null,
      adjustmentType:  body.adjustmentType,
      adjustmentValue: body.adjustmentValue,
      priority:        body.priority,
      isActive:        body.isActive,
    },
  });

  logger.info('Pricing rule created', { ruleId: rule.id, tenantId });
  return rule;
}

// ─── update ───────────────────────────────────────────────────────────────────

export async function updatePricingRule(
  tenantId: string | null,
  ruleId:   string,
  body:     UpdatePricingRuleBody,
) {
  const existing = await prisma.pricingRule.findUnique({
    where:  { id: ruleId },
    select: { id: true, tenantId: true },
  });

  if (!existing) {
    throw new AppError(404, 'PRICING_RULE_NOT_FOUND', `Pricing rule ${ruleId} not found`);
  }
  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Pricing rule does not belong to this tenant');
  }

  const updated = await prisma.pricingRule.update({
    where: { id: ruleId },
    data: {
      ...(body.serviceId       !== undefined ? { serviceId: body.serviceId }             : {}),
      ...(body.ruleType        !== undefined ? { ruleType: body.ruleType }               : {}),
      ...(body.daysOfWeek      !== undefined ? { daysOfWeek: body.daysOfWeek }           : {}),
      ...(body.startTime       !== undefined ? { startTime: body.startTime }             : {}),
      ...(body.endTime         !== undefined ? { endTime: body.endTime }                 : {}),
      ...(body.dateFrom        !== undefined ? { dateFrom: body.dateFrom }               : {}),
      ...(body.dateTo          !== undefined ? { dateTo: body.dateTo }                   : {}),
      ...(body.adjustmentType  !== undefined ? { adjustmentType: body.adjustmentType }   : {}),
      ...(body.adjustmentValue !== undefined ? { adjustmentValue: body.adjustmentValue } : {}),
      ...(body.priority        !== undefined ? { priority: body.priority }               : {}),
      ...(body.isActive        !== undefined ? { isActive: body.isActive }               : {}),
    },
  });

  logger.info('Pricing rule updated', { ruleId, tenantId });
  return updated;
}

// ─── delete ───────────────────────────────────────────────────────────────────

export async function deletePricingRule(
  tenantId: string | null,
  ruleId:   string,
): Promise<void> {
  const existing = await prisma.pricingRule.findUnique({
    where:  { id: ruleId },
    select: { id: true, tenantId: true },
  });

  if (!existing) {
    throw new AppError(404, 'PRICING_RULE_NOT_FOUND', `Pricing rule ${ruleId} not found`);
  }
  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Pricing rule does not belong to this tenant');
  }

  await prisma.pricingRule.delete({ where: { id: ruleId } });
  logger.info('Pricing rule deleted', { ruleId, tenantId });
}

// ─── calculateSlotPrice ───────────────────────────────────────────────────────

export async function calculateSlotPrice(
  tenantId:     string | null,
  serviceId:    string,
  slotDateTime: Date,
) {
  const result = await calculatePrice(tenantId, serviceId, slotDateTime);
  if (!result) {
    throw new AppError(404, 'SERVICE_OR_PRICE_NOT_FOUND', 'Service not found or has no base price');
  }
  return result;
}
