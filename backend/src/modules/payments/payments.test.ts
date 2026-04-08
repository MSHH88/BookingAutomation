/**
 * Integration tests for /api/payments — Step 1.23
 *
 * Verifies the HTTP layer: authentication, feature-flag gating,
 * request validation, and that the controller delegates correctly to the
 * service layer (which is fully mocked here).
 *
 * Coverage:
 *  ✓ POST /api/payments/create-intent
 *      — 201 ADMIN creates PaymentIntent
 *      — 401 unauthenticated
 *      — 403 ARTIST role (ADMIN-only)
 *      — 400 missing bookingId
 *      — 503 when ONLINE_PAYMENT_ENABLED=false
 *
 *  ✓ POST /api/payments/webhook
 *      — 200 valid webhook signature
 *      — 400 missing Stripe-Signature header
 *      — 400 invalid signature
 *
 *  ✓ GET /api/payments/:bookingId/status
 *      — 200 ADMIN gets payment status
 *      — 401 unauthenticated
 *      — 404 booking not found
 *
 *  ✓ POST /api/payments/:bookingId/refund
 *      — 200 ADMIN creates refund
 *      — 401 unauthenticated
 *      — 409 already refunded
 *
 * 13 tests total
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']           = 'tattoo_studio';
process.env['DATABASE_URL']            = 'postgresql://test';
process.env['NODE_ENV']                = 'test';
process.env['JWT_ACCESS_SECRET']       = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET']      = 'b'.repeat(32);
process.env['STRIPE_SECRET_KEY']       = 'sk_test_placeholder';
process.env['STRIPE_WEBHOOK_SECRET']   = 'whsec_placeholder';

// ─── Mock dependencies ────────────────────────────────────────────────────────

jest.mock('../whatsapp/whatsapp.service', () => ({
  enqueueLeadInquiry:        jest.fn().mockResolvedValue(undefined),
  enqueueBookingConfirmed:   jest.fn().mockResolvedValue(undefined),
  enqueuePostVisitReview:    jest.fn().mockResolvedValue(undefined),
  enqueueRestaurantReminder: jest.fn().mockResolvedValue(undefined),
  testSendWhatsApp:          jest.fn().mockResolvedValue({ messageSid: 'SM_test' }),
}));

jest.mock('../reviews/reviews.queue', () => ({
  enqueueReviewRequest: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../reminders/reminders.queue', () => ({
  enqueueBookingReminder: jest.fn().mockResolvedValue(undefined),
  cancelBookingReminder:  jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));

// Mock the entire payments service so HTTP tests are decoupled from Stripe SDK
jest.mock('./payments.service', () => ({
  createPaymentIntent: jest.fn(),
  handleWebhookEvent:  jest.fn(),
  getPaymentStatus:    jest.fn(),
  refundPayment:       jest.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import request from 'supertest';
import jwt     from 'jsonwebtoken';

import { app }             from '../../app';
import * as paymentsService from './payments.service';
import { AppError }         from '../../errors/AppError';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'ADMIN', userId = 'u_1') {
  return `Bearer ${jwt.sign({ sub: userId, email: 'admin@studio.com', role }, SECRET, { expiresIn: '15m' })}`;
}

const BOOKING_ID = 'book_test_1';
const PI_ID      = 'pi_test_abc';

beforeEach(() => {
  jest.clearAllMocks();
  // Reset feature flag to enabled for each test
  process.env['BUSINESS_TYPE'] = 'tattoo_studio';
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-intent
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/payments/create-intent', () => {
  it('returns 201 with clientSecret for ADMIN', async () => {
    (paymentsService.createPaymentIntent as jest.Mock).mockResolvedValue({
      clientSecret:    'secret_abc',
      paymentIntentId: PI_ID,
      amountPence:     10_000,
      currency:        'GBP',
    });

    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('Authorization', makeToken('ADMIN'))
      .send({ bookingId: BOOKING_ID });

    expect(res.status).toBe(201);
    expect(res.body.data.clientSecret).toBe('secret_abc');
    expect(res.body.data.amountPence).toBe(10_000);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/payments/create-intent')
      .send({ bookingId: BOOKING_ID });

    expect(res.status).toBe(401);
  });

  it('returns 403 for ARTIST role', async () => {
    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('Authorization', makeToken('ARTIST'))
      .send({ bookingId: BOOKING_ID });

    expect(res.status).toBe(403);
  });

  it('returns 400 when bookingId is missing', async () => {
    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('Authorization', makeToken('ADMIN'))
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 503 when ONLINE_PAYMENT_ENABLED is false for business type', async () => {
    process.env['BUSINESS_TYPE'] = 'restaurant'; // restaurant has ONLINE_PAYMENT_ENABLED=false

    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('Authorization', makeToken('ADMIN'))
      .send({ bookingId: BOOKING_ID });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('FEATURE_DISABLED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/payments/webhook', () => {
  it('returns 200 when webhook is processed successfully', async () => {
    (paymentsService.handleWebhookEvent as jest.Mock).mockResolvedValue({ received: true });

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid_sig')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
    expect(res.body.data.received).toBe(true);
  });

  it('returns 400 when Stripe-Signature header is missing', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(400);
  });

  it('returns 400 when Stripe signature is invalid', async () => {
    (paymentsService.handleWebhookEvent as jest.Mock).mockRejectedValue(
      new AppError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Bad signature'),
    );

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'bad_sig')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/:bookingId/status
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/payments/:bookingId/status', () => {
  it('returns 200 with payment status for ADMIN', async () => {
    (paymentsService.getPaymentStatus as jest.Mock).mockResolvedValue({
      bookingId:             BOOKING_ID,
      bookingStatus:         'CONFIRMED',
      depositAmount:         '100.00',
      depositPaidAt:         new Date().toISOString(),
      depositRefunded:       false,
      stripePaymentIntentId: PI_ID,
      stripeStatus:          'succeeded',
    });

    const res = await request(app)
      .get(`/api/payments/${BOOKING_ID}/status`)
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data.bookingId).toBe(BOOKING_ID);
    expect(res.body.data.stripeStatus).toBe('succeeded');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get(`/api/payments/${BOOKING_ID}/status`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when booking not found', async () => {
    (paymentsService.getPaymentStatus as jest.Mock).mockRejectedValue(
      new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found'),
    );

    const res = await request(app)
      .get(`/api/payments/${BOOKING_ID}/status`)
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/:bookingId/refund
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/payments/:bookingId/refund', () => {
  it('returns 200 with refund details for ADMIN', async () => {
    (paymentsService.refundPayment as jest.Mock).mockResolvedValue({
      refundId:  'ref_test_1',
      amount:    10_000,
      status:    'succeeded',
      bookingId: BOOKING_ID,
    });

    const res = await request(app)
      .post(`/api/payments/${BOOKING_ID}/refund`)
      .set('Authorization', makeToken('ADMIN'))
      .send({ reason: 'requested_by_customer' });

    expect(res.status).toBe(200);
    expect(res.body.data.refundId).toBe('ref_test_1');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post(`/api/payments/${BOOKING_ID}/refund`)
      .send({});

    expect(res.status).toBe(401);
  });

  it('returns 409 when deposit already refunded', async () => {
    (paymentsService.refundPayment as jest.Mock).mockRejectedValue(
      new AppError(409, 'ALREADY_REFUNDED', 'Already refunded'),
    );

    const res = await request(app)
      .post(`/api/payments/${BOOKING_ID}/refund`)
      .set('Authorization', makeToken('ADMIN'))
      .send({});

    expect(res.status).toBe(409);
  });
});
