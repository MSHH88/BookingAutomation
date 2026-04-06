/**
 * Invoices controller — Step 1.10
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic and DB access lives in invoices.service.ts.
 *
 * Role enforcement is handled at the router level (requireRole middleware).
 * Controllers simply forward `req.user.id` and `req.user.role` to service
 * functions that need actor context for ownership checks.
 */
import { Request, Response, NextFunction } from 'express';

import * as invoicesService from './invoices.service';
import { success, paginated } from '../../utils/apiResponse';
import type {
  ListInvoicesQuery,
  MarkPaidBody,
  VoidInvoiceBody,
} from './invoices.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/invoices
 * ADMIN only. Returns a paginated list of invoices.
 *
 * Optional query params:
 *   status — filter by InvoiceStatus
 *   from   — createdAt >= (ISO date)
 *   to     — createdAt <= (ISO date, end-of-day)
 *   page   — page number (default 1)
 *   limit  — records per page (default 20, max 100)
 */
export async function listInvoices(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query  = req.query as ListInvoicesQuery;
    const result = await invoicesService.listInvoices(query);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/invoices/:id
 * ADMIN or ARTIST. Returns full invoice detail.
 *
 * ARTISTs can only retrieve invoices belonging to their own bookings.
 * ADMINs can retrieve any invoice.
 */
export async function getInvoiceById(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }    = req.params as { id: string };
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const invoice   = await invoicesService.getInvoiceById(id, actorId, actorRole);
    res.json(success(invoice));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/invoices/:id/send
 * ADMIN or ARTIST. Marks the invoice as sent and queues the invoice email.
 *
 * ARTISTs can only send invoices for their own bookings.
 * Voided invoices cannot be sent (409 INVOICE_VOIDED).
 * Re-sending is allowed — sentAt is simply updated to now.
 */
export async function sendInvoice(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }    = req.params as { id: string };
    const actorId   = req.user!.id;
    const actorRole = req.user!.role as 'ADMIN' | 'ARTIST';
    const invoice   = await invoicesService.sendInvoice(id, actorId, actorRole);
    res.json(success(invoice));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/invoices/:id/mark-paid
 * ADMIN only. Marks an UNPAID or OVERDUE invoice as PAID.
 *
 * An optional `paidAt` timestamp overrides the default (now).
 * Optional `notes` are stored on the invoice (e.g. payment reference).
 *
 * Returns 409 when the invoice is already PAID or VOID.
 */
export async function markInvoicePaid(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }  = req.params as { id: string };
    const body    = req.body as MarkPaidBody;
    const invoice = await invoicesService.markInvoicePaid(id, body);
    res.json(success(invoice));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/invoices/:id/void
 * ADMIN only. Voids an UNPAID or OVERDUE invoice.
 *
 * Optional `notes` are stored on the invoice (e.g. void reason).
 *
 * Returns 409 when the invoice is PAID (use a manual credit note) or already VOID.
 */
export async function voidInvoice(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }  = req.params as { id: string };
    const body    = req.body as VoidInvoiceBody;
    const invoice = await invoicesService.voidInvoice(id, body);
    res.json(success(invoice));
  } catch (err) {
    next(err);
  }
}
