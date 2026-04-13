/**
 * AI service — Phase 8.2
 *
 * CRUD + send operations for AISuggestion records.
 * AI generation is handled by jobs/ai-suggestion.job.ts.
 *
 * Tests: ai.service.test.ts
 */

import { prisma }           from '../../lib/prisma';
import { AppError }         from '../../errors/AppError';
import { logger }           from '../../utils/logger';
import { dispatchNotification, ChannelPreference } from '../../lib/notification-dispatcher';
import type {
  ListAISuggestionsQuery,
  UpdateAISuggestionBody,
} from './ai.schema';

// ─── listSuggestions ──────────────────────────────────────────────────────────

export async function listSuggestions(
  tenantId: string | null,
  query:    ListAISuggestionsQuery,
) {
  const page  = Math.max(1, query.page  ?? 1);
  const limit = Math.min(100, query.limit ?? 20);
  const skip  = (page - 1) * limit;

  const where = {
    tenantId,
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.status     ? { status: query.status }         : {}),
  };

  const [items, total] = await Promise.all([
    prisma.aISuggestion.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        service:  { select: { id: true, name: true } },
      },
    }),
    prisma.aISuggestion.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ─── getSuggestion ────────────────────────────────────────────────────────────

export async function getSuggestion(tenantId: string | null, suggestionId: string) {
  const suggestion = await prisma.aISuggestion.findUnique({
    where:   { id: suggestionId },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true, notificationChannel: true } },
      service:  { select: { id: true, name: true } },
    },
  });

  if (!suggestion) {
    throw new AppError(404, 'AI_SUGGESTION_NOT_FOUND', `AI suggestion ${suggestionId} not found`);
  }
  if (suggestion.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'AI suggestion does not belong to this tenant');
  }

  return suggestion;
}

// ─── updateSuggestion ─────────────────────────────────────────────────────────

export async function updateSuggestion(
  tenantId:     string | null,
  suggestionId: string,
  body:         UpdateAISuggestionBody,
) {
  const existing = await prisma.aISuggestion.findUnique({
    where:  { id: suggestionId },
    select: { id: true, tenantId: true, status: true },
  });

  if (!existing) {
    throw new AppError(404, 'AI_SUGGESTION_NOT_FOUND', `AI suggestion ${suggestionId} not found`);
  }
  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'AI suggestion does not belong to this tenant');
  }
  if (existing.status === 'SENT') {
    throw new AppError(409, 'ALREADY_SENT', 'Cannot update a suggestion that has already been sent');
  }

  return prisma.aISuggestion.update({
    where: { id: suggestionId },
    data: {
      ...(body.message      !== undefined ? { message:      body.message }      : {}),
      ...(body.status       !== undefined ? { status:       body.status }       : {}),
      ...(body.suggestedAt  !== undefined ? { suggestedAt:  body.suggestedAt }  : {}),
    },
  });
}

// ─── sendSuggestion ───────────────────────────────────────────────────────────

/**
 * Sends the AI suggestion message to the customer via their preferred channel.
 * Sets status to SENT on success.
 */
export async function sendSuggestion(
  tenantId:     string | null,
  suggestionId: string,
): Promise<void> {
  const suggestion = await prisma.aISuggestion.findUnique({
    where:   { id: suggestionId },
    include: {
      customer: {
        select: {
          id:                  true,
          name:                true,
          email:               true,
          phone:               true,
          notificationChannel: true,
          unsubscribed:        true,
        },
      },
    },
  });

  if (!suggestion) {
    throw new AppError(404, 'AI_SUGGESTION_NOT_FOUND', `AI suggestion ${suggestionId} not found`);
  }
  if (suggestion.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'AI suggestion does not belong to this tenant');
  }
  if (suggestion.status === 'SENT') {
    throw new AppError(409, 'ALREADY_SENT', 'This suggestion has already been sent');
  }
  if (suggestion.status === 'DISMISSED') {
    throw new AppError(409, 'SUGGESTION_DISMISSED', 'Cannot send a dismissed suggestion');
  }
  if (!suggestion.customer) {
    throw new AppError(400, 'NO_CUSTOMER', 'Suggestion has no linked customer');
  }
  if (suggestion.customer.unsubscribed) {
    throw new AppError(409, 'CUSTOMER_UNSUBSCRIBED', 'Customer has unsubscribed from communications');
  }

  await dispatchNotification({
    channel:      suggestion.customer.notificationChannel as ChannelPreference,
    phone:        suggestion.customer.phone ?? null,
    email:        suggestion.customer.email,
    customerName: suggestion.customer.name,
    templateKey:  'ai_suggestion',
    variables:    { message: suggestion.message },
    tenantId:     tenantId ?? undefined,
  });

  await prisma.aISuggestion.update({
    where: { id: suggestionId },
    data:  { status: 'SENT', sentAt: new Date() },
  });

  logger.info('AI suggestion sent', { suggestionId, customerId: suggestion.customerId });
}

// ─── dismissSuggestion ────────────────────────────────────────────────────────

export async function dismissSuggestion(
  tenantId:     string | null,
  suggestionId: string,
): Promise<void> {
  const existing = await prisma.aISuggestion.findUnique({
    where:  { id: suggestionId },
    select: { id: true, tenantId: true, status: true },
  });

  if (!existing) {
    throw new AppError(404, 'AI_SUGGESTION_NOT_FOUND', `AI suggestion ${suggestionId} not found`);
  }
  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'AI suggestion does not belong to this tenant');
  }
  if (existing.status === 'SENT') {
    throw new AppError(409, 'ALREADY_SENT', 'Cannot dismiss a suggestion that has already been sent');
  }

  await prisma.aISuggestion.update({
    where: { id: suggestionId },
    data:  { status: 'DISMISSED' },
  });

  logger.info('AI suggestion dismissed', { suggestionId });
}
