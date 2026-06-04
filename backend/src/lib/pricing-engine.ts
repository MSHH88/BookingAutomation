/**
 * Pricing Engine — Phase 8.1
 *
 * Pure, stateless function that applies dynamic/surge pricing rules to a
 * booking slot and returns the final price adjustment.
 *
 * Design:
 *   - `calculateAdjustment(rules, serviceId, slotDateTime)` — deterministic,
 *     takes resolved rules (already fetched from DB), returns the total
 *     adjustment to apply (as a Decimal-compatible number).
 *   - `applyAdjustment(basePrice, adjustment, adjustmentType)` — applies a
 *     single rule's adjustment to a base price.
 *   - `calculatePrice(tenantId, serviceId, slotDateTime, prisma)` — full
 *     end-to-end function: loads base price + active rules, returns final price.
 *
 * Rule matching logic:
 *   1. A rule matches when ALL of the following are true:
 *      a. `isActive` is true
 *      b. `serviceId` is null (all services) OR matches the given serviceId
 *      c. `daysOfWeek` is empty (all days) OR contains the slot's day of week (UTC)
 *      d. `startTime` / `endTime` are null OR the slot time falls within the window
 *      e. `dateFrom` / `dateTo` are null OR the slot date falls within the range
 *   2. Matching rules are sorted ascending by `priority`.
 *   3. For each matching rule: compute its raw adjustment (flat £ or % of base price).
 *   4. Sum all adjustments (surcharges positive, discounts negative).
 *   5. Final price = max(0, basePrice + totalAdjustment).
 *
 * Tests: pricing-engine.test.ts
 */

import { Decimal }                        from '@prisma/client/runtime/library';
import { prisma as defaultPrisma }        from './prisma';
import type { PrismaClient }              from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdjustmentType = 'PERCENTAGE' | 'FLAT';

export interface PricingRuleInput {
  id:              string;
  serviceId:       string | null;
  daysOfWeek:      number[];
  startTime:       string | null;   // HH:MM
  endTime:         string | null;   // HH:MM
  dateFrom:        Date | null;
  dateTo:          Date | null;
  adjustmentType:  AdjustmentType;
  adjustmentValue: Decimal;
  priority:        number;
  isActive:        boolean;
}

export interface PriceResult {
  basePrice:       number;         // Service.priceFrom (original)
  adjustedPrice:   number;         // Final price after all rules
  totalAdjustment: number;         // Sum of all applied adjustments
  appliedRules:    string[];       // IDs of rules that matched
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parses "HH:MM" string to total minutes from midnight. */
export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Returns the slot's minute-of-day in UTC (0–1439). */
function slotMinuteOfDay(slotDateTime: Date): number {
  return slotDateTime.getUTCHours() * 60 + slotDateTime.getUTCMinutes();
}

// ─── Rule matching ────────────────────────────────────────────────────────────

/**
 * Returns true if the given rule matches the slot.
 */
export function ruleMatches(
  rule:          PricingRuleInput,
  serviceId:     string,
  slotDateTime:  Date,
): boolean {
  if (!rule.isActive) return false;

  // Service filter: null = all services
  if (rule.serviceId !== null && rule.serviceId !== serviceId) return false;

  // Day-of-week filter (UTC): empty array = all days
  if (rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(slotDateTime.getUTCDay())) return false;

  // Time window filter
  if (rule.startTime && rule.endTime) {
    const slotMin  = slotMinuteOfDay(slotDateTime);
    const startMin = parseTimeToMinutes(rule.startTime);
    const endMin   = parseTimeToMinutes(rule.endTime);

    if (endMin > startMin) {
      // Normal window (e.g. 09:00–18:00)
      if (slotMin < startMin || slotMin >= endMin) return false;
    } else {
      // Overnight window (e.g. 22:00–06:00)
      if (slotMin < startMin && slotMin >= endMin) return false;
    }
  }

  // Date range filter
  const slotDate = new Date(
    Date.UTC(slotDateTime.getUTCFullYear(), slotDateTime.getUTCMonth(), slotDateTime.getUTCDate()),
  );

  if (rule.dateFrom) {
    const from = new Date(rule.dateFrom);
    from.setUTCHours(0, 0, 0, 0);
    if (slotDate < from) return false;
  }

  if (rule.dateTo) {
    const to = new Date(rule.dateTo);
    to.setUTCHours(23, 59, 59, 999);
    if (slotDate > to) return false;
  }

  return true;
}

// ─── Adjustment calculation ───────────────────────────────────────────────────

/**
 * Computes the raw price adjustment for one rule (in absolute currency units).
 *
 * PERCENTAGE: adjustmentValue = 10 → +10% of basePrice
 *             adjustmentValue = -15 → -15% of basePrice
 * FLAT:       adjustmentValue is a direct £ amount (positive=surcharge, negative=discount)
 */
export function computeRuleAdjustment(
  basePrice:       number,
  adjustmentType:  AdjustmentType,
  adjustmentValue: number,
): number {
  if (adjustmentType === 'PERCENTAGE') {
    return (basePrice * adjustmentValue) / 100;
  }
  return adjustmentValue;
}

// ─── calculateAdjustment ─────────────────────────────────────────────────────

/**
 * Applies all matching rules (sorted by priority ascending) to compute the
 * total price adjustment for a slot.
 *
 * @param rules         All active rules for the tenant (pre-fetched from DB)
 * @param basePrice     Service base price (Service.priceFrom)
 * @param serviceId     Booking service ID
 * @param slotDateTime  Booking start time
 */
export function calculateAdjustment(
  rules:        PricingRuleInput[],
  basePrice:    number,
  serviceId:    string,
  slotDateTime: Date,
): { totalAdjustment: number; appliedRules: string[] } {
  const matching = rules
    .filter((r) => ruleMatches(r, serviceId, slotDateTime))
    .sort((a, b) => a.priority - b.priority);

  let totalAdjustment = 0;
  const appliedRules: string[] = [];

  for (const rule of matching) {
    const adj = computeRuleAdjustment(basePrice, rule.adjustmentType, Number(rule.adjustmentValue));
    totalAdjustment += adj;
    appliedRules.push(rule.id);
  }

  return { totalAdjustment, appliedRules };
}

// ─── calculatePrice ───────────────────────────────────────────────────────────

/**
 * Full end-to-end price calculation:
 *   1. Loads the service's base price.
 *   2. Loads active pricing rules for the tenant (and globally active rules).
 *   3. Applies matching rules in priority order.
 *   4. Returns the adjusted price (minimum 0).
 *
 * Returns null if the service has no base price set.
 */
export async function calculatePrice(
  tenantId:     string | null,
  serviceId:    string,
  slotDateTime: Date,
  db:           PrismaClient = defaultPrisma,
): Promise<PriceResult | null> {
  const service = await db.service.findUnique({
    where:  { id: serviceId },
    select: { priceFrom: true },
  });

  if (!service || service.priceFrom === null) return null;

  const basePrice = Number(service.priceFrom);

  const rules = await db.pricingRule.findMany({
    where: {
      isActive: true,
      OR: [
        { tenantId },
        { tenantId: null },
      ],
    },
    select: {
      id:              true,
      serviceId:       true,
      daysOfWeek:      true,
      startTime:       true,
      endTime:         true,
      dateFrom:        true,
      dateTo:          true,
      adjustmentType:  true,
      adjustmentValue: true,
      priority:        true,
      isActive:        true,
    },
    orderBy: { priority: 'asc' },
  });

  const { totalAdjustment, appliedRules } = calculateAdjustment(
    rules as PricingRuleInput[],
    basePrice,
    serviceId,
    slotDateTime,
  );

  const adjustedPrice = Math.max(0, basePrice + totalAdjustment);

  return {
    basePrice,
    adjustedPrice:   Math.round(adjustedPrice * 100) / 100, // round to 2dp
    totalAdjustment: Math.round(totalAdjustment * 100) / 100,
    appliedRules,
  };
}
