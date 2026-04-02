/**
 * Unit tests for auth.service.ts
 *
 * Prisma and bcryptjs are fully mocked so these tests run without a
 * database or real password hashing.  jsonwebtoken is NOT mocked so we
 * verify real JWT behaviour (sign → verify round-trip).
 *
 * Coverage targets per spec:
 *  ✓ register (success + duplicate email)
 *  ✓ login (success + wrong password + inactive user)
 *  ✓ refresh (success + revoked + expired)
 *  ✓ forgotPassword (existing user + unknown email)
 *  ✓ resetPassword (success + used token + expired token)
 *  ✓ getMe (success + not found)
 *  ✓ verifyAccessToken (valid + invalid)
 */
import { AppError } from '../../errors/AppError';

// ─── Mock prisma ──────────────────────────────────────────────────────────────
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateMany = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockFindUnique(...a), create: (...a: unknown[]) => mockCreate(...a), update: (...a: unknown[]) => mockUpdate(...a) },
    refreshToken: { findUnique: (...a: unknown[]) => mockFindUnique(...a), create: (...a: unknown[]) => mockCreate(...a), update: (...a: unknown[]) => mockUpdate(...a), updateMany: (...a: unknown[]) => mockUpdateMany(...a) },
    passwordResetToken: { findUnique: (...a: unknown[]) => mockFindUnique(...a), create: (...a: unknown[]) => mockCreate(...a), update: (...a: unknown[]) => mockUpdate(...a), updateMany: (...a: unknown[]) => mockUpdateMany(...a) },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

// ─── Mock bcryptjs ────────────────────────────────────────────────────────────
jest.mock('bcryptjs', () => ({
  hashSync: jest.fn(() => '$2a$12$mocked_sync_hash'),
  hash: jest.fn(async () => '$2a$12$mocked_hash'),
  compare: jest.fn(async () => true),
}));
import bcrypt from 'bcryptjs';
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

// ─── Set required env vars before importing config / service ──────────────────
process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-that-is-at-least-32-characters-long';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://test';
process.env['NODE_ENV'] = 'test';

// ─── Import service under test (after mocks are set up) ──────────────────────
import * as authService from './auth.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const baseUser = {
  id: 'user_cuid_1',
  email: 'alice@example.com',
  name: 'Alice',
  phone: null,
  passwordHash: '$2a$12$hash',
  role: 'CUSTOMER' as const,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: user not found (overridden per test)
  mockFindUnique.mockResolvedValue(null);
  mockCreate.mockResolvedValue({ id: 'token_1', token: 'hex_token', expiresAt: new Date() });
  mockUpdate.mockResolvedValue({});
  mockUpdateMany.mockResolvedValue({ count: 1 });
  mockTransaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('register', () => {
  it('creates a user and returns tokens when email is unique', async () => {
    // User not found (email is available)
    mockFindUnique.mockResolvedValueOnce(null);
    // User created
    mockCreate.mockResolvedValueOnce(baseUser);
    // Refresh token created
    mockCreate.mockResolvedValueOnce({ id: 'rt_1', token: 'refresh_hex', expiresAt: new Date() });

    const result = await authService.register({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'StrongPass1!',
    });

    expect(result.accessToken).toBeDefined();
    expect(typeof result.refreshToken).toBe('string');
    expect(result.refreshToken.length).toBeGreaterThan(0);
    expect(result.user.email).toBe('alice@example.com');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('throws 409 CONFLICT when email is already registered', async () => {
    mockFindUnique.mockResolvedValueOnce(baseUser);

    await expect(
      authService.register({ name: 'Alice', email: 'alice@example.com', password: 'pass' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('login', () => {
  it('returns tokens when credentials are valid', async () => {
    mockFindUnique.mockResolvedValueOnce(baseUser);
    (bcryptMock.compare as jest.Mock).mockResolvedValueOnce(true);
    // Refresh token created
    mockCreate.mockResolvedValueOnce({ id: 'rt_1', token: 'refresh_hex', expiresAt: new Date() });

    const result = await authService.login({
      email: 'alice@example.com',
      password: 'StrongPass1!',
    });

    expect(result.accessToken).toBeDefined();
    expect(result.user.role).toBe('CUSTOMER');
  });

  it('throws 401 when password is wrong', async () => {
    mockFindUnique.mockResolvedValueOnce(baseUser);
    (bcryptMock.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      authService.login({ email: 'alice@example.com', password: 'WrongPass!' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('throws 401 when user is not found', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    (bcryptMock.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      authService.login({ email: 'ghost@example.com', password: 'pass' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('throws 401 when account is inactive', async () => {
    mockFindUnique.mockResolvedValueOnce({ ...baseUser, isActive: false });
    (bcryptMock.compare as jest.Mock).mockResolvedValueOnce(true);

    await expect(
      authService.login({ email: 'alice@example.com', password: 'StrongPass1!' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('refresh', () => {
  const storedToken = {
    id: 'rt_1',
    token: 'valid_refresh_token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
    revokedAt: null,
    userId: baseUser.id,
    createdAt: new Date(),
    user: baseUser,
  };

  it('rotates tokens and returns new pair for a valid token', async () => {
    mockFindUnique.mockResolvedValueOnce(storedToken);
    mockUpdate.mockResolvedValueOnce({});
    mockCreate.mockResolvedValueOnce({ id: 'rt_2', token: 'new_refresh_hex', expiresAt: new Date() });

    const result = await authService.refresh('valid_refresh_token');

    expect(result.accessToken).toBeDefined();
    expect(typeof result.refreshToken).toBe('string');
    expect(result.refreshToken.length).toBeGreaterThan(0);
    // Old token should be revoked
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ revokedAt: expect.any(Date) }) }),
    );
  });

  it('throws 401 for a revoked token', async () => {
    mockFindUnique.mockResolvedValueOnce({ ...storedToken, revokedAt: new Date() });

    await expect(authService.refresh('revoked_token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TOKEN',
    });
  });

  it('throws 401 for an expired token', async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...storedToken,
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(authService.refresh('expired_token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TOKEN',
    });
  });

  it('throws 401 when token is not found', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(authService.refresh('unknown_token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_TOKEN',
    });
  });
});

// ─── forgotPassword ───────────────────────────────────────────────────────────

describe('forgotPassword', () => {
  it('resolves without error for a registered, active user', async () => {
    mockFindUnique.mockResolvedValueOnce(baseUser);
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });
    mockCreate.mockResolvedValueOnce({ id: 'prt_1', token: 'reset_hex', expiresAt: new Date() });

    await expect(authService.forgotPassword('alice@example.com')).resolves.toBeUndefined();
    expect(mockCreate).toHaveBeenCalled(); // reset token was persisted
  });

  it('resolves without error when email is not registered (no enumeration)', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(authService.forgotPassword('ghost@example.com')).resolves.toBeUndefined();
    expect(mockCreate).not.toHaveBeenCalled(); // no token created
  });

  it('resolves without error for an inactive account (no enumeration)', async () => {
    mockFindUnique.mockResolvedValueOnce({ ...baseUser, isActive: false });

    await expect(authService.forgotPassword('alice@example.com')).resolves.toBeUndefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ─── resetPassword ────────────────────────────────────────────────────────────

describe('resetPassword', () => {
  const validResetToken = {
    id: 'prt_1',
    token: 'valid_reset_token',
    userId: baseUser.id,
    expiresAt: new Date(Date.now() + 30 * 60 * 1_000),
    usedAt: null,
    createdAt: new Date(),
    user: baseUser,
  };

  it('updates the password and revokes refresh tokens on success', async () => {
    mockFindUnique.mockResolvedValueOnce(validResetToken);
    mockTransaction.mockResolvedValueOnce([{}, {}, { count: 1 }]);

    await expect(
      authService.resetPassword({ token: 'valid_reset_token', password: 'NewStrongPass1!' }),
    ).resolves.toBeUndefined();

    expect(mockTransaction).toHaveBeenCalled();
  });

  it('throws 400 for an already-used token', async () => {
    mockFindUnique.mockResolvedValueOnce({ ...validResetToken, usedAt: new Date() });

    await expect(
      authService.resetPassword({ token: 'used_token', password: 'NewStrongPass1!' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_RESET_TOKEN' });
  });

  it('throws 400 for an expired token', async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...validResetToken,
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(
      authService.resetPassword({ token: 'expired_token', password: 'NewStrongPass1!' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_RESET_TOKEN' });
  });

  it('throws 400 when token is not found', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(
      authService.resetPassword({ token: 'ghost_token', password: 'NewStrongPass1!' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_RESET_TOKEN' });
  });
});

// ─── getMe ────────────────────────────────────────────────────────────────────

describe('getMe', () => {
  it('returns safe user data for a valid user ID', async () => {
    mockFindUnique.mockResolvedValueOnce(baseUser);

    const result = await authService.getMe(baseUser.id);

    expect(result.id).toBe(baseUser.id);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws 404 when user ID is not found', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(authService.getMe('nonexistent_id')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

// ─── verifyAccessToken ────────────────────────────────────────────────────────

describe('verifyAccessToken', () => {
  it('returns payload for a valid token', async () => {
    // Create a real token then verify it
    mockFindUnique.mockResolvedValueOnce(baseUser);
    mockCreate.mockResolvedValueOnce({ id: 'rt_1', token: 'refresh_hex', expiresAt: new Date() });

    const tokens = await authService.login({ email: baseUser.email, password: 'pass' });
    const payload = authService.verifyAccessToken(tokens.accessToken);

    expect(payload.sub).toBe(baseUser.id);
    expect(payload.email).toBe(baseUser.email);
  });

  it('throws 401 for a tampered / invalid token', () => {
    expect(() => authService.verifyAccessToken('not.a.valid.jwt')).toThrow(AppError);
    expect(() => authService.verifyAccessToken('not.a.valid.jwt')).toThrow(
      expect.objectContaining({ statusCode: 401, code: 'INVALID_TOKEN' }),
    );
  });
});
