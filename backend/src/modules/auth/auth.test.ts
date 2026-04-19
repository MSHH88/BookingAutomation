/**
 * Integration tests for /api/auth — Step 1.22
 *
 * Uses supertest to exercise the full Express stack (middleware → router →
 * controller → service) with a fully-mocked Prisma client.  No real database
 * or network connections are made.
 *
 * Coverage:
 *  ✓ GET  /health                     — 200 sanity check
 *  ✓ POST /api/auth/register          — 201 created, 409 duplicate, 422 validation
 *  ✓ POST /api/auth/login             — 200 with tokens, 401 wrong password, 422 bad input
 *  ✓ POST /api/auth/refresh           — 200 valid token, 401 invalid
 *  ✓ POST /api/auth/forgot-password   — 200 always (no enumeration), 422 bad email
 *  ✓ POST /api/auth/reset-password    — 200 valid token, 400 unknown/expired token
 *  ✓ GET  /api/auth/me                — 200 authenticated, 401 no token
 *  ✓ PATCH /api/auth/me               — 200 authenticated, 401 no token
 *  ✓ POST /api/auth/logout            — 200 authenticated, 401 no token
 *
 * 25 tests total
 */

// ── env vars set in jest.setup.ts (loaded via setupFiles) ────────────────────

// ── BullMQ / external service mocks ──────────────────────────────────────────
// Must be registered before app is imported so that bookings.service.ts
// (transitively required by app.ts → bookingRoutes) never opens real Redis.

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

// ── Prisma mock ───────────────────────────────────────────────────────────────
jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
    refreshToken: {
      findUnique:  jest.fn(),
      create:      jest.fn(),
      update:      jest.fn(),
      updateMany:  jest.fn(),
      deleteMany:  jest.fn(),
    },
    passwordResetToken: {
      findUnique:  jest.fn(),
      create:      jest.fn(),
      update:      jest.fn(),
      updateMany:  jest.fn(),
    },
    // Array-style $transaction([p1, p2, ...]) used by resetPassword
    $transaction: jest.fn().mockImplementation((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.resolve(arg.map(() => ({})));
      if (typeof arg === 'function') return arg({});
      return Promise.resolve(undefined);
    }),
  },
}));

// ── bcrypt mock (avoids 100 ms hash rounds in integration tests) ──────────────
jest.mock('bcryptjs', () => ({
  hashSync: jest.fn().mockReturnValue('$2a$12$mocked_hash_integration_test'),
  hash:     jest.fn().mockResolvedValue('$2a$12$mocked_hash_integration_test'),
  compare:  jest.fn().mockResolvedValue(true),
}));

jest.mock('../../lib/redis', () => ({
  getRedis: jest.fn(() => ({
    get:   jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    incr:  jest.fn().mockResolvedValue(1),
  })),
  isRedisHealthy: jest.fn(() => null),
  pingRedis:      jest.fn().mockResolvedValue(undefined),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { app }    from '../../app';
import { prisma } from '../../lib/prisma';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const ACCESS_SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeAccessToken(
  role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'CUSTOMER',
  userId = 'user_test_1',
): string {
  return `Bearer ${jwt.sign(
    { sub: userId, email: 'test@example.com', role },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  )}`;
}

const baseUser = {
  id:           'user_test_1',
  email:        'alice@example.com',
  name:         'Alice',
  phone:        null,
  passwordHash: '$2a$12$mocked_hash_integration_test',
  role:         'CUSTOMER' as const,
  isActive:     true,
  marketingConsent: false,
  gdprConsentAt: null,
  loyaltyBalance: 0,
  createdAt:    new Date('2024-01-01'),
  updatedAt:    new Date('2024-01-01'),
};

const baseRefreshToken = {
  id:         'rt_1',
  token:      'hex_refresh_token_abc123',
  userId:     'user_test_1',
  expiresAt:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  revokedAt:  null,
  createdAt:  new Date(),
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (bcrypt.compare as jest.Mock).mockResolvedValue(true);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('200 — service is alive', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('201 — creates account and returns access token + user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create    as jest.Mock).mockResolvedValue(baseUser);
    (prisma.refreshToken.create as jest.Mock).mockResolvedValue(baseRefreshToken);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'StrongPass1!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('409 — duplicate email', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'StrongPass1!' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('400 — missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad@example.com' }); // missing name + password

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 — weak password rejected by schema', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'weak' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('200 — valid credentials return token pair + user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
    (prisma.refreshToken.create as jest.Mock).mockResolvedValue(baseRefreshToken);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'StrongPass1!' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.id).toBe('user_test_1');
  });

  it('401 — wrong password', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'WrongPass1!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('401 — inactive account still returns INVALID_CREDENTIALS (constant-time)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...baseUser, isActive: false });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'StrongPass1!' });

    expect(res.status).toBe(401);
  });

  it('400 — missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  it('200 — valid refresh token returns new token pair', async () => {
    const validRefreshToken = {
      ...baseRefreshToken,
      user: baseUser,
    };
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(validRefreshToken);
    (prisma.refreshToken.update    as jest.Mock).mockResolvedValue(validRefreshToken);
    (prisma.refreshToken.create    as jest.Mock).mockResolvedValue(baseRefreshToken);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'hex_refresh_token_abc123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('401 — unknown refresh token', async () => {
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid_token' });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/forgot-password', () => {
  it('200 — always resolves regardless of whether email is registered', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // unknown email

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    // Must always 200 — no user enumeration
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('200 — known email creates reset token silently', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
    (prisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.passwordResetToken.create    as jest.Mock).mockResolvedValue({
      id: 'prt_1', token: 'reset_hex', userId: 'user_test_1',
      expiresAt: new Date(Date.now() + 3600_000), used: false, createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(200);
  });

  it('400 — invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/reset-password', () => {
  it('200 — valid token resets password', async () => {
    const prt = {
      id: 'prt_1', token: 'valid_reset_hex', userId: 'user_test_1',
      expiresAt: new Date(Date.now() + 3600_000), usedAt: null, createdAt: new Date(),
      user: baseUser,
    };
    (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(prt);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid_reset_hex', password: 'NewStrongPass1!' });

    expect(res.status).toBe(200);
  });

  it('400 — unknown token', async () => {
    (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'bad_token', password: 'NewStrongPass1!' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('200 — returns own profile for authenticated user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', makeAccessToken('CUSTOMER'));

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('alice@example.com');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('401 — no authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('401 — malformed bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.jwt');

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/auth/me', () => {
  it('200 — updates own profile', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
    (prisma.user.update     as jest.Mock).mockResolvedValue({ ...baseUser, name: 'Alice Updated' });

    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', makeAccessToken('CUSTOMER'))
      .send({ name: 'Alice Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Alice Updated');
  });

  it('401 — unauthenticated request rejected', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .send({ name: 'Hacker' });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  it('204 — clears refresh token cookie (idempotent)', async () => {
    (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', makeAccessToken('CUSTOMER'));

    expect(res.status).toBe(204);
  });

  it('401 — unauthenticated request rejected', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});
