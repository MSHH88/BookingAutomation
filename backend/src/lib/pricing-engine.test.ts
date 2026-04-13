/**
 * Unit tests for pricing-engine.ts — Phase 8.1
 *
 * All DB calls are mocked. Tests cover every rule combination:
 *
 *  ✓ ruleMatches:
 *    - inactive rule → false
 *    - serviceId filter: null (matches all), specific match, specific no-match
 *    - daysOfWeek filter: empty (all days), matching, non-matching
 *    - time window: normal window, overnight window, exact boundaries
 *    - date range: dateFrom, dateTo, within range, outside range
 *
 *  ✓ computeRuleAdjustment:
 *    - PERCENTAGE positive (surcharge)
 *    - PERCENTAGE negative (discount)
 *    - FLAT positive
 *    - FLAT negative
 *
 *  ✓ calculateAdjustment:
 *    - no rules → adjustment 0
 *    - single PEAK rule
 *    - multiple rules applied in priority order
 *    - rules sorted by priority
 *    - non-matching rules skipped
 *
 *  ✓ calculatePrice:
 *    - service not found → null
 *    - no priceFrom → null
 *    - no matching rules → basePrice = adjustedPrice
 *    - matching PERCENTAGE rule → surcharge applied
 *    - matching FLAT discount rule → discount applied
 *    - never returns negative price (clamped to 0)
 */

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

import { Decimal } from '@prisma/client/runtime/library';
import {
  ruleMatches,
  computeRuleAdjustment,
  calculateAdjustment,
  calculatePrice,
  PricingRuleInput,
} from './pricing-engine';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockServiceFindUnique  = jest.fn();
const mockRuleFindMany       = jest.fn();

const mockPrismaClient = {
  service:     { findUnique: (...a: unknown[]) => mockServiceFindUnique(...a) },
  pricingRule: { findMany:   (...a: unknown[]) => mockRuleFindMany(...a) },
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const serviceId = 'service_1';
const tenantId  = 'tenant_1';

// Wednesday 2025-06-04 at 14:30 UTC — day 3
const wednesdayAfternoon = new Date('2025-06-04T14:30:00Z');
// Saturday 2025-06-07 at 10:00 UTC — day 6
const saturdayMorning    = new Date('2025-06-07T10:00:00Z');
// Tuesday 2025-06-03 at 23:00 UTC — day 2
const tuesdayEvening     = new Date('2025-06-03T23:00:00Z');

function makeRule(overrides: Partial<PricingRuleInput> = {}): PricingRuleInput {
  return {
    id:              'rule_1',
    serviceId:       null,
    daysOfWeek:      [],
    startTime:       null,
    endTime:         null,
    dateFrom:        null,
    dateTo:          null,
    adjustmentType:  'FLAT',
    adjustmentValue: new Decimal(10),
    priority:        0,
    isActive:        true,
    ...overrides,
  };
}

// ─── ruleMatches ──────────────────────────────────────────────────────────────

describe('ruleMatches', () => {
  it('inactive rule → false', () => {
    expect(ruleMatches(makeRule({ isActive: false }), serviceId, wednesdayAfternoon)).toBe(false);
  });

  describe('serviceId filter', () => {
    it('null serviceId matches any service', () => {
      expect(ruleMatches(makeRule({ serviceId: null }), 'any-service', wednesdayAfternoon)).toBe(true);
    });

    it('matching serviceId → true', () => {
      expect(ruleMatches(makeRule({ serviceId }), serviceId, wednesdayAfternoon)).toBe(true);
    });

    it('non-matching serviceId → false', () => {
      expect(ruleMatches(makeRule({ serviceId: 'other_service' }), serviceId, wednesdayAfternoon)).toBe(false);
    });
  });

  describe('daysOfWeek filter', () => {
    it('empty daysOfWeek matches all days', () => {
      expect(ruleMatches(makeRule({ daysOfWeek: [] }), serviceId, saturdayMorning)).toBe(true);
    });

    it('matching day → true', () => {
      // Saturday = 6
      expect(ruleMatches(makeRule({ daysOfWeek: [5, 6] }), serviceId, saturdayMorning)).toBe(true);
    });

    it('non-matching day → false', () => {
      // Wednesday = 3
      expect(ruleMatches(makeRule({ daysOfWeek: [5, 6] }), serviceId, wednesdayAfternoon)).toBe(false);
    });
  });

  describe('time window filter', () => {
    it('slot within normal window → true', () => {
      // 14:30 is within 09:00–18:00
      expect(ruleMatches(makeRule({ startTime: '09:00', endTime: '18:00' }), serviceId, wednesdayAfternoon)).toBe(true);
    });

    it('slot outside normal window → false', () => {
      // 14:30 is NOT within 16:00–20:00
      expect(ruleMatches(makeRule({ startTime: '16:00', endTime: '20:00' }), serviceId, wednesdayAfternoon)).toBe(false);
    });

    it('slot on window boundary (start) → true', () => {
      // 14:30 in 14:30–18:00 — inclusive start
      expect(ruleMatches(makeRule({ startTime: '14:30', endTime: '18:00' }), serviceId, wednesdayAfternoon)).toBe(true);
    });

    it('overnight window: slot after midnight start → true', () => {
      // 23:00 in 22:00–06:00 overnight window
      expect(ruleMatches(makeRule({ startTime: '22:00', endTime: '06:00' }), serviceId, tuesdayEvening)).toBe(true);
    });
  });

  describe('date range filter', () => {
    it('slot within date range → true', () => {
      expect(ruleMatches(makeRule({
        dateFrom: new Date('2025-06-01'),
        dateTo:   new Date('2025-06-30'),
      }), serviceId, wednesdayAfternoon)).toBe(true);
    });

    it('slot before dateFrom → false', () => {
      expect(ruleMatches(makeRule({
        dateFrom: new Date('2025-06-10'),
        dateTo:   null,
      }), serviceId, wednesdayAfternoon)).toBe(false);
    });

    it('slot after dateTo → false', () => {
      expect(ruleMatches(makeRule({
        dateFrom: null,
        dateTo:   new Date('2025-06-01'),
      }), serviceId, wednesdayAfternoon)).toBe(false);
    });
  });
});

// ─── computeRuleAdjustment ────────────────────────────────────────────────────

describe('computeRuleAdjustment', () => {
  it('PERCENTAGE positive → surcharge', () => {
    expect(computeRuleAdjustment(100, 'PERCENTAGE', 20)).toBeCloseTo(20);
  });

  it('PERCENTAGE negative → discount', () => {
    expect(computeRuleAdjustment(100, 'PERCENTAGE', -15)).toBeCloseTo(-15);
  });

  it('FLAT positive → direct surcharge', () => {
    expect(computeRuleAdjustment(100, 'FLAT', 25)).toBe(25);
  });

  it('FLAT negative → direct discount', () => {
    expect(computeRuleAdjustment(100, 'FLAT', -30)).toBe(-30);
  });

  it('PERCENTAGE with non-round base price', () => {
    expect(computeRuleAdjustment(75.5, 'PERCENTAGE', 10)).toBeCloseTo(7.55);
  });
});

// ─── calculateAdjustment ─────────────────────────────────────────────────────

describe('calculateAdjustment', () => {
  it('no rules → zero adjustment', () => {
    const result = calculateAdjustment([], 100, serviceId, wednesdayAfternoon);
    expect(result.totalAdjustment).toBe(0);
    expect(result.appliedRules).toHaveLength(0);
  });

  it('single FLAT surcharge rule', () => {
    const rules = [makeRule({ adjustmentType: 'FLAT', adjustmentValue: new Decimal(15) })];
    const result = calculateAdjustment(rules, 100, serviceId, wednesdayAfternoon);
    expect(result.totalAdjustment).toBe(15);
    expect(result.appliedRules).toEqual(['rule_1']);
  });

  it('multiple rules summed', () => {
    const rules = [
      makeRule({ id: 'r1', adjustmentType: 'FLAT',       adjustmentValue: new Decimal(10),  priority: 0 }),
      makeRule({ id: 'r2', adjustmentType: 'PERCENTAGE', adjustmentValue: new Decimal(-10), priority: 1 }),
    ];
    const result = calculateAdjustment(rules, 100, serviceId, wednesdayAfternoon);
    // FLAT +10, PERCENTAGE -10 (of 100) = -10 → total = 0
    expect(result.totalAdjustment).toBe(0);
    expect(result.appliedRules).toEqual(['r1', 'r2']);
  });

  it('rules sorted ascending by priority', () => {
    const rules = [
      makeRule({ id: 'r_low',  priority: 2, adjustmentValue: new Decimal(5) }),
      makeRule({ id: 'r_high', priority: 0, adjustmentValue: new Decimal(3) }),
    ];
    const result = calculateAdjustment(rules, 100, serviceId, wednesdayAfternoon);
    expect(result.appliedRules).toEqual(['r_high', 'r_low']);
  });

  it('non-matching rules excluded', () => {
    const rules = [
      makeRule({ daysOfWeek: [6], adjustmentValue: new Decimal(50) }), // Saturday only
    ];
    // wednesdayAfternoon is day 3
    const result = calculateAdjustment(rules, 100, serviceId, wednesdayAfternoon);
    expect(result.totalAdjustment).toBe(0);
    expect(result.appliedRules).toHaveLength(0);
  });
});

// ─── calculatePrice ───────────────────────────────────────────────────────────

describe('calculatePrice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when service not found', async () => {
    mockServiceFindUnique.mockResolvedValue(null);
    const result = await calculatePrice(tenantId, serviceId, wednesdayAfternoon, mockPrismaClient as never);
    expect(result).toBeNull();
  });

  it('returns null when service has no priceFrom', async () => {
    mockServiceFindUnique.mockResolvedValue({ priceFrom: null });
    const result = await calculatePrice(tenantId, serviceId, wednesdayAfternoon, mockPrismaClient as never);
    expect(result).toBeNull();
  });

  it('returns basePrice when no rules match', async () => {
    mockServiceFindUnique.mockResolvedValue({ priceFrom: new Decimal(80) });
    mockRuleFindMany.mockResolvedValue([]);

    const result = await calculatePrice(tenantId, serviceId, wednesdayAfternoon, mockPrismaClient as never);
    expect(result).toMatchObject({
      basePrice:       80,
      adjustedPrice:   80,
      totalAdjustment: 0,
      appliedRules:    [],
    });
  });

  it('applies PERCENTAGE surcharge rule', async () => {
    mockServiceFindUnique.mockResolvedValue({ priceFrom: new Decimal(100) });
    mockRuleFindMany.mockResolvedValue([
      {
        id:              'r1',
        serviceId:       null,
        daysOfWeek:      [],
        startTime:       null,
        endTime:         null,
        dateFrom:        null,
        dateTo:          null,
        adjustmentType:  'PERCENTAGE',
        adjustmentValue: new Decimal(20),
        priority:        0,
        isActive:        true,
      },
    ]);

    const result = await calculatePrice(tenantId, serviceId, wednesdayAfternoon, mockPrismaClient as never);
    expect(result?.adjustedPrice).toBe(120);
    expect(result?.appliedRules).toEqual(['r1']);
  });

  it('applies FLAT discount rule', async () => {
    mockServiceFindUnique.mockResolvedValue({ priceFrom: new Decimal(60) });
    mockRuleFindMany.mockResolvedValue([
      {
        id:              'r_disc',
        serviceId:       null,
        daysOfWeek:      [],
        startTime:       null,
        endTime:         null,
        dateFrom:        null,
        dateTo:          null,
        adjustmentType:  'FLAT',
        adjustmentValue: new Decimal(-15),
        priority:        0,
        isActive:        true,
      },
    ]);

    const result = await calculatePrice(tenantId, serviceId, wednesdayAfternoon, mockPrismaClient as never);
    expect(result?.adjustedPrice).toBe(45);
  });

  it('clamps adjusted price to 0 (never negative)', async () => {
    mockServiceFindUnique.mockResolvedValue({ priceFrom: new Decimal(10) });
    mockRuleFindMany.mockResolvedValue([
      {
        id:              'r_big_disc',
        serviceId:       null,
        daysOfWeek:      [],
        startTime:       null,
        endTime:         null,
        dateFrom:        null,
        dateTo:          null,
        adjustmentType:  'FLAT',
        adjustmentValue: new Decimal(-100),
        priority:        0,
        isActive:        true,
      },
    ]);

    const result = await calculatePrice(tenantId, serviceId, wednesdayAfternoon, mockPrismaClient as never);
    expect(result?.adjustedPrice).toBe(0);
  });
});
