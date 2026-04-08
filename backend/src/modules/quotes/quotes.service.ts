/**
 * Quotes service — Step 1.8
 *
 * Handles all business logic for the Quote Management API.
 *
 * Quote status lifecycle:
 *   DRAFT → SENT → ACCEPTED  (creates Booking + moves Lead → BOOKED)
 *                → REJECTED
 *                → EXPIRED   (runtime check on validUntil — no queue in Phase 1)
 *
 * Business rules:
 *  - Only DRAFT quotes can be edited or sent
 *  - Only SENT quotes can be accepted or rejected
 *  - Expired quotes (validUntil < now) cannot be accepted → 409 QUOTE_EXPIRED
 *  - Accepting a quote creates a Booking atomically (Prisma transaction)
 *  - ARTIST actors can only read/manage their own quotes
 *  - ADMIN actors see and manage all quotes
 *
 * Email side-effects (log stubs — Phase 2 wires Resend via BullMQ):
 *  - quote-sent     → customer receives the price proposal
 *  - quote-accepted → customer/admin confirmation email + .ics invite (Phase 2)
 *  - quote-rejected → internal notification to studio
 */
import { Prisma } from '@prisma/client';

import { prisma }         from '../../lib/prisma';
import { AppError }       from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import { logger }         from '../../utils/logger';
import { enqueueWebhookEvent } from '../webhooks/webhooks.queue';
import type {
  CreateQuoteBody,
  ListQuotesQuery,
  UpdateQuoteBody,
  AcceptQuoteBody,
} from './quotes.schema';

// ─── Actor role type ──────────────────────────────────────────────────────────

/** Roles that can reach the quote endpoints — CUSTOMER is excluded at the router level. */
type ActorRole = 'ADMIN' | 'ARTIST';

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/**
 * Full detail shape — returned by create, get, update, send, accept, reject.
 * Using `satisfies Prisma.QuoteSelect` lets TypeScript verify the shape while
 * still inferring the exact literal type for `QuoteGetPayload`.
 */
const quoteDetailSelect = {
  id:          true,
  leadId:      true,
  artistId:    true,
  price:       true,
  hours:       true,
  notes:       true,
  validUntil:  true,
  status:      true,
  sentAt:      true,
  respondedAt: true,
  createdAt:   true,
  updatedAt:   true,
  lead: {
    select: { id: true, name: true, email: true, phone: true, status: true },
  },
  artist: {
    select: {
      id:   true,
      slug: true,
      user: { select: { name: true, email: true } },
    },
  },
  booking: {
    select: { id: true, status: true, startAt: true, endAt: true },
  },
} satisfies Prisma.QuoteSelect;

/** Slimmer list shape — returned on GET /api/quotes */
const quoteListSelect = {
  id:         true,
  leadId:     true,
  artistId:   true,
  price:      true,
  hours:      true,
  validUntil: true,
  status:     true,
  sentAt:     true,
  createdAt:  true,
  updatedAt:  true,
  lead: {
    select: { id: true, name: true, email: true },
  },
  artist: {
    select: { id: true, slug: true, user: { select: { name: true } } },
  },
} satisfies Prisma.QuoteSelect;

// ─── Inferred return types ────────────────────────────────────────────────────

export type QuoteDetail   = Prisma.QuoteGetPayload<{ select: typeof quoteDetailSelect }>;
export type QuoteListItem = Prisma.QuoteGetPayload<{ select: typeof quoteListSelect }>;

// ─── Email side-effect stubs ──────────────────────────────────────────────────

/** Phase 2 replaces this with a BullMQ job → Resend API. */
function queueQuoteSentEmail(quoteId: string, leadId: string): void {
  logger.info('Email job queued (stub)', { job: 'quote-sent', quoteId, leadId });
}

/** Phase 2 replaces this with a BullMQ job → Resend API + .ics attachment. */
function queueQuoteAcceptedEmail(quoteId: string, leadId: string): void {
  logger.info('Email job queued (stub)', { job: 'quote-accepted', quoteId, leadId });
}

/** Phase 2 replaces this with a BullMQ job → Resend API. */
function queueQuoteRejectedEmail(quoteId: string, leadId: string): void {
  logger.info('Email job queued (stub)', { job: 'quote-rejected', quoteId, leadId });
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Resolve the Artist.id for a given User.id.
 * Throws 403 FORBIDDEN if the user has no associated Artist record.
 */
async function findArtistIdForUser(userId: string): Promise<string> {
  const artist = await prisma.artist.findFirst({
    where:  { userId },
    select: { id: true },
  });
  if (!artist) {
    throw new AppError(403, 'FORBIDDEN', 'No artist profile found for this user account');
  }
  return artist.id;
}

/**
 * Fetch a full quote detail by ID. Throws 404 NOT_FOUND if not found.
 * Used internally after mutations to always return a consistent response shape.
 */
async function fetchQuoteDetail(id: string): Promise<QuoteDetail> {
  const quote = await prisma.quote.findUnique({
    where:  { id },
    select: quoteDetailSelect,
  });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quote not found');
  return quote;
}

/**
 * Assert a lead exists and is in a quotable status.
 * Throws 404 if lead is not found, 409 if it is in a terminal/non-quotable state.
 */
async function assertLeadIsQuotable(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where:  { id: leadId },
    select: { id: true, status: true },
  });

  if (!lead) {
    throw new AppError(404, 'NOT_FOUND', `Lead ${leadId} not found`);
  }

  const nonQuotable = ['BOOKED', 'COMPLETED', 'CANCELLED', 'LOST'];
  if (nonQuotable.includes(lead.status)) {
    throw new AppError(
      409,
      'CONFLICT',
      `Cannot create a quote for a lead with status ${lead.status}`,
    );
  }
}

/**
 * Parse an optional ISO date string into a `Date` object.
 * Returns `undefined` when the string is absent or not a valid date.
 * End-of-day adjustment applied when `endOfDay = true`.
 */
function parseDateFilter(raw: string | undefined, endOfDay = false): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new DRAFT quote for a lead.
 *
 * - ARTIST actors: artistId is auto-resolved from their User → Artist profile.
 * - ADMIN actors: must supply `artistId` in the request body.
 *
 * Default `validUntil` = 7 days from now.
 */
export async function createQuote(
  body: CreateQuoteBody,
  actorId: string,
  actorRole: ActorRole,
): Promise<QuoteDetail> {
  // Resolve artistId based on caller role
  let resolvedArtistId: string;

  if (actorRole === 'ARTIST') {
    resolvedArtistId = await findArtistIdForUser(actorId);
  } else {
    // ADMIN
    if (!body.artistId) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'artistId is required when creating a quote as ADMIN',
      );
    }
    resolvedArtistId = body.artistId;
  }

  // Validate lead is in a quotable state
  await assertLeadIsQuotable(body.leadId);

  // Build validUntil (default 7 days from now)
  const validUntil = body.validUntil
    ? new Date(body.validUntil)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const created = await prisma.quote.create({
    data: {
      leadId:     body.leadId,
      artistId:   resolvedArtistId,
      price:      body.price,
      hours:      body.hours   ?? null,
      notes:      body.notes   ?? null,
      validUntil,
      status:     'DRAFT',
    },
    select: { id: true },
  });

  return fetchQuoteDetail(created.id);
}

/**
 * List quotes with optional filters and pagination.
 *
 * ARTIST actors are automatically scoped to their own quotes.
 * ADMIN actors see all quotes, optionally filtered by `artistId`.
 */
export async function listQuotes(
  query: ListQuotesQuery,
  actorId: string,
  actorRole: ActorRole,
): Promise<PaginatedResult<QuoteListItem>> {
  // Determine the artistId constraint
  let artistIdFilter: string | undefined;

  if (actorRole === 'ARTIST') {
    // ARTISTs are always scoped to their own quotes
    artistIdFilter = await findArtistIdForUser(actorId);
  } else if (query.artistId) {
    // ADMIN may optionally filter by a specific artist
    artistIdFilter = query.artistId;
  }

  const from = parseDateFilter(query.from);
  const to   = parseDateFilter(query.to, true);

  const where: Prisma.QuoteWhereInput = {
    ...(artistIdFilter && { artistId: artistIdFilter }),
    ...(query.status   && { status:   query.status }),
    ...(query.leadId   && { leadId:   query.leadId }),
    ...((from || to)   && {
      createdAt: {
        ...(from && { gte: from }),
        ...(to   && { lte: to }),
      },
    }),
  };

  return paginate<QuoteListItem>(
    prisma.quote,
    { where, select: quoteListSelect, orderBy: { createdAt: 'desc' } },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Return a single quote by ID with full relation detail.
 *
 * ARTIST actors can only retrieve their own quotes → 403 if artistId differs.
 * ADMIN actors can retrieve any quote.
 */
export async function getQuoteById(
  id: string,
  actorId: string,
  actorRole: ActorRole,
): Promise<QuoteDetail> {
  const quote = await fetchQuoteDetail(id);

  if (actorRole === 'ARTIST') {
    const artistId = await findArtistIdForUser(actorId);
    if (quote.artistId !== artistId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view this quote');
    }
  }

  return quote;
}

/**
 * Update an editable (DRAFT) quote.
 *
 * Only DRAFT quotes can be modified. ARTIST actors can only edit their own quotes.
 * Providing `notes: ""` clears the notes field.
 */
export async function updateQuote(
  id: string,
  body: UpdateQuoteBody,
  actorId: string,
  actorRole: ActorRole,
): Promise<QuoteDetail> {
  const quote = await prisma.quote.findUnique({
    where:  { id },
    select: { id: true, status: true, artistId: true, leadId: true },
  });

  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quote not found');

  if (quote.status !== 'DRAFT') {
    throw new AppError(
      409,
      'CONFLICT',
      `Only DRAFT quotes can be edited. This quote has status ${quote.status}`,
    );
  }

  if (actorRole === 'ARTIST') {
    const artistId = await findArtistIdForUser(actorId);
    if (quote.artistId !== artistId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only edit your own quotes');
    }
  }

  await prisma.quote.update({
    where: { id },
    data:  {
      ...(body.price      !== undefined && { price:      body.price }),
      ...(body.hours      !== undefined && { hours:      body.hours }),
      ...(body.notes      !== undefined && { notes:      body.notes.length > 0 ? body.notes : null }),
      ...(body.validUntil !== undefined && { validUntil: new Date(body.validUntil) }),
    },
    select: { id: true },
  });

  return fetchQuoteDetail(id);
}

/**
 * Send a DRAFT quote to the customer.
 *
 * Transitions: DRAFT → SENT
 * Side-effects:
 *  - Sets sentAt = now()
 *  - Updates lead.status → QUOTED (if currently NEW or CONTACTED)
 *  - Queues "quote-sent" email stub
 *
 * ARTIST actors can only send their own quotes.
 */
export async function sendQuote(
  id: string,
  actorId: string,
  actorRole: ActorRole,
): Promise<QuoteDetail> {
  const quote = await prisma.quote.findUnique({
    where:  { id },
    select: { id: true, status: true, artistId: true, leadId: true },
  });

  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quote not found');

  if (quote.status !== 'DRAFT') {
    throw new AppError(
      409,
      'CONFLICT',
      `Only DRAFT quotes can be sent. This quote has status ${quote.status}`,
    );
  }

  if (actorRole === 'ARTIST') {
    const artistId = await findArtistIdForUser(actorId);
    if (quote.artistId !== artistId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only send your own quotes');
    }
  }

  // Transition quote to SENT
  await prisma.quote.update({
    where:  { id },
    data:   { status: 'SENT', sentAt: new Date() },
    select: { id: true },
  });

  // Advance lead status to QUOTED if it is still in an early pipeline state.
  // updateMany with a status filter is idempotent — safe to call regardless
  // of the current lead status; already-advanced leads are not affected.
  await prisma.lead
    .updateMany({
      where: { id: quote.leadId, status: { in: ['NEW', 'CONTACTED'] } },
      data:  { status: 'QUOTED' },
    })
    .catch((err: unknown) => {
      // Non-critical: quote has already been sent. Log and continue.
      logger.warn('Lead status advance to QUOTED failed (non-critical)', {
        quoteId: id,
        leadId:  quote.leadId,
        err,
      });
    });

  // Fire-and-forget email stub
  setImmediate(() => queueQuoteSentEmail(id, quote.leadId));

  return fetchQuoteDetail(id);
}

/**
 * Accept a SENT quote — the customer has agreed to the price.
 *
 * Transitions atomically (single Prisma transaction):
 *  1. quote.status = ACCEPTED, respondedAt = now()
 *  2. Booking created (status PENDING) with startAt/endAt from the request body
 *  3. lead.status = BOOKED
 *
 * ADMIN only (enforced at the router level).
 * Expired quotes (validUntil < now) are rejected with 409 QUOTE_EXPIRED.
 */
export async function acceptQuote(
  id: string,
  body: AcceptQuoteBody,
): Promise<QuoteDetail> {
  const quote = await prisma.quote.findUnique({
    where:  { id },
    select: { id: true, status: true, leadId: true, artistId: true, price: true, hours: true, validUntil: true },
  });

  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quote not found');

  if (quote.status !== 'SENT') {
    throw new AppError(
      409,
      'CONFLICT',
      `Only SENT quotes can be accepted. This quote has status ${quote.status}`,
    );
  }

  // Runtime expiry check (Phase 1 alternative to BullMQ delayed job)
  if (new Date() > new Date(quote.validUntil)) {
    throw new AppError(
      409,
      'QUOTE_EXPIRED',
      'This quote has expired and can no longer be accepted. Please issue a new quote.',
    );
  }

  const startAt = new Date(body.startAt);
  const endAt   = new Date(body.endAt);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Accept the quote
    await tx.quote.update({
      where:  { id },
      data:   { status: 'ACCEPTED', respondedAt: new Date() },
      select: { id: true },
    });

    // 2. Create Booking (PENDING)
    await tx.booking.create({
      data: {
        leadId:               quote.leadId,
        quoteId:              quote.id,
        artistId:             quote.artistId,
        startAt,
        endAt,
        status:               'PENDING',
        notes:                body.notes ?? null,
        totalAmount:          quote.price,
        totalDurationMinutes: quote.hours ? Math.round(quote.hours * 60) : null,
      },
      select: { id: true },
    });

    // 3. Advance lead to BOOKED
    await tx.lead.update({
      where:  { id: quote.leadId },
      data:   { status: 'BOOKED' },
      select: { id: true },
    });
  });

  // Fire-and-forget email stub
  setImmediate(() => queueQuoteAcceptedEmail(id, quote.leadId));

  // Outgoing Webhook — booking.created (fired after transaction commits)
  void enqueueWebhookEvent('booking.created', {
    quoteId:  id,
    leadId:   quote.leadId,
    artistId: quote.artistId,
    startAt:  body.startAt,
    endAt:    body.endAt,
  });

  return fetchQuoteDetail(id);
}

/**
 * Reject a SENT quote.
 *
 * Transitions: SENT → REJECTED
 * Lead status remains QUOTED — the studio may issue a revised quote or follow up.
 *
 * ADMIN only (enforced at the router level).
 */
export async function rejectQuote(id: string): Promise<QuoteDetail> {
  const quote = await prisma.quote.findUnique({
    where:  { id },
    select: { id: true, status: true, leadId: true },
  });

  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quote not found');

  if (quote.status !== 'SENT') {
    throw new AppError(
      409,
      'CONFLICT',
      `Only SENT quotes can be rejected. This quote has status ${quote.status}`,
    );
  }

  await prisma.quote.update({
    where:  { id },
    data:   { status: 'REJECTED', respondedAt: new Date() },
    select: { id: true },
  });

  // Fire-and-forget email stub
  setImmediate(() => queueQuoteRejectedEmail(id, quote.leadId));

  return fetchQuoteDetail(id);
}
