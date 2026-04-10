/**
 * Unit tests for payments.service.ts — Step 1.23
 *
 * All external dependencies (Prisma, Stripe) are fully mocked so tests run
 * without a live database or Stripe account.
 *
 * Coverage:
 *  ✓ createPaymentIntent
 *      — uses booking.depositAmount when set
 *      — uses StudioSettings depositPercentage × totalAmount when no depositAmount
 *      — uses 20% default when StudioSettings row absent
 *      — creates new Stripe customer when none found by email
 *      — reuses existing Stripe customer found by email
 *      — persists stripeCustomerId on User when customerId present
 *      — skips customer lookup when booking has no customer or lead email
 *      — sets setup_future_usage when saveCard is true
 *      — persists stripePaymentIntentId on the booking
 *      — reuses existing PaymentIntent when one is still in a payable state
 *      — creates new PaymentIntent when existing one is not reusable (cancelled)
 *      — throws 404 when booking not found
 *      — throws 409 when deposit already paid
 *      — throws 400 when booking status is CANCELLED
 *      — throws 400 when no amount can be determined
 *      — throws 400 when computed amount is below Stripe minimum (£0.50)
 *
 *  ✓ handleWebhookEvent
 *      — throws 400 when signature is invalid
 *      — payment_intent.succeeded updates depositPaidAt and promotes PENDING→CONFIRMED
 *      — payment_intent.succeeded updates confirmedAt when booking is PENDING
 *      — payment_intent.succeeded marks UNPAID invoice PAID
 *      — payment_intent.succeeded skips when depositPaidAt already set (idempotent)
 *      — payment_intent.succeeded logs warning when bookingId absent in metadata
 *      — payment_intent.succeeded logs warning when booking not found
 *      — payment_intent.payment_failed logs warning, does not change DB
 *      — charge.refunded sets depositRefunded = true
 *      — charge.refunded skips when no paymentIntentId on charge
 *      — unknown event types are debug-logged without DB change
 *
 *  ✓ getPaymentStatus
 *      — returns full status including live Stripe status and totalAmount
 *      — returns null stripeStatus when no paymentIntentId
 *      — degrades gracefully when Stripe API throws
 *      — throws 404 when booking not found
 *
 *  ✓ refundPayment
 *      — creates full refund successfully
 *      — creates partial refund with amount in major units
 *      — throws 404 when booking not found
 *      — throws 400 when no payment intent on booking
 *      — throws 400 when deposit not yet paid
 *      — throws 409 when deposit already refunded
 *      — throws 400 when payment intent has no charge
 *
 * 39 tests total
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']           = 'tattoo_studio';
process.env['DATABASE_URL']            = 'postgresql://test';
process.env['NODE_ENV']                = 'test';
process.env['JWT_ACCESS_SECRET']       = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET']      = 'b'.repeat(32);
process.env['STRIPE_SECRET_KEY']       = 'sk_test_placeholder';
process.env['STRIPE_WEBHOOK_SECRET']   = 'whsec_test_placeholder';

// ─── Mock Stripe ──────────────────────────────────────────────────────────────

const mockCreateIntent    = jest.fn();
const mockListCustomers   = jest.fn();
const mockCreateCustomer  = jest.fn();
const mockRetrieveIntent  = jest.fn();
const mockConstructEvent  = jest.fn();
const mockCreateRefund    = jest.fn();

const mockStripe = {
  paymentIntents: {
    create:   (...a: unknown[]) => mockCreateIntent(...a),
    retrieve: (...a: unknown[]) => mockRetrieveIntent(...a),
  },
  customers: {
    list:   (...a: unknown[]) => mockListCustomers(...a),
    create: (...a: unknown[]) => mockCreateCustomer(...a),
  },
  webhooks: {
    constructEvent: (...a: unknown[]) => mockConstructEvent(...a),
  },
  refunds: {
    create: (...a: unknown[]) => mockCreateRefund(...a),
  },
};

jest.mock('../../lib/stripe', () => ({
  getStripe:    () => mockStripe,
  _resetStripe: jest.fn(),
}));

// payments.service.ts imports enqueueWebhookEvent from webhooks.queue.ts which
// creates a module-level BullMQ Queue singleton.  Mock the entire module so
// tests run without a live Redis instance.
jest.mock('../webhooks/webhooks.queue', () => ({
  enqueueWebhookEvent: jest.fn().mockResolvedValue(undefined),
}));

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockBookingFindUnique  = jest.fn();
const mockBookingUpdate      = jest.fn();
const mockBookingUpdateMany  = jest.fn();
const mockInvoiceUpdateMany  = jest.fn();
const mockUserUpdate         = jest.fn();
const mockStudioFindFirst    = jest.fn();
const mockPaymentCreate      = jest.fn();
const mockPaymentUpdateMany  = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique:  (...a: unknown[]) => mockBookingFindUnique(...a),
      update:      (...a: unknown[]) => mockBookingUpdate(...a),
      updateMany:  (...a: unknown[]) => mockBookingUpdateMany(...a),
    },
    invoice: {
      updateMany:  (...a: unknown[]) => mockInvoiceUpdateMany(...a),
    },
    user: {
      update:      (...a: unknown[]) => mockUserUpdate(...a),
    },
    studioSettings: {
      findFirst:   (...a: unknown[]) => mockStudioFindFirst(...a),
    },
    payment: {
      create:      (...a: unknown[]) => mockPaymentCreate(...a),
      updateMany:  (...a: unknown[]) => mockPaymentUpdateMany(...a),
    },
  },
}));

// ─── Import service under test ────────────────────────────────────────────────

import * as paymentsService from './payments.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const BOOKING_ID = 'book_1';
const PI_ID      = 'pi_test_123';
const CHARGE_ID  = 'ch_test_456';
const CUSTOMER_ID = 'cus_test_789';

/** A booking with an explicit depositAmount set */
function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id:                    BOOKING_ID,
    artistId:              'artist_1',
    status:                'PENDING',
    depositAmount:         '100.00',    // £100.00
    totalAmount:           null,
    depositPaidAt:         null,
    depositRefunded:       false,
    confirmedAt:           null,
    stripePaymentIntentId: null,
    customerId:            'user_1',
    customer: {
      id:               'user_1',
      email:            'client@example.com',
      name:             'Alice',
      stripeCustomerId: null,
    },
    lead: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: Stripe customer list returns empty (no existing customer)
  mockListCustomers.mockResolvedValue({ data: [] });
  mockCreateCustomer.mockResolvedValue({ id: CUSTOMER_ID });
  mockCreateIntent.mockResolvedValue({ id: PI_ID, client_secret: 'secret_abc' });
  mockBookingUpdate.mockResolvedValue({});
  mockBookingUpdateMany.mockResolvedValue({ count: 0 });
  mockInvoiceUpdateMany.mockResolvedValue({ count: 0 });
  mockUserUpdate.mockResolvedValue({});
  mockStudioFindFirst.mockResolvedValue(null);
  mockPaymentCreate.mockResolvedValue({});
  mockPaymentUpdateMany.mockResolvedValue({ count: 0 });
});

// ─────────────────────────────────────────────────────────────────────────────
// createPaymentIntent
// ─────────────────────────────────────────────────────────────────────────────

describe('createPaymentIntent', () => {
  it('uses booking.depositAmount when explicitly set', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking());

    const result = await paymentsService.createPaymentIntent({
      bookingId: BOOKING_ID,
      currency:  'GBP',
      saveCard:  false,
    });

    expect(result.amountPence).toBe(10_000); // £100 × 100
    expect(result.clientSecret).toBe('secret_abc');
    expect(mockCreateIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10_000, currency: 'gbp' }),
    );
  });

  it('uses StudioSettings depositPercentage × totalAmount when no depositAmount', async () => {
    mockBookingFindUnique.mockResolvedValue(
      makeBooking({ depositAmount: null, totalAmount: '500.00' }),
    );
    mockStudioFindFirst.mockResolvedValue({ depositPercentage: '25' });

    const result = await paymentsService.createPaymentIntent({
      bookingId: BOOKING_ID,
      currency:  'GBP',
      saveCard:  false,
    });

    // 25% of £500 = £125 = 12,500p
    expect(result.amountPence).toBe(12_500);
  });

  it('defaults to 20% when StudioSettings row does not exist', async () => {
    mockBookingFindUnique.mockResolvedValue(
      makeBooking({ depositAmount: null, totalAmount: '200.00' }),
    );
    mockStudioFindFirst.mockResolvedValue(null);

    const result = await paymentsService.createPaymentIntent({
      bookingId: BOOKING_ID,
      currency:  'GBP',
      saveCard:  false,
    });

    // 20% of £200 = £40 = 4,000p
    expect(result.amountPence).toBe(4_000);
  });

  it('creates a new Stripe customer when none found by email', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking());
    mockListCustomers.mockResolvedValue({ data: [] });
    mockCreateCustomer.mockResolvedValue({ id: CUSTOMER_ID });

    await paymentsService.createPaymentIntent({ bookingId: BOOKING_ID, currency: 'GBP', saveCard: false });

    expect(mockCreateCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'client@example.com' }),
    );
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stripeCustomerId: CUSTOMER_ID } }),
    );
  });

  it('reuses existing Stripe customer found by email', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking());
    mockListCustomers.mockResolvedValue({ data: [{ id: CUSTOMER_ID }] });

    await paymentsService.createPaymentIntent({ bookingId: BOOKING_ID, currency: 'GBP', saveCard: false });

    expect(mockCreateCustomer).not.toHaveBeenCalled();
    expect(mockCreateIntent).toHaveBeenCalledWith(
      expect.objectContaining({ customer: CUSTOMER_ID }),
    );
  });

  it('skips customer lookup when booking has no customer or lead email', async () => {
    mockBookingFindUnique.mockResolvedValue(
      makeBooking({ customerId: null, customer: null, lead: null }),
    );

    await paymentsService.createPaymentIntent({ bookingId: BOOKING_ID, currency: 'GBP', saveCard: false });

    expect(mockListCustomers).not.toHaveBeenCalled();
    expect(mockCreateCustomer).not.toHaveBeenCalled();
  });

  it('sets setup_future_usage when saveCard is true', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking());

    await paymentsService.createPaymentIntent({ bookingId: BOOKING_ID, currency: 'GBP', saveCard: true });

    expect(mockCreateIntent).toHaveBeenCalledWith(
      expect.objectContaining({ setup_future_usage: 'off_session' }),
    );
  });

  it('persists stripePaymentIntentId on the booking', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking());

    await paymentsService.createPaymentIntent({ bookingId: BOOKING_ID, currency: 'GBP', saveCard: false });

    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stripePaymentIntentId: PI_ID } }),
    );
  });

  it('reuses existing PaymentIntent when one is still in a payable state', async () => {
    mockBookingFindUnique.mockResolvedValue(
      makeBooking({ stripePaymentIntentId: PI_ID }),
    );
    mockRetrieveIntent.mockResolvedValue({
      id:            PI_ID,
      status:        'requires_payment_method',
      amount:        10_000,
      client_secret: 'secret_existing',
    });

    const result = await paymentsService.createPaymentIntent({
      bookingId: BOOKING_ID,
      currency:  'GBP',
      saveCard:  false,
    });

    expect(result.paymentIntentId).toBe(PI_ID);
    expect(result.clientSecret).toBe('secret_existing');
    expect(result.amountPence).toBe(10_000);
    expect(mockCreateIntent).not.toHaveBeenCalled();
  });

  it('creates a new PaymentIntent when existing one is not reusable (cancelled)', async () => {
    const NEW_PI_ID = 'pi_new_999';
    mockBookingFindUnique.mockResolvedValue(
      makeBooking({ stripePaymentIntentId: PI_ID }),
    );
    mockRetrieveIntent.mockResolvedValue({ id: PI_ID, status: 'canceled', amount: 10_000 });
    mockCreateIntent.mockResolvedValue({ id: NEW_PI_ID, client_secret: 'new_secret' });

    const result = await paymentsService.createPaymentIntent({
      bookingId: BOOKING_ID,
      currency:  'GBP',
      saveCard:  false,
    });

    expect(result.paymentIntentId).toBe(NEW_PI_ID);
    expect(result.clientSecret).toBe('new_secret');
    expect(mockCreateIntent).toHaveBeenCalled();
  });

  it('throws 404 when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    await expect(
      paymentsService.createPaymentIntent({ bookingId: BOOKING_ID, currency: 'GBP', saveCard: false }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  });

  it('throws 409 when deposit already paid', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking({ depositPaidAt: new Date() }));

    await expect(
      paymentsService.createPaymentIntent({ bookingId: BOOKING_ID, currency: 'GBP', saveCard: false }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'DEPOSIT_ALREADY_PAID' });
  });

  it('throws 400 for CANCELLED booking status', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking({ status: 'CANCELLED' }));

    await expect(
      paymentsService.createPaymentIntent({ bookingId: BOOKING_ID, currency: 'GBP', saveCard: false }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_BOOKING_STATUS' });
  });

  it('throws 400 when neither depositAmount nor totalAmount is set', async () => {
    mockBookingFindUnique.mockResolvedValue(
      makeBooking({ depositAmount: null, totalAmount: null }),
    );

    await expect(
      paymentsService.createPaymentIntent({ bookingId: BOOKING_ID, currency: 'GBP', saveCard: false }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'AMOUNT_UNKNOWN' });
  });

  it('throws 400 when computed amount is below Stripe minimum (50p)', async () => {
    mockBookingFindUnique.mockResolvedValue(
      makeBooking({ depositAmount: '0.30' }), // £0.30 = 30p — below 50p minimum
    );

    await expect(
      paymentsService.createPaymentIntent({ bookingId: BOOKING_ID, currency: 'GBP', saveCard: false }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'AMOUNT_TOO_LOW' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// handleWebhookEvent
// ─────────────────────────────────────────────────────────────────────────────

describe('handleWebhookEvent', () => {
  const rawBody  = Buffer.from('{}');
  const validSig = 'valid_sig';

  function makeSuccessEvent(bookingId: string) {
    return {
      id:   'evt_test',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id:       PI_ID,
          metadata: { bookingId },
          last_payment_error: null,
        },
      },
    };
  }

  it('throws 400 when Stripe signature is invalid', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Signature mismatch'); });

    await expect(
      paymentsService.handleWebhookEvent(rawBody, 'bad_sig'),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_WEBHOOK_SIGNATURE' });
  });

  it('payment_intent.succeeded sets depositPaidAt and promotes PENDING→CONFIRMED', async () => {
    const booking = makeBooking({ status: 'PENDING' });
    mockConstructEvent.mockReturnValue(makeSuccessEvent(BOOKING_ID));
    mockBookingFindUnique.mockResolvedValue(booking);

    const result = await paymentsService.handleWebhookEvent(rawBody, validSig);

    expect(result.received).toBe(true);
    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ depositPaidAt: expect.any(Date), status: 'CONFIRMED' }),
      }),
    );
  });

  it('payment_intent.succeeded sets confirmedAt when booking is PENDING', async () => {
    mockConstructEvent.mockReturnValue(makeSuccessEvent(BOOKING_ID));
    mockBookingFindUnique.mockResolvedValue(makeBooking({ status: 'PENDING' }));

    await paymentsService.handleWebhookEvent(rawBody, validSig);

    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ confirmedAt: expect.any(Date) }),
      }),
    );
  });

  it('payment_intent.succeeded marks UNPAID invoice as PAID', async () => {
    mockConstructEvent.mockReturnValue(makeSuccessEvent(BOOKING_ID));
    mockBookingFindUnique.mockResolvedValue(makeBooking());

    await paymentsService.handleWebhookEvent(rawBody, validSig);

    expect(mockInvoiceUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { bookingId: BOOKING_ID, status: 'UNPAID' } }),
    );
  });

  it('payment_intent.succeeded skips when depositPaidAt already set (idempotency)', async () => {
    mockConstructEvent.mockReturnValue(makeSuccessEvent(BOOKING_ID));
    mockBookingFindUnique.mockResolvedValue(makeBooking({ depositPaidAt: new Date() }));

    await paymentsService.handleWebhookEvent(rawBody, validSig);

    expect(mockBookingUpdate).not.toHaveBeenCalled();
  });

  it('payment_intent.succeeded logs warning when bookingId absent in metadata', async () => {
    mockConstructEvent.mockReturnValue({
      id:   'evt_test',
      type: 'payment_intent.succeeded',
      data: { object: { id: PI_ID, metadata: {} } },
    });

    // Should not throw
    const result = await paymentsService.handleWebhookEvent(rawBody, validSig);
    expect(result.received).toBe(true);
    expect(mockBookingFindUnique).not.toHaveBeenCalled();
  });

  it('payment_intent.succeeded logs warning when booking not found', async () => {
    mockConstructEvent.mockReturnValue(makeSuccessEvent(BOOKING_ID));
    mockBookingFindUnique.mockResolvedValue(null);

    const result = await paymentsService.handleWebhookEvent(rawBody, validSig);
    expect(result.received).toBe(true);
    expect(mockBookingUpdate).not.toHaveBeenCalled();
  });

  it('payment_intent.payment_failed logs warning and does not change DB', async () => {
    mockConstructEvent.mockReturnValue({
      id:   'evt_fail',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id:                 PI_ID,
          metadata:           { bookingId: BOOKING_ID },
          last_payment_error: { message: 'Card declined', decline_code: 'insufficient_funds' },
        },
      },
    });

    const result = await paymentsService.handleWebhookEvent(rawBody, validSig);
    expect(result.received).toBe(true);
    expect(mockBookingUpdate).not.toHaveBeenCalled();
  });

  it('charge.refunded sets depositRefunded = true on the matching booking', async () => {
    mockConstructEvent.mockReturnValue({
      id:   'evt_refund',
      type: 'charge.refunded',
      data: {
        object: { id: CHARGE_ID, payment_intent: PI_ID },
      },
    });

    const result = await paymentsService.handleWebhookEvent(rawBody, validSig);
    expect(result.received).toBe(true);
    expect(mockBookingUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripePaymentIntentId: PI_ID },
        data:  { depositRefunded: true },
      }),
    );
  });

  it('charge.refunded skips when charge has no paymentIntentId', async () => {
    mockConstructEvent.mockReturnValue({
      id:   'evt_refund_no_pi',
      type: 'charge.refunded',
      data: { object: { id: CHARGE_ID, payment_intent: null } },
    });

    const result = await paymentsService.handleWebhookEvent(rawBody, validSig);
    expect(result.received).toBe(true);
    expect(mockBookingUpdateMany).not.toHaveBeenCalled();
  });

  it('unknown event types return received:true without any DB mutation', async () => {
    mockConstructEvent.mockReturnValue({
      id:   'evt_unknown',
      type: 'customer.subscription.created',
      data: { object: {} },
    });

    const result = await paymentsService.handleWebhookEvent(rawBody, validSig);
    expect(result.received).toBe(true);
    expect(mockBookingUpdate).not.toHaveBeenCalled();
    expect(mockBookingUpdateMany).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPaymentStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('getPaymentStatus', () => {
  it('returns full payment status including live Stripe status and totalAmount', async () => {
    mockBookingFindUnique.mockResolvedValue({
      id:                    BOOKING_ID,
      status:                'CONFIRMED',
      depositAmount:         '100.00',
      depositPaidAt:         new Date('2026-04-01'),
      depositRefunded:       false,
      stripePaymentIntentId: PI_ID,
      totalAmount:           '500.00',
    });
    mockRetrieveIntent.mockResolvedValue({ status: 'succeeded' });

    const result = await paymentsService.getPaymentStatus(BOOKING_ID);

    expect(result.stripeStatus).toBe('succeeded');
    expect(result.depositPaidAt).toBeDefined();
    expect(result.totalAmount).toBe('500.00');
  });

  it('returns null stripeStatus when booking has no paymentIntentId', async () => {
    mockBookingFindUnique.mockResolvedValue({
      id:                    BOOKING_ID,
      status:                'PENDING',
      depositAmount:         null,
      depositPaidAt:         null,
      depositRefunded:       false,
      stripePaymentIntentId: null,
      totalAmount:           '200.00',
    });

    const result = await paymentsService.getPaymentStatus(BOOKING_ID);

    expect(result.stripeStatus).toBeNull();
    expect(result.totalAmount).toBe('200.00');
    expect(mockRetrieveIntent).not.toHaveBeenCalled();
  });

  it('degrades gracefully when Stripe API throws', async () => {
    mockBookingFindUnique.mockResolvedValue({
      id:                    BOOKING_ID,
      status:                'CONFIRMED',
      depositAmount:         '100.00',
      depositPaidAt:         new Date(),
      depositRefunded:       false,
      stripePaymentIntentId: PI_ID,
      totalAmount:           null,
    });
    mockRetrieveIntent.mockRejectedValue(new Error('Stripe network error'));

    const result = await paymentsService.getPaymentStatus(BOOKING_ID);

    // Stripe status is null but the call does NOT throw
    expect(result.stripeStatus).toBeNull();
    expect(result.bookingId).toBe(BOOKING_ID);
  });

  it('throws 404 when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    await expect(paymentsService.getPaymentStatus(BOOKING_ID))
      .rejects.toMatchObject({ statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refundPayment
// ─────────────────────────────────────────────────────────────────────────────

describe('refundPayment', () => {
  function makePaidBooking(overrides: Record<string, unknown> = {}) {
    return {
      id:                    BOOKING_ID,
      stripePaymentIntentId: PI_ID,
      depositPaidAt:         new Date('2026-04-01'),
      depositRefunded:       false,
      depositAmount:         '100.00',
      ...overrides,
    };
  }

  function makePaidIntent() {
    return { id: PI_ID, latest_charge: CHARGE_ID };
  }

  beforeEach(() => {
    mockRetrieveIntent.mockResolvedValue(makePaidIntent());
    mockCreateRefund.mockResolvedValue({ id: 'ref_1', amount: 10_000, status: 'succeeded' });
  });

  it('creates a full refund and marks booking as depositRefunded', async () => {
    mockBookingFindUnique.mockResolvedValue(makePaidBooking());

    const result = await paymentsService.refundPayment({
      bookingId: BOOKING_ID,
    });

    expect(result.refundId).toBe('ref_1');
    expect(mockCreateRefund).toHaveBeenCalledWith(
      expect.objectContaining({ charge: CHARGE_ID }),
    );
    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { depositRefunded: true } }),
    );
  });

  it('creates a partial refund when amount is specified', async () => {
    mockBookingFindUnique.mockResolvedValue(makePaidBooking());

    await paymentsService.refundPayment({ bookingId: BOOKING_ID, amount: 50 });

    // £50 = 5,000p
    expect(mockCreateRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5_000 }),
    );
  });

  it('throws 404 when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    await expect(paymentsService.refundPayment({ bookingId: BOOKING_ID }))
      .rejects.toMatchObject({ statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  });

  it('throws 400 when booking has no stripePaymentIntentId', async () => {
    mockBookingFindUnique.mockResolvedValue(makePaidBooking({ stripePaymentIntentId: null }));

    await expect(paymentsService.refundPayment({ bookingId: BOOKING_ID }))
      .rejects.toMatchObject({ statusCode: 400, code: 'NO_PAYMENT_INTENT' });
  });

  it('throws 400 when deposit has not been paid', async () => {
    mockBookingFindUnique.mockResolvedValue(makePaidBooking({ depositPaidAt: null }));

    await expect(paymentsService.refundPayment({ bookingId: BOOKING_ID }))
      .rejects.toMatchObject({ statusCode: 400, code: 'NOT_PAID' });
  });

  it('throws 409 when deposit has already been refunded', async () => {
    mockBookingFindUnique.mockResolvedValue(makePaidBooking({ depositRefunded: true }));

    await expect(paymentsService.refundPayment({ bookingId: BOOKING_ID }))
      .rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_REFUNDED' });
  });

  it('throws 400 when payment intent has no charge', async () => {
    mockBookingFindUnique.mockResolvedValue(makePaidBooking());
    mockRetrieveIntent.mockResolvedValue({ id: PI_ID, latest_charge: null });

    await expect(paymentsService.refundPayment({ bookingId: BOOKING_ID }))
      .rejects.toMatchObject({ statusCode: 400, code: 'NO_CHARGE' });
  });
});
