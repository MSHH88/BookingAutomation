/**
 * Health Flags schemas — Phase 3.1
 *
 * Zod validation schemas for the customer health flag system API.
 *
 * Endpoints:
 *   GET    /api/health-flags/:customerId           — list health flags for a customer
 *   POST   /api/health-flags/:customerId           — create a health flag
 *   DELETE /api/health-flags/:customerId/:flagId   — delete a health flag
 */
import { z } from 'zod';

// ─── Health flag types ────────────────────────────────────────────────────────

export const HEALTH_FLAG_TYPES = [
  'LATEX_ALLERGY',
  'BLOOD_THINNERS',
  'SKIN_CONDITION',
  'PREGNANCY',
  'EPILEPSY',
  'PACEMAKER',
  'PRODUCT_SENSITIVITY',
  'OTHER',
] as const;

export type HealthFlagType = (typeof HEALTH_FLAG_TYPES)[number];

export const HEALTH_FLAG_SEVERITIES = ['HIGH', 'MEDIUM'] as const;
export type HealthFlagSeverity = (typeof HEALTH_FLAG_SEVERITIES)[number];

// ─── GET /api/health-flags/:customerId ────────────────────────────────────────

export const listHealthFlagsSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'customerId is required'),
  }),
});

export type ListHealthFlagsParams = z.infer<typeof listHealthFlagsSchema>['params'];

// ─── POST /api/health-flags/:customerId ───────────────────────────────────────

export const createHealthFlagSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'customerId is required'),
  }),
  body: z.object({
    type:     z.enum(HEALTH_FLAG_TYPES),
    notes:    z.string().optional(),
    severity: z.enum(HEALTH_FLAG_SEVERITIES).optional(),
  }),
});

export type CreateHealthFlagBody = z.infer<typeof createHealthFlagSchema>['body'];

// ─── DELETE /api/health-flags/:customerId/:flagId ─────────────────────────────

export const deleteHealthFlagSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'customerId is required'),
    flagId:     z.string().min(1, 'flagId is required'),
  }),
});

export type DeleteHealthFlagParams = z.infer<typeof deleteHealthFlagSchema>['params'];
