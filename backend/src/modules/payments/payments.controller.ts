/**
 * Payments controller — Step 1.23
 *
 * HTTP concerns only: parse request, validate input, call service, send response.
 * All business logic lives in payments.service.ts.
 *
 * Webhook note: the `/webhook` route is the only one that receives a raw
 * Buffer body (via `express.raw()` mounted before `express.json()` in app.ts).
 * All other routes receive the normal parsed JSON body.
 */
import { Request, Response, NextFunction } from 'express';

import * as paymentsService from './payments.service';
import { CreatePaymentIntentSchema, RefundSchema } from './payments.schema';
import { success } from '../../utils/apiResponse';
import { AppError } from '../../errors/AppError';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/create-intent
 * ADMIN only.  Creates a Stripe PaymentIntent for a booking's deposit.
 * Returns a `clientSecret` the frontend uses to complete the payment.
 */
export async function createPaymentIntent(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = CreatePaymentIntentSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, 'VALIDATION_ERROR', parsed.error.errors[0].message));
      return;
    }

    const tenantId = req.user?.tenantId ?? null;
    const result = await paymentsService.createPaymentIntent(parsed.data, tenantId);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/webhook
 * Public (Stripe servers only — verified via HMAC signature).
 * Receives raw Buffer body; verifies Stripe-Signature header; dispatches event.
 */
export async function stripeWebhook(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      next(new AppError(400, 'MISSING_SIGNATURE', 'Stripe-Signature header is required'));
      return;
    }

    // req.body is a Buffer when the route uses express.raw()
    const rawBody = req.body as Buffer;
    const result  = await paymentsService.handleWebhookEvent(rawBody, signature);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/payments/:bookingId/status
 * ADMIN only.  Returns the DB payment state + live Stripe PaymentIntent status.
 */
export async function getPaymentStatus(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    const result = await paymentsService.getPaymentStatus(req.params['bookingId']!, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/:bookingId/refund
 * ADMIN only.  Refunds the deposit for a booking (full or partial).
 */
export async function refundPayment(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = RefundSchema.safeParse({
      ...req.body,
      bookingId: req.params['bookingId'],
    });
    if (!parsed.success) {
      next(new AppError(400, 'VALIDATION_ERROR', parsed.error.errors[0].message));
      return;
    }

    const tenantId = req.user?.tenantId ?? null;
    const result = await paymentsService.refundPayment(parsed.data, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
