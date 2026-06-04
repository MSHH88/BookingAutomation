/**
 * Zod schemas for the Invoice System API — Step 1.10
 *
 * Invoices are auto-created when a Booking is marked COMPLETED (Step 1.9).
 * This module exposes management endpoints: list, get, send, mark-paid, void.
 *
 * Invoice status lifecycle:
 *   UNPAID → PAID      (markInvoicePaid — ADMIN)
 *   UNPAID → OVERDUE   (markOverdueInvoices cron — Phase 2 BullMQ daily job)
 *   UNPAID → VOID      (voidInvoice — ADMIN)
 *   OVERDUE → PAID     (markInvoicePaid — ADMIN)
 *   OVERDUE → VOID     (voidInvoice — ADMIN)
 *   PAID / VOID        — terminal states; no further transitions
 *
 * Role permissions:
 *   ADMIN  : list, get, send, mark-paid, void
 *   ARTIST : get (own bookings only), send (own bookings only)
 */
import { z } from 'zod';

// ─── Invoice status enum ──────────────────────────────────────────────────────

export const INVOICE_STATUSES = ['UNPAID', 'PAID', 'OVERDUE', 'VOID'] as const;
export type InvoiceStatusValue = (typeof INVOICE_STATUSES)[number];

/** Statuses that still allow transitions to PAID or VOID. */
export const ACTIONABLE_STATUSES: InvoiceStatusValue[] = ['UNPAID', 'OVERDUE'];

// ─── GET /api/invoices ────────────────────────────────────────────────────────

export const listInvoicesSchema = z.object({
  query: z.object({
    /**
     * Filter by invoice status.
     */
    status: z.enum(INVOICE_STATUSES).optional(),

    /**
     * ISO 8601 date — createdAt >= from (inclusive).
     */
    from: z.string().optional(),

    /**
     * ISO 8601 date — createdAt <= to (end-of-day inclusive).
     */
    to: z.string().optional(),

    /**
     * Pagination — page number (1-based).
     */
    page: z.string().optional(),

    /**
     * Pagination — records per page (max 100).
     */
    limit: z.string().optional(),
  }),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesSchema>['query'];

// ─── GET /api/invoices/:id ────────────────────────────────────────────────────

export const getInvoiceByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── PATCH /api/invoices/:id/send ─────────────────────────────────────────────

export const sendInvoiceSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── PATCH /api/invoices/:id/mark-paid ────────────────────────────────────────

export const markPaidSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    /**
     * Optional explicit payment timestamp.
     * Defaults to the current UTC time when omitted.
     * Must be a valid ISO 8601 datetime string.
     */
    paidAt: z
      .string()
      .datetime({ offset: true, message: 'paidAt must be a valid ISO 8601 datetime string' })
      .optional(),

    /**
     * Optional notes to attach to the invoice (e.g. payment reference, method).
     */
    notes: z.string().trim().max(1000, 'notes must be at most 1000 characters').optional(),
  }),
});

export type MarkPaidBody = z.infer<typeof markPaidSchema>['body'];

// ─── PATCH /api/invoices/:id/void ────────────────────────────────────────────

export const voidInvoiceSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    /**
     * Optional reason for voiding — stored as notes.
     */
    notes: z.string().trim().max(1000, 'notes must be at most 1000 characters').optional(),
  }),
});

export type VoidInvoiceBody = z.infer<typeof voidInvoiceSchema>['body'];
