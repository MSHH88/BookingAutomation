/**
 * Payments service — Step 1.23
 *
 * Business logic for Stripe payment collection.
 *
 * ─── What this module does ────────────────────────────────────────────────────
 *
 *  createPaymentIntent(data)
 *    Creates a Stripe PaymentIntent for a booking's deposit.  Algorithm:
 *      1. Fetch booking (must be PENDING or CONFIRMED, deposit not yet paid).
 *      2. Calculate deposit amount in pence:
 *           a) booking.depositAmount if explicitly set.
 *           b) Otherwise: StudioSettings.depositPercentage × booking.totalAmount.
 *           c) Minimum: £0.50 (Stripe minimum charge).
 *      3. Get or create a Stripe Customer for the payer (lead email / customer email).
 *           – If the User row has a stripeCustomerId, reuse it.
 *           – Else search Stripe customers by email; create if none found.
 *           – Persist stripeCustomerId on the User row if one exists.
 *      4. Create PaymentIntent with bookingId in metadata.
 *      5. Persist paymentIntentId on the Booking row.
 *      6. Return { clientSecret, paymentIntentId, amountPence, currency }.
 *
 *  handleWebhookEvent(rawBody, signature)
 *    Verifies the Stripe-Signature header, then dispatches:
 *      payment_intent.succeeded  → depositPaidAt set; PENDING→CONFIRMED;
 *                                   any UNPAID Invoice for that booking → PAID.
 *      payment_intent.payment_failed → warning log only (customer can retry).
 *      charge.refunded           → booking.depositRefunded = true.
 *      (all other event types)   → debug-logged, no DB change.
 *
 *  getPaymentStatus(bookingId)
 *    Fetches the booking + live PaymentIntent status from Stripe.
 *    Fails gracefully when the Stripe API is unavailable.
 *
 *  refundPayment(data)
 *    Verifies the booking has a paid, un-refunded deposit, then creates a
 *    Stripe refund.  Marks booking.depositRefunded = true on success.
 *    Supports partial refunds (data.amount in major currency units).
 *
 * ─── Security notes ──────────────────────────────────────────────────────────
 *   – Webhook signature verified with stripe.webhooks.constructEvent before
 *     any DB mutation so forged events cannot manipulate data.
 *   – PaymentIntents are idempotent per booking: if one already exists the
 *     caller gets a 409 DEPOSIT_ALREADY_PAID (if paid) or the existing intent
 *     id is re-used implicitly via Stripe's idempotency.
 */
import type Stripe from 'stripe';

import { prisma }    from '../../lib/prisma';
import { getStripe } from '../../lib/stripe';
import { AppError }  from '../../errors/AppError';
import { logger }    from '../../utils/logger';
import { isFeatureEnabled } from '../../middleware/requireFeature';
import { enqueueWebhookEvent } from '../webhooks/webhooks.queue';
import type { CreatePaymentIntentBody, RefundBody } from './payments.schema';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Pence per major currency unit (e.g. £1 = 100p). */
const SUBUNIT_MULTIPLIER = 100;

/** Stripe minimum charge in pence. */
const MIN_CHARGE_PENCE = 50;

/** Default deposit percentage when StudioSettings row doesn't exist. */
const DEFAULT_DEPOSIT_PCT = 20;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a Stripe PaymentIntent for a booking's deposit.
 * Returns a `clientSecret` that the frontend passes to `stripe.confirmCardPayment()`.
 */
export async function createPaymentIntent(data: CreatePaymentIntentBody, tenantId: string | null = null) {
  const stripe = getStripe();

  // 1. Fetch booking with customer + lead for email / name resolution
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: {
      customer: { select: { id: true, email: true, name: true, stripeCustomerId: true } },
      lead:     { select: { email: true, name: true } },
    },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  if (tenantId !== null && booking.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Booking not in your tenant');
  }

  if (booking.depositPaidAt) {
    throw new AppError(409, 'DEPOSIT_ALREADY_PAID', 'Deposit has already been paid for this booking');
  }

  const actionableStatuses = ['PENDING', 'CONFIRMED'];
  if (!actionableStatuses.includes(booking.status)) {
    throw new AppError(
      400,
      'INVALID_BOOKING_STATUS',
      `Cannot collect payment for a booking with status ${booking.status}`,
    );
  }

  // Idempotency guard: reuse an existing PaymentIntent if the deposit is not yet paid.
  // This prevents duplicate intents when the caller retries before the customer completes
  // payment (e.g., page refresh, network error).
  if (booking.stripePaymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
    const reusableStatuses = [
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
      'processing',
    ];
    if (reusableStatuses.includes(existing.status)) {
      logger.info('Reusing existing PaymentIntent', {
        bookingId:       booking.id,
        paymentIntentId: existing.id,
        status:          existing.status,
      });
      return {
        clientSecret:    existing.client_secret,
        paymentIntentId: existing.id,
        amountPence:     existing.amount,
        currency:        data.currency,
      };
    }
    // Existing intent is cancelled or failed — fall through to create a fresh one.
    logger.info('Existing PaymentIntent is not reusable — creating a new one', {
      bookingId:        booking.id,
      existingIntentId: existing.id,
      existingStatus:   existing.status,
    });
  }

  // 2. Calculate deposit amount in pence
  const amountPence = await resolveDepositPence(booking);

  // 3. Get or create Stripe customer
  const payerEmail = booking.customer?.email ?? booking.lead?.email;
  const payerName  = booking.customer?.name  ?? booking.lead?.name;
  let   stripeCustomerId = booking.customer?.stripeCustomerId ?? null;

  if (!stripeCustomerId && payerEmail) {
    stripeCustomerId = await getOrCreateStripeCustomer(
      stripe,
      payerEmail,
      payerName ?? undefined,
      booking.customerId ?? undefined,
      data.bookingId,
    );
  }

  // 4. Create PaymentIntent — enforce TIPS_ENABLED gate
  const tipsEnabled = await isFeatureEnabled('TIPS_ENABLED', tenantId);
  const tipPence = (tipsEnabled && data.tipAmount) ? Math.round(data.tipAmount * SUBUNIT_MULTIPLIER) : 0;
  if (!tipsEnabled && data.tipAmount) {
    logger.warn('Tip amount ignored — TIPS_ENABLED is off', { bookingId: booking.id, tipAmount: data.tipAmount });
  }
  const totalAmountPence = amountPence + tipPence;

  const intentParams: Stripe.PaymentIntentCreateParams = {
    amount:         totalAmountPence,
    currency:       data.currency.toLowerCase(),
    capture_method: 'automatic',
    metadata:       {
      bookingId:  booking.id,
      artistId:   booking.artistId,
      type:       'deposit',
      tipAmount:  tipPence > 0 ? String(data.tipAmount) : '0',
    },
    description:    `Deposit for booking ${booking.id}`,
  };

  if (stripeCustomerId) {
    intentParams.customer = stripeCustomerId;
    if (data.saveCard) {
      intentParams.setup_future_usage = 'off_session';
    }
  }

  const paymentIntent = await stripe.paymentIntents.create(intentParams);

  // 5. Persist paymentIntentId on the booking and create a Payment record
  await prisma.booking.update({
    where: { id: booking.id },
    data:  { stripePaymentIntentId: paymentIntent.id },
  });

  // Create a Payment record to track this transaction (including tip)
  await prisma.payment.create({
    data: {
      tenantId:              booking.tenantId,
      bookingId:             booking.id,
      amount:                Number(booking.depositAmount ?? booking.totalAmount ?? 0),
      tipAmount:             data.tipAmount ?? null,
      currency:              data.currency,
      status:                'PENDING',
      method:                'CARD',
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  logger.info('PaymentIntent created', {
    bookingId:       booking.id,
    paymentIntentId: paymentIntent.id,
    amountPence,
    tipPence,
    currency:        data.currency,
  });

  return {
    clientSecret:    paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amountPence,
    tipPence,
    currency:        data.currency,
  };
}

/**
 * Handles incoming Stripe webhook events.
 * Must receive the **raw** (un-parsed) request body to verify the signature.
 */
export async function handleWebhookEvent(
  rawBody:   Buffer,
  signature: string,
): Promise<{ received: boolean }> {
  const stripe     = getStripe();
  const webhookKey = process.env['STRIPE_WEBHOOK_SECRET'] ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookKey);
  } catch (err) {
    logger.warn('Stripe webhook signature verification failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AppError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Stripe webhook signature verification failed');
  }

  logger.info('Stripe webhook received', { eventType: event.type, eventId: event.id });

  switch (event.type) {
    case 'payment_intent.succeeded':
      await onPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      onPaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'charge.refunded':
      await onChargeRefunded(event.data.object as Stripe.Charge);
      break;

    default:
      logger.debug('Unhandled Stripe event type — no action taken', { eventType: event.type });
  }

  return { received: true };
}

/**
 * Returns the payment status for a booking, enriched with the live Stripe
 * PaymentIntent status when available.
 */
export async function getPaymentStatus(bookingId: string, tenantId: string | null = null) {
  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: {
      id:                    true,
      status:                true,
      tenantId:              true,
      depositAmount:         true,
      depositPaidAt:         true,
      depositRefunded:       true,
      stripePaymentIntentId: true,
      totalAmount:           true,
    },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  if (tenantId !== null && booking.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Booking not in your tenant');
  }

  let stripeStatus: string | null = null;
  if (booking.stripePaymentIntentId) {
    const stripe = getStripe();
    try {
      const pi  = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
      stripeStatus = pi.status;
    } catch (err) {
      // Stripe may be temporarily unavailable; log and continue — the caller
      // still gets the DB-sourced payment data.
      logger.warn('Failed to retrieve PaymentIntent from Stripe', {
        paymentIntentId: booking.stripePaymentIntentId,
        error:           err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    bookingId:             booking.id,
    bookingStatus:         booking.status,
    depositAmount:         booking.depositAmount,
    totalAmount:           booking.totalAmount,
    depositPaidAt:         booking.depositPaidAt,
    depositRefunded:       booking.depositRefunded,
    stripePaymentIntentId: booking.stripePaymentIntentId,
    stripeStatus,
  };
}

/**
 * Refunds the deposit payment for a booking.
 * Supports partial refunds when `data.amount` is provided (major currency units).
 */
export async function refundPayment(data: RefundBody, tenantId: string | null = null) {
  const stripe = getStripe();

  const booking = await prisma.booking.findUnique({
    where:  { id: data.bookingId },
    select: {
      id:                    true,
      tenantId:              true,
      stripePaymentIntentId: true,
      depositPaidAt:         true,
      depositRefunded:       true,
      depositAmount:         true,
    },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  if (tenantId !== null && booking.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Booking not in your tenant');
  }

  if (!booking.stripePaymentIntentId) {
    throw new AppError(400, 'NO_PAYMENT_INTENT', 'No payment intent found for this booking');
  }

  if (!booking.depositPaidAt) {
    throw new AppError(400, 'NOT_PAID', 'Deposit has not been paid for this booking');
  }

  if (booking.depositRefunded) {
    throw new AppError(409, 'ALREADY_REFUNDED', 'Deposit has already been refunded for this booking');
  }

  // Retrieve the PaymentIntent to obtain the latest charge ID
  const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
  const chargeId      =
    typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : (paymentIntent.latest_charge as Stripe.Charge | null)?.id ?? null;

  if (!chargeId) {
    throw new AppError(400, 'NO_CHARGE', 'No charge found for this payment intent');
  }

  const refundParams: Stripe.RefundCreateParams = {
    charge: chargeId,
    reason: data.reason,
  };
  if (data.amount !== undefined) {
    refundParams.amount = Math.round(data.amount * SUBUNIT_MULTIPLIER);
  }

  const refund = await stripe.refunds.create(refundParams);

  // Mark deposit as refunded regardless of partial/full refund
  await prisma.booking.update({
    where: { id: data.bookingId },
    data:  { depositRefunded: true },
  });

  logger.info('Refund created', { bookingId: data.bookingId, refundId: refund.id, amount: refund.amount });

  return {
    refundId:  refund.id,
    amount:    refund.amount,
    status:    refund.status,
    bookingId: data.bookingId,
  };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Resolves the deposit amount in pence for the given booking.
 * Priority: explicit depositAmount > percentage of totalAmount > error.
 *
 * Scopes the StudioSettings lookup to the booking's tenant so that deposit
 * percentages are not leaked across tenant boundaries.
 */
async function resolveDepositPence(
  booking: { depositAmount: unknown; totalAmount: unknown; tenantId?: string | null },
): Promise<number> {
  let amountPence: number;

  if (booking.depositAmount !== null && booking.depositAmount !== undefined) {
    amountPence = Math.round(Number(booking.depositAmount) * SUBUNIT_MULTIPLIER);
  } else if (booking.totalAmount !== null && booking.totalAmount !== undefined) {
    // Always scope settings lookup to the booking's tenant (null = single-tenant mode)
    const settings     = await prisma.studioSettings.findFirst({
      where: { tenantId: booking.tenantId ?? null },
    });
    const depositPct   = settings ? Number(settings.depositPercentage) : DEFAULT_DEPOSIT_PCT;
    amountPence        = Math.round(Number(booking.totalAmount) * (depositPct / 100) * SUBUNIT_MULTIPLIER);
  } else {
    throw new AppError(
      400,
      'AMOUNT_UNKNOWN',
      'Booking has no totalAmount or depositAmount — cannot create payment intent',
    );
  }

  if (amountPence < MIN_CHARGE_PENCE) {
    throw new AppError(
      400,
      'AMOUNT_TOO_LOW',
      `Deposit amount must be at least £${MIN_CHARGE_PENCE / 100} (Stripe minimum)`,
    );
  }

  return amountPence;
}

/**
 * Gets an existing Stripe Customer for the given email, or creates a new one.
 * Persists stripeCustomerId on the User row when a User ID is provided.
 */
async function getOrCreateStripeCustomer(
  stripe:    Stripe,
  email:     string,
  name:      string | undefined,
  userId:    string | undefined,
  bookingId: string,
): Promise<string> {
  // Search for an existing customer by email to avoid duplicates
  const existing = await stripe.customers.list({ email, limit: 1 });
  let   customerId: string;

  if (existing.data.length > 0) {
    customerId = existing.data[0].id;
  } else {
    const customer = await stripe.customers.create({
      email,
      name:     name,
      metadata: { bookingId },
    });
    customerId = customer.id;
  }

  // Cache on User row for future bookings
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data:  { stripeCustomerId: customerId },
    });
  }

  return customerId;
}

/**
 * Handler for payment_intent.succeeded.
 * Sets depositPaidAt; promotes PENDING→CONFIRMED; marks matching invoices PAID.
 */
async function onPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) {
    logger.warn('payment_intent.succeeded event has no bookingId in metadata', {
      paymentIntentId: paymentIntent.id,
    });
    return;
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    logger.warn('Booking not found for payment_intent.succeeded', {
      bookingId,
      paymentIntentId: paymentIntent.id,
    });
    return;
  }

  // Idempotency guard — do not overwrite an existing depositPaidAt
  if (booking.depositPaidAt) {
    logger.debug('payment_intent.succeeded already processed — skipping', { bookingId });
    return;
  }

  const now = new Date();

  await prisma.booking.update({
    where: { id: bookingId },
    data:  {
      depositPaidAt: now,
      // Confirm the booking when payment is collected before confirmation
      status: booking.status === 'PENDING' ? 'CONFIRMED' : booking.status,
      confirmedAt: booking.status === 'PENDING' ? now : booking.confirmedAt,
    },
  });

  // Update Payment record to SUCCEEDED
  await prisma.payment.updateMany({
    where: { stripePaymentIntentId: paymentIntent.id, status: 'PENDING' },
    data:  { status: 'SUCCEEDED', paidAt: now },
  });

  // Mark any outstanding invoice for this booking as paid
  await prisma.invoice.updateMany({
    where: { bookingId, status: 'UNPAID' },
    data:  { status: 'PAID', paidAt: now },
  });

  logger.info('Deposit payment succeeded — booking updated', {
    bookingId,
    paymentIntentId: paymentIntent.id,
  });

  // Outgoing Webhook — payment.succeeded
  void enqueueWebhookEvent('payment.succeeded', {
    bookingId,
    paymentIntentId: paymentIntent.id,
    amount:          paymentIntent.amount,
    currency:        paymentIntent.currency,
  }).catch((err) => logger.warn('enqueueWebhookEvent payment.succeeded failed', { err, bookingId }));
}

/**
 * Handler for payment_intent.payment_failed.
 * Logs the failure; no DB change so the customer can retry.
 */
function onPaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): void {
  const bookingId = paymentIntent.metadata?.bookingId;
  logger.warn('Stripe payment intent failed', {
    paymentIntentId: paymentIntent.id,
    bookingId,
    lastError:       paymentIntent.last_payment_error?.message ?? 'unknown',
    declineCode:     paymentIntent.last_payment_error?.decline_code ?? null,
  });
}

/**
 * Handler for charge.refunded.
 * Marks the booking's deposit as refunded.
 */
async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : (charge.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  if (!paymentIntentId) {
    logger.warn('charge.refunded event has no paymentIntentId', { chargeId: charge.id });
    return;
  }

  await prisma.booking.updateMany({
    where: { stripePaymentIntentId: paymentIntentId },
    data:  { depositRefunded: true },
  });

  // Update Payment record to REFUNDED
  await prisma.payment.updateMany({
    where: { stripePaymentIntentId: paymentIntentId, status: 'SUCCEEDED' },
    data:  { status: 'REFUNDED', refundedAt: new Date(), refundedAmount: charge.amount_refunded / SUBUNIT_MULTIPLIER },
  });

  logger.info('Deposit marked as refunded via charge.refunded', {
    chargeId:        charge.id,
    paymentIntentId,
  });

  // Outgoing Webhook — payment.refunded
  void enqueueWebhookEvent('payment.refunded', {
    chargeId:        charge.id,
    paymentIntentId,
    amount:          charge.amount_refunded,
    currency:        charge.currency,
  }).catch((err) => logger.warn('enqueueWebhookEvent payment.refunded failed', { err, paymentIntentId }));
}
