/**
 * Capture service — Step 1.11
 *
 * Business logic for the public-facing POST /api/capture endpoint.
 * This layer adds intelligence on top of the existing leads.service.createLead():
 *
 *   1. Bot guard         — honeypot check; non-empty `website` field → SPAM_DETECTED
 *   2. Duplicate guard   — same email + artistId within DEDUP_WINDOW_MS → returns existing lead
 *   3. Score computation — algorithmic 0–100 quality score from data richness + intent signals
 *   4. Device detection  — infers deviceType from User-Agent when not supplied by client
 *   5. Lead creation     — delegates to createLead() for the canonical DB write + side-effects
 *   6. Webhook stub      — structured log for Phase 2 webhook dispatch
 *
 * The service is stateless and testable in isolation (Prisma is the only I/O).
 *
 * SCORING ALGORITHM (max 100):
 *   +15  description > 200 chars (very high intent — detailed brief)
 *   +10  description > 100 chars (moderate intent — thoughtful brief)
 *   +15  referenceImages.length > 0 (visual brief provided)
 *   +15  preferredDates provided (ready-to-book signal)
 *   +10  artistId provided (knows exactly who they want)
 *   +10  serviceId provided (knows what service they want)
 *   +10  marketingConsent = true (high engagement signal)
 *   +10  utmSource present (trackable acquisition channel)
 *   + 5  phone in international format +... (quality contact data)
 *
 * Clamped to [0, 100].
 */
import { Prisma } from '@prisma/client';

import { prisma }             from '../../lib/prisma';
import { AppError }           from '../../errors/AppError';
import { logger }             from '../../utils/logger';
import { createLead }         from '../leads/leads.service';
import type { CaptureLeadBody, CaptureResult } from './capture.schema';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Deduplication window: 24 hours.
 * Submissions for the same email + artistId pair within this window
 * are treated as duplicates — no new Lead row is created.
 */
export const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

// ─── Device detection ─────────────────────────────────────────────────────────

/**
 * Infer a coarse device category from the User-Agent header string.
 *
 * Returns `null` when the UA is absent or unrecognisable.
 * Client-supplied `body.deviceType` always takes precedence — this function
 * is only called when the body field is absent.
 */
export function inferDeviceType(userAgent: string | undefined): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (ua.includes('ipad') || ua.includes('tablet'))   return 'tablet';
  if (ua.includes('mobile') || ua.includes('android')) return 'mobile';
  return 'desktop';
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Compute a lead quality score in the range [0, 100].
 *
 * Higher scores indicate higher intent and data completeness.
 * The score is stored on the Lead record so the CRM can sort / filter by it.
 *
 * See module docstring for the full breakdown.
 */
export function computeLeadScore(body: CaptureLeadBody): number {
  let score = 0;

  // Intent signals from inquiry content
  if (body.description.length > 200) score += 15;
  else if (body.description.length > 100) score += 10;

  if (body.referenceImages && body.referenceImages.length > 0) score += 15;
  if (body.preferredDates  && Object.keys(body.preferredDates).length > 0) score += 15;

  // Specificity signals
  if (body.artistId)  score += 10;
  if (body.serviceId) score += 10;

  // Engagement signals
  if (body.marketingConsent) score += 10;
  if (body.utmSource)        score += 10;

  // Contact quality — international phone number
  if (body.phone.startsWith('+')) score += 5;

  return Math.min(100, Math.max(0, score));
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

/**
 * Returns an existing lead if the same email + artistId combination has been
 * submitted within the deduplication window, otherwise returns null.
 *
 * Only leads with status NEW or CONTACTED are considered active duplicates.
 * A BOOKED / COMPLETED / CANCELLED / LOST lead from the same submitter is
 * treated as a distinct, new inquiry.
 *
 * tenantId is included in the query so dedup never crosses tenant boundaries.
 */
export async function findDuplicate(
  email:    string,
  artistId: string | null | undefined,
  windowMs: number = DEDUP_WINDOW_MS,
  tenantId?: string | null,
): Promise<{ id: string; score: number; createdAt: Date } | null> {
  const since = new Date(Date.now() - windowMs);

  const where: Prisma.LeadWhereInput = {
    email:     { equals: email.toLowerCase(), mode: 'insensitive' },
    status:    { in: ['NEW', 'CONTACTED'] },
    createdAt: { gte: since },
    tenantId:  tenantId ?? null,
  };

  if (artistId) {
    where.artistId = artistId;
  } else {
    where.artistId = null;
  }

  const existing = await prisma.lead.findFirst({
    where,
    select:  { id: true, score: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return existing ?? null;
}

// ─── Webhook stub ─────────────────────────────────────────────────────────────

/**
 * Dispatch a structured "lead.captured" webhook event.
 *
 * Phase 1 emits a structured log line so Phase 2 can wire a real HTTP POST
 * to configured webhook URLs with zero structural changes to this service.
 *
 * Payload mirrors the shape that popular CRM webhooks (HubSpot, ActiveCampaign,
 * Pipedrive) expect for a new contact / deal creation event.
 */
function dispatchWebhook(
  leadId:      string,
  score:       number,
  isDuplicate: boolean,
  sessionId:   string | null,
  businessType: string,
): void {
  logger.info('Webhook dispatched (stub)', {
    event:        'lead.captured',
    leadId,
    score,
    isDuplicate,
    sessionId,
    businessType,
    timestamp:    new Date().toISOString(),
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Process a public lead capture submission.
 *
 * Execution order:
 *  1. Bot guard       — reject if honeypot is filled
 *  2. Duplicate check — return existing lead if within dedup window
 *  3. Score compute   — calculate quality score
 *  4. Device enrich   — infer deviceType from UA when not supplied
 *  5. Create lead     — delegate to leads.service.createLead()
 *  6. Update score    — store the computed score on the new lead
 *  7. Webhook stub    — log structured event for Phase 2
 *
 * @param body       — Validated CaptureLeadBody from the request
 * @param ipAddress  — Real client IP (extracted from headers by the controller)
 * @param userAgent  — Raw User-Agent header for device inference
 */
export async function captureLeadPublic(
  body:       CaptureLeadBody,
  ipAddress?: string,
  userAgent?: string,
): Promise<CaptureResult> {

  // ── 1. Bot guard ────────────────────────────────────────────────────────────
  // The `website` field is invisible to real users. If it contains any value
  // we are dealing with an automated submission. We throw a generic AppError so
  // the route returns 422 — the same shape as a validation error — avoiding
  // exposure of the detection mechanism through a distinct 4xx code.
  if (body.website && body.website.trim().length > 0) {
    logger.warn('Honeypot triggered — bot submission discarded', {
      email:     body.email,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });
    throw new AppError(422, 'SPAM_DETECTED', 'Submission could not be processed.');
  }

  const sessionId = body.sessionId ?? null;

  // ── Resolve tenant context ──────────────────────────────────────────────────
  // This is a public endpoint (no auth). Derive tenantId from the artist when
  // provided so dedup is scoped to the correct tenant and never crosses tenants.
  let tenantId: string | null = null;
  if (body.artistId) {
    const artist = await prisma.artist.findUnique({
      where:  { id: body.artistId },
      select: { tenantId: true },
    });
    tenantId = artist?.tenantId ?? null;
  }

  // ── 2. Duplicate check ──────────────────────────────────────────────────────
  const existing = await findDuplicate(body.email, body.artistId, DEDUP_WINDOW_MS, tenantId);
  if (existing) {
    logger.info('Duplicate lead submission — returning existing record', {
      existingId: existing.id,
      email:      body.email,
      artistId:   body.artistId ?? null,
    });
    dispatchWebhook(existing.id, existing.score, true, sessionId, body.utmSource ?? 'direct');
    return {
      leadId:      existing.id,
      score:       existing.score,
      isDuplicate: true,
      sessionId,
      capturedAt:  existing.createdAt.toISOString(),
    };
  }

  // ── 3. Score computation ────────────────────────────────────────────────────
  const score = computeLeadScore(body);

  // ── 4. Device enrichment ────────────────────────────────────────────────────
  // Client may send deviceType; if absent, infer from User-Agent.
  const enrichedBody = { ...body };
  if (!enrichedBody.deviceType) {
    const inferred = inferDeviceType(userAgent);
    if (inferred) enrichedBody.deviceType = inferred;
  }

  // ── 5. Create lead ──────────────────────────────────────────────────────────
  // Delegates to the canonical createLead() which handles:
  //   - DB write with select
  //   - AnalyticsEvent(LEAD_CREATED)
  //   - inquiry-received email stub
  //   - inquiry-notification email stub
  //   - WhatsApp message 1 stub
  const lead = await createLead(enrichedBody, ipAddress, tenantId);

  // ── 6. Update score ─────────────────────────────────────────────────────────
  // createLead always sets score = 0. We patch it with our computed value.
  if (score > 0) {
    await prisma.lead.update({
      where:  { id: lead.id },
      data:   { score },
      select: { id: true },
    });
  }

  // ── 7. Webhook dispatch ─────────────────────────────────────────────────────
  dispatchWebhook(lead.id, score, false, sessionId, lead.businessType);

  logger.info('Lead captured', {
    leadId:    lead.id,
    score,
    sessionId,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });

  return {
    leadId:      lead.id,
    score,
    isDuplicate: false,
    sessionId,
    capturedAt:  lead.createdAt.toISOString(),
  };
}
