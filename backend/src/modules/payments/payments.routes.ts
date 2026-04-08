/**
 * Payments router — Step 1.23
 *
 * Route table:
 *   POST   /api/payments/create-intent          ADMIN — create deposit PaymentIntent
 *   POST   /api/payments/webhook                public — Stripe webhook receiver
 *   GET    /api/payments/:bookingId/status      ADMIN — payment status + Stripe live status
 *   POST   /api/payments/:bookingId/refund      ADMIN — refund deposit
 *
 * Feature gate: ONLINE_PAYMENT_ENABLED
 * All routes except /webhook require authentication (requireAuth + requireRole).
 * The webhook endpoint is intentionally unauthenticated — Stripe cannot attach
 * a JWT, so we verify identity via HMAC signature inside the controller.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import * as ctrl          from './payments.controller';

export const paymentRoutes = Router();

// All payments routes are gated behind the ONLINE_PAYMENT_ENABLED feature flag
paymentRoutes.use(requireFeature('ONLINE_PAYMENT_ENABLED'));

// ── Webhook ───────────────────────────────────────────────────────────────────
// Deliberately placed BEFORE requireAuth — Stripe cannot send a Bearer token.
// Identity is verified by HMAC signature in the controller.
paymentRoutes.post('/webhook', ctrl.stripeWebhook);

// ── Authenticated / admin routes ──────────────────────────────────────────────
paymentRoutes.use(requireAuth, requireRole('ADMIN'));

paymentRoutes.post('/create-intent',            ctrl.createPaymentIntent);
paymentRoutes.get( '/:bookingId/status',        ctrl.getPaymentStatus);
paymentRoutes.post('/:bookingId/refund',        ctrl.refundPayment);

export { paymentRoutes as paymentsRoutes };
