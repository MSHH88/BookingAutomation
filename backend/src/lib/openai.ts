/**
 * OpenAI client — Phase 8.2
 *
 * Thin wrapper around the `openai` npm package for AI-powered booking
 * suggestions. Provides a lazy singleton client and a `generateSuggestion`
 * helper that returns a short, personalised rebooking/upsell message.
 *
 * Model: gpt-4o-mini (cost-efficient, fast, sufficient for short messages).
 *
 * Design:
 *   - Lazy singleton so tests can mock the module before first import.
 *   - `_resetOpenAIClient()` wipes the singleton between tests.
 *   - `generateSuggestion` is pure in the sense that it only calls OpenAI
 *     and never touches the DB — callers handle persistence.
 *
 * Required env var:
 *   OPENAI_API_KEY — OpenAI secret key (required for production, empty in test)
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger';

// ─── Singleton ────────────────────────────────────────────────────────────────

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (_client) return _client;
  _client = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] ?? '' });
  return _client;
}

export function _resetOpenAIClient(): void {
  _client = null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuggestionContext {
  customerName:   string;
  serviceName:    string;
  lastBookingAt:  Date;
  suggestedDate?: string;   // ISO date string, optional
  studioName:     string;
}

// ─── generateSuggestion ───────────────────────────────────────────────────────

/**
 * Calls OpenAI to generate a 1–2 sentence personalised rebooking/upsell message.
 *
 * @returns The AI-generated message string.
 * @throws  On OpenAI API failure (caller should handle gracefully).
 */
export async function generateSuggestion(ctx: SuggestionContext): Promise<string> {
  const client = getOpenAIClient();

  const systemPrompt = [
    `You are a friendly, professional booking assistant for ${ctx.studioName}.`,
    'Write a short, warm rebooking reminder or upsell message (1–2 sentences).',
    'Be personal, helpful, and avoid being pushy.',
    'Do not use exclamation marks more than once.',
    'Do not mention AI or that this is automated.',
  ].join(' ');

  const userPrompt = [
    `Customer: ${ctx.customerName}`,
    `Last service: ${ctx.serviceName}`,
    `Last booking date: ${ctx.lastBookingAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    ctx.suggestedDate ? `Suggested next slot: ${ctx.suggestedDate}` : '',
    'Write a personalised rebooking suggestion for this customer.',
  ].filter(Boolean).join('\n');

  const response = await client.chat.completions.create({
    model:       'gpt-4o-mini',
    messages:    [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    max_tokens:  150,
    temperature: 0.7,
  });

  const message = response.choices[0]?.message?.content?.trim();

  if (!message) {
    throw new Error('[OpenAI] Empty response from chat completion');
  }

  logger.debug('AI suggestion generated', { customerName: ctx.customerName });
  return message;
}
