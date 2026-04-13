/**
 * AI schema — Phase 8.2
 *
 * Zod schemas for the AI suggestion endpoints.
 */
import { z } from 'zod';

// ─── List ─────────────────────────────────────────────────────────────────────

export const listAISuggestionsSchema = z.object({
  query: z.object({
    customerId: z.string().optional(),
    status:     z.enum(['PENDING', 'APPROVED', 'SENT', 'DISMISSED']).optional(),
    page:       z.coerce.number().int().min(1).default(1),
    limit:      z.coerce.number().int().min(1).max(100).default(20),
  }),
});

// ─── ID param ─────────────────────────────────────────────────────────────────

export const aiSuggestionIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Suggestion ID is required' }),
  }),
});

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateAISuggestionSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Suggestion ID is required' }),
  }),
  body: z.object({
    message:     z.string().min(1).max(1000).optional(),
    status:      z.enum(['PENDING', 'APPROVED', 'DISMISSED']).optional(),
    suggestedAt: z.coerce.date().optional().nullable(),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type ListAISuggestionsQuery  = z.infer<typeof listAISuggestionsSchema>['query'];
export type AISuggestionIdParams    = z.infer<typeof aiSuggestionIdSchema>['params'];
export type UpdateAISuggestionBody  = z.infer<typeof updateAISuggestionSchema>['body'];
