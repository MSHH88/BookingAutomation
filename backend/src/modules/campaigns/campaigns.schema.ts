/**
 * Zod schemas for Campaigns — Phase 1, Step 1.9
 *
 * Feature flag: CAMPAIGNS_ENABLED
 * Endpoints:
 *   POST   /api/campaigns              — create campaign
 *   GET    /api/campaigns              — list campaigns
 *   GET    /api/campaigns/:id          — get single
 *   PATCH  /api/campaigns/:id          — edit/schedule/cancel
 *   GET    /api/campaigns/:id/stats    — delivery stats
 */
import { z } from 'zod';

const reqStr = (label: string) =>
  z.string({ required_error: `${label} is required` }).min(1, `${label} cannot be empty`).trim();

export const listCampaignsSchema = z.object({
  query: z.object({
    status: z.enum(['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export type ListCampaignsQuery = z.infer<typeof listCampaignsSchema>['query'];

export const getCampaignSchema = z.object({
  params: z.object({ id: reqStr('id') }),
});

export const createCampaignSchema = z.object({
  body: z.object({
    name: reqStr('name'),
    channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL', 'ALL']).default('WHATSAPP'),
    templateKey: reqStr('templateKey'),
    audienceFilter: z.object({
      type: z.enum(['ALL', 'INACTIVE_30_DAYS', 'BIRTHDAY_THIS_MONTH', 'TOP_SPENDERS', 'BY_SERVICE_TYPE']).default('ALL'),
      serviceType: z.string().optional(),
    }).default({ type: 'ALL' }),
    scheduledAt: z.string().datetime().optional(),
  }),
});

export type CreateCampaignBody = z.infer<typeof createCampaignSchema>['body'];

export const updateCampaignSchema = z.object({
  params: z.object({ id: reqStr('id') }),
  body: z.object({
    name: z.string().min(1).trim().optional(),
    channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL', 'ALL']).optional(),
    templateKey: z.string().min(1).trim().optional(),
    audienceFilter: z.object({
      type: z.enum(['ALL', 'INACTIVE_30_DAYS', 'BIRTHDAY_THIS_MONTH', 'TOP_SPENDERS', 'BY_SERVICE_TYPE']),
      serviceType: z.string().optional(),
    }).optional(),
    scheduledAt: z.string().datetime().optional().nullable(),
    status: z.enum(['DRAFT', 'SCHEDULED', 'CANCELLED']).optional(),
  }).refine(
    (b) => Object.values(b).some(v => v !== undefined),
    { message: 'At least one field must be provided for update' },
  ),
});

export type UpdateCampaignBody = z.infer<typeof updateCampaignSchema>['body'];

export const getCampaignStatsSchema = z.object({
  params: z.object({ id: reqStr('id') }),
});
