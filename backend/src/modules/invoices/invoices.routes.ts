/**
 * Invoices router — Step 1.10
 *
 * | Method | Path                            | Auth         | Feature Flag    | Description                              |
 * |--------|---------------------------------|--------------|-----------------|------------------------------------------|
 * | GET    | /api/invoices                   | ADMIN        | BOOKING_ENABLED | List invoices with filters + pagination  |
 * | GET    | /api/invoices/:id               | ARTIST/ADMIN | BOOKING_ENABLED | Invoice detail (ARTISTs: own only)       |
 * | PATCH  | /api/invoices/:id/send          | ARTIST/ADMIN | BOOKING_ENABLED | Send invoice email (ARTISTs: own only)   |
 * | PATCH  | /api/invoices/:id/mark-paid     | ADMIN        | BOOKING_ENABLED | Mark UNPAID/OVERDUE → PAID               |
 * | PATCH  | /api/invoices/:id/void          | ADMIN        | BOOKING_ENABLED | Void UNPAID/OVERDUE invoice              |
 *
 * Gated by BOOKING_ENABLED — invoices are a direct product of the booking
 * lifecycle and share the same master switch.
 *
 * IMPORTANT — route order:
 *   Literal sub-routes (/send, /mark-paid, /void) MUST be registered BEFORE /:id
 *   to prevent them being matched as the `id` parameter.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './invoices.controller';
import {
  listInvoicesSchema,
  getInvoiceByIdSchema,
  sendInvoiceSchema,
  markPaidSchema,
  voidInvoiceSchema,
} from './invoices.schema';

const router = Router();

// ── All invoice routes require authentication and BOOKING_ENABLED ─────────────
router.use(requireAuth);
router.use(requireFeature('BOOKING_ENABLED'));

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/invoices
 * ADMIN only. Paginated list with optional status / date filters.
 */
router.get(
  '/',
  requireRole('ADMIN'),
  validate(listInvoicesSchema),
  ctrl.listInvoices,
);

// ─── Action sub-routes (MUST be before /:id) ──────────────────────────────────

/**
 * PATCH /api/invoices/:id/send
 * ARTIST or ADMIN. Sends invoice email. ARTISTs scoped to their own bookings.
 */
router.patch(
  '/:id/send',
  requireRole('ARTIST'),
  validate(sendInvoiceSchema),
  ctrl.sendInvoice,
);

/**
 * PATCH /api/invoices/:id/mark-paid
 * ADMIN only. Marks UNPAID or OVERDUE invoice as PAID.
 */
router.patch(
  '/:id/mark-paid',
  requireRole('ADMIN'),
  validate(markPaidSchema),
  ctrl.markInvoicePaid,
);

/**
 * PATCH /api/invoices/:id/void
 * ADMIN only. Voids UNPAID or OVERDUE invoice.
 */
router.patch(
  '/:id/void',
  requireRole('ADMIN'),
  validate(voidInvoiceSchema),
  ctrl.voidInvoice,
);

// ─── Detail (MUST be after action sub-routes) ─────────────────────────────────

/**
 * GET /api/invoices/:id
 * ARTIST or ADMIN. Full invoice detail. ARTISTs scoped to their own bookings.
 */
router.get(
  '/:id',
  requireRole('ARTIST'),
  validate(getInvoiceByIdSchema),
  ctrl.getInvoiceById,
);

export { router as invoiceRoutes };
