/**
 * Pricing schema — Phase 8.1
 *
 * Zod schemas for the dynamic pricing endpoints.
 */
import { z } from 'zod';

// ─── Shared ───────────────────────────────────────────────────────────────────

const pricingRuleTypeValues = ['PEAK', 'OFF_PEAK', 'SEASONAL', 'DEMAND'] as const;
const adjustmentTypeValues  = ['PERCENTAGE', 'FLAT'] as const;

// ─── Create ───────────────────────────────────────────────────────────────────

export const createPricingRuleSchema = z.object({
  body: z.object({
    serviceId:       z.string().optional(),
    ruleType:        z.enum(pricingRuleTypeValues),
    daysOfWeek:      z.array(z.number().int().min(0).max(6)).default([]),
    startTime:       z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime:         z.string().regex(/^\d{2}:\d{2}$/).optional(),
    dateFrom:        z.coerce.date().optional(),
    dateTo:          z.coerce.date().optional(),
    adjustmentType:  z.enum(adjustmentTypeValues),
    adjustmentValue: z.number({ required_error: 'adjustmentValue is required' }),
    priority:        z.number().int().min(0).default(0),
    isActive:        z.boolean().default(true),
  }).refine(
    (d) => !(d.startTime && !d.endTime) && !(!d.startTime && d.endTime),
    { message: 'startTime and endTime must both be set or both omitted' },
  ).refine(
    (d) => !(d.dateFrom && d.dateTo && d.dateFrom > d.dateTo),
    { message: 'dateFrom must be before dateTo' },
  ),
});

// ─── Update ───────────────────────────────────────────────────────────────────

export const updatePricingRuleSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Rule ID is required' }),
  }),
  body: z.object({
    serviceId:       z.string().optional(),
    ruleType:        z.enum(pricingRuleTypeValues).optional(),
    daysOfWeek:      z.array(z.number().int().min(0).max(6)).optional(),
    startTime:       z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
    endTime:         z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
    dateFrom:        z.coerce.date().optional().nullable(),
    dateTo:          z.coerce.date().optional().nullable(),
    adjustmentType:  z.enum(adjustmentTypeValues).optional(),
    adjustmentValue: z.number().optional(),
    priority:        z.number().int().min(0).optional(),
    isActive:        z.boolean().optional(),
  }),
});

// ─── Delete / Get ─────────────────────────────────────────────────────────────

export const pricingRuleIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Rule ID is required' }),
  }),
});

// ─── List ─────────────────────────────────────────────────────────────────────

export const listPricingRulesSchema = z.object({
  query: z.object({
    serviceId: z.string().optional(),
    isActive:  z.enum(['true', 'false']).optional(),
  }),
});

// ─── Calculate price ─────────────────────────────────────────────────────────

export const calculatePriceSchema = z.object({
  query: z.object({
    serviceId:    z.string({ required_error: 'serviceId is required' }),
    slotDateTime: z.string({ required_error: 'slotDateTime is required' }),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreatePricingRuleBody  = z.infer<typeof createPricingRuleSchema>['body'];
export type UpdatePricingRuleBody  = z.infer<typeof updatePricingRuleSchema>['body'];
export type PricingRuleIdParams    = z.infer<typeof pricingRuleIdSchema>['params'];
export type ListPricingRulesQuery  = z.infer<typeof listPricingRulesSchema>['query'];
export type CalculatePriceQuery    = z.infer<typeof calculatePriceSchema>['query'];
