/**
 * Stripe client singleton — Step 1.23
 *
 * Initialises the Stripe SDK lazily on first call so that:
 *   - Unit tests can mock `getStripe()` before importing service modules.
 *   - The process does NOT exit on startup when STRIPE_SECRET_KEY is absent
 *     (only routes guarded by `requireFeature('ONLINE_PAYMENT_ENABLED')` are
 *     affected, so non-payment business types boot cleanly).
 *
 * Usage:
 *   import { getStripe } from '../../lib/stripe';
 *   const stripe = getStripe();
 *   const pi = await stripe.paymentIntents.create({ ... });
 *
 * Test helper:
 *   import { _resetStripe } from '../../lib/stripe';
 *   beforeEach(() => _resetStripe());  // wipes singleton between tests
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Returns the shared Stripe client, creating it on first call.
 * Throws a descriptive error if STRIPE_SECRET_KEY is missing so the
 * error surface at callsite is clear (not a cryptic SDK error).
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) {
    throw new Error(
      '[Stripe] STRIPE_SECRET_KEY is not configured. ' +
        'Set the environment variable to enable online payments.',
    );
  }

  _stripe = new Stripe(key, {
    apiVersion: '2024-06-20',
    typescript: true,
    telemetry: false,           // disable usage telemetry to reduce outbound noise
    maxNetworkRetries: 2,       // auto-retry idempotent requests on network errors
  });

  return _stripe;
}

/**
 * Resets the cached singleton.
 * Exported for use in unit tests only — not for production code.
 */
export function _resetStripe(): void {
  _stripe = null;
}

/**
 * Creates a Stripe Terminal connection token for the frontend SDK.
 */
export async function createTerminalConnectionToken(): Promise<string> {
  const stripe = getStripe();
  const connectionToken = await stripe.terminal.connectionTokens.create();
  return connectionToken.secret;
}

/**
 * Creates a PaymentIntent for Terminal capture (capture_method: 'manual').
 */
export async function createTerminalPaymentIntent(
  amount: number,
  currency: string,
  metadata?: Record<string, string>,
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  return stripe.paymentIntents.create({
    amount:         Math.round(amount * 100), // convert to smallest currency unit
    currency:       currency.toLowerCase(),
    capture_method: 'manual',
    payment_method_types: ['card_present'],
    metadata:       metadata ?? {},
  });
}

/**
 * Captures a previously authorized Terminal PaymentIntent.
 */
export async function captureTerminalPaymentIntent(
  paymentIntentId: string,
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  return stripe.paymentIntents.capture(paymentIntentId);
}
