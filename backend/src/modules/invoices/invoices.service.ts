/**
 * Invoices service — Step 1.10
 *
 * Handles all business logic for the Invoice System API.
 *
 * Invoices are created automatically inside a Prisma transaction when a Booking
 * is marked COMPLETED (Step 1.9 — bookings.service.completeBooking). This module
 * provides the management layer to view, send, settle, and void invoices.
 *
 * Invoice status lifecycle:
 *   UNPAID  → PAID    (markInvoicePaid — ADMIN only)
 *   UNPAID  → OVERDUE (markOverdueInvoices — Phase 2 BullMQ daily cron)
 *   UNPAID  → VOID    (voidInvoice — ADMIN only)
 *   OVERDUE → PAID    (markInvoicePaid — ADMIN only)
 *   OVERDUE → VOID    (voidInvoice — ADMIN only)
 *   PAID    — terminal state; no further transitions
 *   VOID    — terminal state; no further transitions
 *
 * Actor scoping:
 *   ADMIN  — full access to all invoices
 *   ARTIST — read/send access only, scoped to their own artist profile's bookings
 *
 * Email side-effects (log stubs — Phase 2 wires Resend via BullMQ):
 *   sendInvoice → queues `invoice` email to the booking customer
 */
import { Prisma } from '@prisma/client';

import { prisma }                     from '../../lib/prisma';
import { AppError }                   from '../../errors/AppError';
import { paginate, PaginatedResult }  from '../../utils/paginate';
import { logger }                     from '../../utils/logger';
import { isFeatureEnabled }           from '../../middleware/requireFeature';
import type {
  ListInvoicesQuery,
  MarkPaidBody,
  VoidInvoiceBody,
  InvoiceStatusValue,
} from './invoices.schema';
import { ACTIONABLE_STATUSES } from './invoices.schema';

// ─── Actor role type ──────────────────────────────────────────────────────────

type ActorRole = 'ADMIN' | 'ARTIST';

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/**
 * Full invoice detail shape — returned by all endpoints.
 *
 * Includes booking context (customer, artist) so the caller never needs a
 * second request to show who the invoice is for.
 */
const invoiceDetailSelect = {
  id:        true,
  bookingId: true,
  amount:    true,
  currency:  true,
  status:    true,
  dueDate:   true,
  paidAt:    true,
  voidedAt:  true,
  sentAt:    true,
  notes:     true,
  lineItems: true,
  createdAt: true,
  updatedAt: true,
  booking: {
    select: {
      id:       true,
      tenantId: true,
      startAt: true,
      endAt:   true,
      status:  true,
      artist: {
        select: {
          id:   true,
          slug: true,
          user: { select: { name: true, email: true } },
        },
      },
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  },
} satisfies Prisma.InvoiceSelect;

/** Slimmer list shape — returned on GET /api/invoices. */
const invoiceListSelect = {
  id:        true,
  bookingId: true,
  amount:    true,
  currency:  true,
  status:    true,
  dueDate:   true,
  paidAt:    true,
  sentAt:    true,
  createdAt: true,
  updatedAt: true,
  booking: {
    select: {
      id:      true,
      startAt: true,
      status:  true,
      artist: {
        select: {
          id:   true,
          slug: true,
          user: { select: { name: true } },
        },
      },
      customer: {
        select: { id: true, name: true, email: true },
      },
    },
  },
} satisfies Prisma.InvoiceSelect;

// ─── Inferred return types ────────────────────────────────────────────────────

export type InvoiceDetail   = Prisma.InvoiceGetPayload<{ select: typeof invoiceDetailSelect }>;
export type InvoiceListItem = Prisma.InvoiceGetPayload<{ select: typeof invoiceListSelect }>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve the Artist record that belongs to the given user.
 * Throws 404 when the user has no artist profile.
 */
async function resolveArtistId(userId: string): Promise<string> {
  const artist = await prisma.artist.findFirst({
    where:  { userId },
    select: { id: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist profile not found');
  }
  return artist.id;
}

/**
 * Parse an optional ISO date string into a `Date` object.
 * Returns `undefined` when the string is absent or not a valid date.
 * End-of-day adjustment is applied when `endOfDay = true`.
 */
function parseDateFilter(raw: string | undefined, endOfDay = false): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setUTCHours(23, 59, 59, 999);
  return d;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List invoices (ADMIN only).
 *
 * Supports optional filtering by status and date range (createdAt).
 * Returns a paginated result ordered by createdAt descending.
 */
export async function listInvoices(
  tenantId: string | null,
  query: ListInvoicesQuery,
): Promise<PaginatedResult<InvoiceListItem>> {
  const where: Prisma.InvoiceWhereInput = {};

  if (tenantId !== null) {
    where.booking = { tenantId };
  }

  if (query.status) where.status = query.status;

  const gte = parseDateFilter(query.from);
  const lte = parseDateFilter(query.to, true);
  if (gte || lte) {
    where.createdAt = {
      ...(gte && { gte }),
      ...(lte && { lte }),
    };
  }

  return paginate<InvoiceListItem>(
    prisma.invoice,
    { where, select: invoiceListSelect, orderBy: { createdAt: 'desc' } },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Fetch a single invoice by ID.
 *
 * ADMIN — can retrieve any invoice.
 * ARTIST — can only retrieve invoices belonging to their own bookings.
 *
 * Throws 404 when not found.
 * Throws 403 when an ARTIST tries to access another artist's invoice.
 */
export async function getInvoiceById(
  id:        string,
  actorId:   string,
  actorRole: ActorRole,
  tenantId:  string | null,
): Promise<InvoiceDetail> {
  const invoice = await prisma.invoice.findUnique({
    where:  { id },
    select: invoiceDetailSelect,
  });

  if (!invoice) {
    throw new AppError(404, 'INVOICE_NOT_FOUND', `Invoice '${id}' not found`);
  }

  if (tenantId !== null && invoice.booking.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this invoice');
  }

  if (actorRole === 'ARTIST') {
    const artistId = await resolveArtistId(actorId);
    if (invoice.booking.artist.id !== artistId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only view your own invoices');
    }
  }

  return invoice;
}

/**
 * Mark an invoice as sent to the customer.
 *
 * Sets `sentAt` to the current UTC timestamp.
 * Re-sending is allowed (sentAt is simply overwritten) so corrections are easy.
 * Voided invoices cannot be sent — return 409.
 *
 * ADMIN — can send any non-voided invoice.
 * ARTIST — can send only invoices belonging to their own bookings.
 *
 * Side-effect (log stub — Phase 2 wires Resend via BullMQ):
 *   Enqueues `invoice` email to the booking customer.
 */
export async function sendInvoice(
  id:        string,
  actorId:   string,
  actorRole: ActorRole,
  tenantId:  string | null,
): Promise<InvoiceDetail> {
  const invoice = await prisma.invoice.findUnique({
    where:  { id },
    select: { id: true, status: true, booking: { select: { tenantId: true, artist: { select: { id: true } }, customer: { select: { email: true, name: true } } } } },
  });

  if (!invoice) {
    throw new AppError(404, 'INVOICE_NOT_FOUND', `Invoice '${id}' not found`);
  }

  if (tenantId !== null && invoice.booking.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to send this invoice');
  }

  if (invoice.status === 'VOID') {
    throw new AppError(409, 'INVOICE_VOIDED', 'Cannot send a voided invoice');
  }

  if (actorRole === 'ARTIST') {
    const artistId = await resolveArtistId(actorId);
    if (invoice.booking.artist.id !== artistId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only send your own invoices');
    }
  }

  await prisma.invoice.update({
    where:  { id },
    data:   { sentAt: new Date() },
    select: { id: true },
  });

  // ── Side-effect (log stub — Phase 2 wires Resend via BullMQ) ─────────────
  logger.info('Email job queued (stub)', {
    job:           'invoice',
    invoiceId:     id,
    customerEmail: invoice.booking.customer?.email ?? null,
    customerName:  invoice.booking.customer?.name  ?? null,
  });

  const updated = await prisma.invoice.findUnique({
    where:  { id },
    select: invoiceDetailSelect,
  });

  if (!updated) {
    throw new AppError(500, 'INTERNAL_ERROR', `Invoice '${id}' not found after send`);
  }

  return updated;
}

/**
 * Mark an invoice as paid (ADMIN only).
 *
 * Allowed transitions: UNPAID → PAID, OVERDUE → PAID.
 * PAID and VOID invoices cannot be marked paid — returns 409.
 *
 * An optional `paidAt` timestamp may be supplied; defaults to now.
 * Optional `notes` are appended to the invoice record.
 */
export async function markInvoicePaid(
  id:   string,
  body: MarkPaidBody,
  tenantId: string | null,
): Promise<InvoiceDetail> {
  const invoice = await prisma.invoice.findUnique({
    where:  { id },
    select: { id: true, status: true, booking: { select: { tenantId: true } } },
  });

  if (!invoice) {
    throw new AppError(404, 'INVOICE_NOT_FOUND', `Invoice '${id}' not found`);
  }

  if (tenantId !== null && invoice.booking.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to modify this invoice');
  }

  const currentStatus = invoice.status as InvoiceStatusValue;

  if (currentStatus === 'PAID') {
    throw new AppError(409, 'INVOICE_ALREADY_PAID', 'Invoice is already marked as paid');
  }

  if (currentStatus === 'VOID') {
    throw new AppError(409, 'INVOICE_VOIDED', 'Cannot mark a voided invoice as paid');
  }

  if (!(ACTIONABLE_STATUSES as string[]).includes(currentStatus)) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot mark an invoice with status '${currentStatus}' as paid`,
    );
  }

  const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();

  await prisma.invoice.update({
    where:  { id },
    data: {
      status: 'PAID',
      paidAt,
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    select: { id: true },
  });

  logger.info('Invoice marked paid', { invoiceId: id, paidAt });

  const updated = await prisma.invoice.findUnique({
    where:  { id },
    select: invoiceDetailSelect,
  });

  if (!updated) {
    throw new AppError(500, 'INTERNAL_ERROR', `Invoice '${id}' not found after update`);
  }

  return updated;
}

/**
 * Void an invoice (ADMIN only).
 *
 * Allowed transitions: UNPAID → VOID, OVERDUE → VOID.
 * PAID invoices cannot be voided (they must be manually reversed outside the system).
 * Already-VOID invoices return 409.
 *
 * Optional `notes` are appended (e.g. reason for voiding).
 */
export async function voidInvoice(
  id:   string,
  body: VoidInvoiceBody,
  tenantId: string | null,
): Promise<InvoiceDetail> {
  const invoice = await prisma.invoice.findUnique({
    where:  { id },
    select: { id: true, status: true, booking: { select: { tenantId: true } } },
  });

  if (!invoice) {
    throw new AppError(404, 'INVOICE_NOT_FOUND', `Invoice '${id}' not found`);
  }

  if (tenantId !== null && invoice.booking.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to void this invoice');
  }

  const currentStatus = invoice.status as InvoiceStatusValue;

  if (currentStatus === 'VOID') {
    throw new AppError(409, 'INVOICE_ALREADY_VOIDED', 'Invoice is already voided');
  }

  if (currentStatus === 'PAID') {
    throw new AppError(409, 'INVOICE_ALREADY_PAID', 'Cannot void a paid invoice');
  }

  if (!(ACTIONABLE_STATUSES as string[]).includes(currentStatus)) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot void an invoice with status '${currentStatus}'`,
    );
  }

  await prisma.invoice.update({
    where:  { id },
    data: {
      status:   'VOID',
      voidedAt: new Date(),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    select: { id: true },
  });

  logger.info('Invoice voided', { invoiceId: id });

  const updated = await prisma.invoice.findUnique({
    where:  { id },
    select: invoiceDetailSelect,
  });

  if (!updated) {
    throw new AppError(500, 'INTERNAL_ERROR', `Invoice '${id}' not found after void`);
  }

  return updated;
}

/**
 * Mark UNPAID invoices whose `dueDate` is in the past as OVERDUE,
 * respecting per-tenant INVOICE_AUTOMATION_ENABLED flag overrides.
 *
 * Processing strategy:
 *  1. Find all overdue-eligible invoices (UNPAID, dueDate < now).
 *  2. Identify the distinct tenantIds from their bookings.
 *  3. For each tenantId, check the INVOICE_AUTOMATION_ENABLED flag.
 *  4. Only update invoices belonging to tenants where the flag is enabled.
 *
 * Safe to call multiple times — already-OVERDUE invoices are not re-processed
 * because the `where` clause explicitly filters for `UNPAID` only.
 *
 * Returns the total number of invoices updated across all tenants.
 */
export async function markOverdueInvoices(): Promise<number> {
  const now = new Date();

  // Step 1: Find distinct tenantIds among overdue-eligible invoices
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status:  'UNPAID',
      dueDate: { lt: now },
    },
    select: { booking: { select: { tenantId: true } } },
  });

  // Build unique tenantId set (null tenantId treated as global/unscoped)
  const tenantIds = [...new Set(overdueInvoices.map((inv) => inv.booking.tenantId))];

  if (tenantIds.length === 0) return 0;

  let totalCount = 0;

  // Step 2: Process per-tenant with flag check
  for (const tenantId of tenantIds) {
    const enabled = await isFeatureEnabled('INVOICE_AUTOMATION_ENABLED', tenantId);
    if (!enabled) {
      logger.debug('Invoice overdue skipped for tenant — INVOICE_AUTOMATION_ENABLED is off', { tenantId });
      continue;
    }

    const result = await prisma.invoice.updateMany({
      where: {
        status:  'UNPAID',
        dueDate: { lt: now },
        booking: { tenantId },
      },
      data: { status: 'OVERDUE' },
    });

    totalCount += result.count;
  }

  if (totalCount > 0) {
    logger.info('Overdue invoices marked', { count: totalCount });
  }

  return totalCount;
}
