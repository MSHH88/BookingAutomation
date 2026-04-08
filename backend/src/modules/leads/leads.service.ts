/**
 * Leads service — all business logic for lead capture and CRM management.
 *
 * Responsibilities:
 *  - createLead       — public submission (gated by LEAD_CAPTURE_ENABLED flag)
 *  - listLeads        — ADMIN-only paginated list with filters
 *  - getLeadById      — ADMIN-only single lead detail
 *  - exportLeadsCsv   — ADMIN-only full CSV dump
 *  - updateLeadStatus — ADMIN-only status pipeline transition
 *  - updateLeadScore  — ADMIN-only CRM score update
 *
 * Async side-effects on createLead (fire-and-forget — no queue in Phase 1):
 *  1. AnalyticsEvent record (LEAD_CREATED)
 *  2. inquiry-received email to customer         (stub — Phase 2 hooks Resend)
 *  3. inquiry-notification email to ADMIN        (stub — Phase 2 hooks Resend)
 *  4. inquiry-notification to artistId if set    (stub — Phase 2 hooks Resend)
 *  5. WhatsApp Message 1 if preferWhatsApp + flag (BullMQ queue — Step 1.17)
 *
 * The stubs emit structured log lines so Phase 2 can wire real providers with
 * zero structural changes to this service.
 */
import { Prisma } from '@prisma/client';

import { prisma }          from '../../lib/prisma';
import { AppError }        from '../../errors/AppError';
import { paginate }        from '../../utils/paginate';
import { logger }          from '../../utils/logger';
import { config }          from '../../config/index';
import { getDefaultFlags } from '../../config/businessType';
import { enqueueLeadInquiry } from '../whatsapp/whatsapp.service';
import { enqueueWebhookEvent } from '../webhooks/webhooks.queue';
import type {
  CreateLeadBody,
  ListLeadsQuery,
  ExportLeadsQuery,
  UpdateLeadStatusBody,
  UpdateLeadScoreBody,
  LeadStatusValue,
} from './leads.schema';
import { VALID_TRANSITIONS as validTransitions } from './leads.schema';

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/**
 * Full detail shape — returned to ADMIN on GET /api/leads/:id and all
 * mutation endpoints (createLead, updateLeadStatus, updateLeadScore).
 *
 * Using `satisfies Prisma.LeadSelect` lets TypeScript verify the shape is a
 * valid select while still inferring the exact literal type for
 * `Prisma.LeadGetPayload<{ select: typeof leadDetailSelect }>`.
 */
const leadDetailSelect = {
  id:               true,
  name:             true,
  email:            true,
  phone:            true,
  country:          true,
  description:      true,
  placement:        true,
  size:             true,
  colorPreference:  true,
  referenceImages:  true,
  preferredDates:   true,
  preferWhatsApp:   true,
  marketingConsent: true,
  status:           true,
  score:            true,
  businessType:     true,
  pageVisited:      true,
  source:           true,
  utmSource:        true,
  utmMedium:        true,
  utmCampaign:      true,
  ipAddress:        true,
  deviceType:       true,
  createdAt:        true,
  updatedAt:        true,
  artistId:         true,
  styleId:          true,
  serviceId:        true,
  artist: {
    select: {
      id:   true,
      slug: true,
      user: { select: { name: true, email: true } },
    },
  },
  style: {
    select: { id: true, name: true },
  },
  service: {
    select: { id: true, name: true },
  },
  quotes: {
    select: {
      id:         true,
      price:      true,
      status:     true,
      validUntil: true,
      createdAt:  true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
  analyticsEvents: {
    select: {
      id:        true,
      eventType: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
    take: 10,
  },
} satisfies Prisma.LeadSelect;

/** Slimmer list shape — used on GET /api/leads */
const leadListSelect = {
  id:           true,
  name:         true,
  email:        true,
  phone:        true,
  country:      true,
  status:       true,
  score:        true,
  businessType: true,
  source:       true,
  utmSource:    true,
  artistId:     true,
  serviceId:    true,
  createdAt:    true,
  updatedAt:    true,
  artist: {
    select: {
      id:   true,
      slug: true,
      user: { select: { name: true } },
    },
  },
  service: {
    select: { id: true, name: true },
  },
} satisfies Prisma.LeadSelect;

// ─── Inferred return types ────────────────────────────────────────────────────

export type LeadDetail   = Prisma.LeadGetPayload<{ select: typeof leadDetailSelect }>;
export type LeadListItem = Prisma.LeadGetPayload<{ select: typeof leadListSelect }>;

// ─── Async side-effect stubs ──────────────────────────────────────────────────

/**
 * Queue inquiry-received email to the customer.
 * Phase 2 will replace this log stub with a BullMQ job enqueue via Resend.
 */
function queueInquiryReceivedEmail(leadId: string, email: string, name: string): void {
  logger.info('Email job queued (stub)', { job: 'inquiry-received', leadId, email, name });
}

/**
 * Queue inquiry-notification email to ADMIN + optionally the artist.
 * Phase 2 will replace this log stub with a BullMQ job enqueue via Resend.
 */
function queueInquiryNotificationEmail(leadId: string, artistId?: string | null): void {
  logger.info('Admin notification email job queued (stub)', {
    job: 'inquiry-notification',
    leadId,
    artistId: artistId ?? null,
    adminEmail: config.STUDIO_ADMIN_EMAIL,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Coerce a `Record<string, unknown> | null | undefined` to a Prisma nullable JSON value. */
function toNullableJson(
  val: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return val !== undefined && val !== null ? (val as Prisma.InputJsonValue) : Prisma.JsonNull;
}

/**
 * Parse an optional ISO date string into a `Date` object.
 * Returns `undefined` when the string is absent or not a valid date.
 * Inclusive end-of-day adjustment is applied when `endOfDay = true`.
 */
function parseDateFilter(
  raw: string | undefined,
  endOfDay = false,
): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

/** Build a Prisma `DateTimeFilter` from optional `from`/`to` strings. */
function buildDateRange(
  from: string | undefined,
  to:   string | undefined,
): Prisma.DateTimeFilter | undefined {
  const gte = parseDateFilter(from);
  const lte = parseDateFilter(to, true);
  if (!gte && !lte) return undefined;
  return { ...(gte && { gte }), ...(lte && { lte }) };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new Lead record from a public form submission.
 *
 * Strategy: create the bare record first (minimal select for side-effects),
 * then fetch the full detail shape via getLeadById. This avoids complex nested
 * select inference on `create` and always returns a consistent shape.
 *
 * Side-effects (fire-and-forget — errors do NOT fail the HTTP response):
 *  1. AnalyticsEvent(LEAD_CREATED) row
 *  2. inquiry-received email to customer
 *  3. inquiry-notification email to ADMIN (+ artist if artistId set)
 *  4. WhatsApp message 1 if opted in and feature flag is ON
 */
export async function createLead(
  body: CreateLeadBody,
  ipAddress?: string,
): Promise<LeadDetail> {
  const businessType = config.BUSINESS_TYPE;
  const flags = getDefaultFlags();

  const created = await prisma.lead.create({
    data: {
      name:             body.name,
      email:            body.email.toLowerCase(),
      phone:            body.phone,
      country:          body.country           ?? null,
      description:      body.description,
      placement:        toNullableJson(body.placement),
      size:             body.size              ?? null,
      colorPreference:  body.colorPreference   ?? null,
      referenceImages:  body.referenceImages   ?? [],
      preferredDates:   toNullableJson(body.preferredDates),
      preferWhatsApp:   body.preferWhatsApp    ?? false,
      marketingConsent: body.marketingConsent  ?? false,
      businessType,
      pageVisited:  body.pageVisited  ?? null,
      source:       body.source       ?? null,
      utmSource:    body.utmSource    ?? null,
      utmMedium:    body.utmMedium    ?? null,
      utmCampaign:  body.utmCampaign  ?? null,
      ipAddress:    ipAddress         ?? null,
      deviceType:   body.deviceType   ?? null,
      artistId:     body.artistId     ?? null,
      styleId:      body.styleId      ?? null,
      serviceId:    body.serviceId    ?? null,
      status: 'NEW',
      score: 0,
    },
    select: {
      id:            true,
      artistId:      true,
      phone:         true,
      preferWhatsApp: true,
      email:         true,
      name:          true,
      utmSource:     true,
      utmMedium:     true,
      utmCampaign:   true,
      ipAddress:     true,
    },
  });

  // ── Side-effects (fire-and-forget) ────────────────────────────────────────
  // We deliberately do NOT await these; a downstream failure must not roll
  // back the lead creation. Phase 2 moves these into BullMQ queues.
  setImmediate(() => {
    try {
      // 1. Analytics event
      prisma.analyticsEvent
        .create({
          data: {
            eventType:   'LEAD_CREATED',
            leadId:      created.id,
            ipAddress:   created.ipAddress  ?? null,
            utmSource:   created.utmSource  ?? null,
            utmMedium:   created.utmMedium  ?? null,
            utmCampaign: created.utmCampaign ?? null,
            payload:     { businessType } as Prisma.InputJsonValue,
          },
        })
        .catch((err: unknown) =>
          logger.error('AnalyticsEvent create failed', { err, leadId: created.id }),
        );

      // 2. Email to customer
      queueInquiryReceivedEmail(created.id, created.email, created.name);

      // 3. Email to ADMIN + artist
      queueInquiryNotificationEmail(created.id, created.artistId);

      // 4. WhatsApp (opt-in + feature flag) — real BullMQ enqueue (Step 1.17)
      if (created.preferWhatsApp && flags['WHATSAPP_CONTACT_ENABLED']) {
        void enqueueLeadInquiry({
          phone:          created.phone,
          customerName:   created.name,
          preferWhatsApp: created.preferWhatsApp,
          studioName:     config.STUDIO_NAME,
          leadId:         created.id,
          artistId:       created.artistId ?? undefined,
        });
      }

      // 5. Outgoing Webhook — lead.created
      void enqueueWebhookEvent('lead.created', {
        leadId:      created.id,
        name:        created.name,
        email:       created.email,
        status:      'NEW',
        artistId:    created.artistId ?? null,
        businessType,
      });
    } catch (err) {
      logger.error('Lead side-effect error', { err, leadId: created.id });
    }
  });

  // Fetch and return the full detail shape
  return getLeadById(created.id);
}

/**
 * List all leads (ADMIN only) with optional filters and pagination.
 */
export async function listLeads(query: ListLeadsQuery) {
  const where: Prisma.LeadWhereInput = {};

  if (query.status)       where.status       = query.status;
  if (query.businessType) where.businessType = query.businessType;
  if (query.artistId)     where.artistId     = query.artistId;
  if (query.country)      where.country      = { equals: query.country, mode: 'insensitive' };
  if (query.source)       where.source       = { equals: query.source,  mode: 'insensitive' };

  if (query.from || query.to) {
    const range = buildDateRange(query.from, query.to);
    if (range) where.createdAt = range;
  }

  return paginate<LeadListItem>(
    prisma.lead,
    {
      where,
      select:  leadListSelect,
      orderBy: { createdAt: 'desc' },
    },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Fetch a single lead by ID (ADMIN only).
 */
export async function getLeadById(id: string): Promise<LeadDetail> {
  const lead = await prisma.lead.findUnique({
    where:  { id },
    select: leadDetailSelect,
  });
  if (!lead) {
    throw new AppError(404, 'LEAD_NOT_FOUND', `Lead '${id}' not found`);
  }
  return lead;
}

/**
 * Export all (or filtered) leads as a CSV string (ADMIN only).
 *
 * Returns: { csv: string, filename: string }
 */
export async function exportLeadsCsv(
  query: ExportLeadsQuery,
): Promise<{ csv: string; filename: string }> {
  const where: Prisma.LeadWhereInput = {};

  if (query.status)       where.status       = query.status;
  if (query.businessType) where.businessType = query.businessType;
  if (query.artistId)     where.artistId     = query.artistId;
  if (query.country)      where.country      = { equals: query.country, mode: 'insensitive' };
  if (query.source)       where.source       = { equals: query.source,  mode: 'insensitive' };

  if (query.from || query.to) {
    const range = buildDateRange(query.from, query.to);
    if (range) where.createdAt = range;
  }

  const leads = await prisma.lead.findMany({
    where,
    select: {
      id:               true,
      name:             true,
      email:            true,
      phone:            true,
      country:          true,
      status:           true,
      score:            true,
      businessType:     true,
      description:      true,
      size:             true,
      colorPreference:  true,
      preferWhatsApp:   true,
      marketingConsent: true,
      pageVisited:      true,
      source:           true,
      utmSource:        true,
      utmMedium:        true,
      utmCampaign:      true,
      deviceType:       true,
      ipAddress:        true,
      createdAt:        true,
      artistId:         true,
      serviceId:        true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'id', 'name', 'email', 'phone', 'country',
    'status', 'score', 'businessType', 'description',
    'size', 'colorPreference', 'preferWhatsApp', 'marketingConsent',
    'pageVisited', 'source', 'utmSource', 'utmMedium', 'utmCampaign',
    'deviceType', 'ipAddress', 'artistId', 'serviceId', 'createdAt',
  ];

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const s = val instanceof Date ? val.toISOString() : String(val);
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = leads.map((lead) =>
    headers
      .map((h) => escapeCell((lead as Record<string, unknown>)[h]))
      .join(','),
  );

  const csv = [headers.join(','), ...rows].join('\r\n');
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename  = `leads-export-${timestamp}.csv`;

  return { csv, filename };
}

/**
 * Update the status of a lead (ADMIN only).
 * Validates the transition is legal before applying it.
 */
export async function updateLeadStatus(
  id: string,
  body: UpdateLeadStatusBody,
): Promise<LeadDetail> {
  const existing = await prisma.lead.findUnique({
    where:  { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new AppError(404, 'LEAD_NOT_FOUND', `Lead '${id}' not found`);
  }

  const currentStatus = existing.status as LeadStatusValue;
  const nextStatus    = body.status    as LeadStatusValue;

  // Idempotent — re-applying the same status is a no-op
  if (currentStatus === nextStatus) {
    return getLeadById(id);
  }

  const allowed = validTransitions[currentStatus] ?? [];
  if (!(allowed as string[]).includes(nextStatus)) {
    throw new AppError(
      422,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition lead from '${currentStatus}' to '${nextStatus}'. ` +
        (allowed.length
          ? `Allowed transitions: ${allowed.join(', ')}`
          : 'No further transitions are allowed from this terminal state.'),
    );
  }

  await prisma.lead.update({
    where: { id },
    data:  { status: nextStatus },
    select: { id: true },
  });

  logger.info('Lead status updated', { leadId: id, from: currentStatus, to: nextStatus });

  // Outgoing Webhook — lead.status_changed
  void enqueueWebhookEvent('lead.status_changed', {
    leadId:     id,
    fromStatus: currentStatus,
    toStatus:   nextStatus,
  });

  return getLeadById(id);
}

/**
 * Update the CRM score of a lead (ADMIN only).
 * Score is an integer 0–100 representing lead quality.
 */
export async function updateLeadScore(
  id: string,
  body: UpdateLeadScoreBody,
): Promise<LeadDetail> {
  const existing = await prisma.lead.findUnique({
    where:  { id },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(404, 'LEAD_NOT_FOUND', `Lead '${id}' not found`);
  }

  await prisma.lead.update({
    where: { id },
    data:  { score: body.score },
    select: { id: true },
  });

  return getLeadById(id);
}
