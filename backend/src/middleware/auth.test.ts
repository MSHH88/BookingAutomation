/**
 * Unit tests for requireAuth and requireRole middleware.
 *
 * jwt.verify is mocked to control token behaviour without needing
 * valid secrets.  The auth.service module is also mocked so we don't
 * need a real JWT implementation here — we only test middleware logic.
 */

// ─── Set env vars before config is loaded ────────────────────────────────────
process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-that-is-at-least-32-characters-long';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-that-is-at-least-32-characters-long';
process.env['DATABASE_URL'] = 'postgresql://test';
process.env['NODE_ENV'] = 'test';

jest.mock('bcryptjs', () => ({
  hashSync: jest.fn(() => '$2a$12$mocked'),
  hash: jest.fn(async () => '$2a$12$mocked'),
  compare: jest.fn(async () => true),
}));

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    refreshToken: { create: jest.fn() },
  },
}));

import { Request, Response } from 'express';
import { requireAuth } from './auth';
import { requireRole } from './requireRole';
import { AppError } from '../errors/AppError';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

// ─── requireAuth ──────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  it('calls next() and sets req.user for a valid Bearer token', async () => {
    // Use the real service to create a valid token
    // Import service after mocks are set up
    const { login } = await import('../modules/auth/auth.service');
    const { prisma } = await import('../lib/prisma');

    const baseUser = {
      id: 'u1',
      email: 'test@example.com',
      name: 'Test',
      passwordHash: '$2a$12$h',
      role: 'CUSTOMER' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(baseUser);
    (prisma.refreshToken.create as jest.Mock).mockResolvedValueOnce({
      id: 'rt1',
      token: 'hex',
      expiresAt: new Date(),
    });

    const tokens = await login({ email: baseUser.email, password: 'pass' });

    const req = mockReq({ headers: { authorization: `Bearer ${tokens.accessToken}` } });
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req as Request, res, next);

    expect(next).toHaveBeenCalledWith(); // called with no error
    expect((req as unknown as { user: unknown }).user).toMatchObject({
      id: 'u1',
      email: 'test@example.com',
      role: 'CUSTOMER',
    });
  });

  it('calls next(AppError 401) when Authorization header is missing', () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('calls next(AppError 401) when Bearer is missing from header', () => {
    const req = mockReq({ headers: { authorization: 'Basic abc' } });
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('calls next(AppError 401) for an invalid/tampered token', () => {
    const req = mockReq({
      headers: { authorization: 'Bearer this.is.not.valid' },
    });
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });
});

// ─── requireRole ──────────────────────────────────────────────────────────────

describe('requireRole', () => {
  function reqWithRole(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER'): Request {
    return mockReq({
      user: { id: 'u1', email: 'x@x.com', role },
    } as Partial<Request>);
  }

  it('calls next() when user has exactly the required role', () => {
    const next = jest.fn();
    requireRole('ARTIST')(reqWithRole('ARTIST'), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() when user has a higher role (ADMIN satisfies ARTIST requirement)', () => {
    const next = jest.fn();
    requireRole('ARTIST')(reqWithRole('ADMIN'), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(AppError 403) when user has a lower role', () => {
    const next = jest.fn();
    requireRole('ADMIN')(reqWithRole('CUSTOMER'), mockRes(), next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }),
    );
  });

  it('calls next(AppError 403) when ARTIST tries to access ADMIN-only route', () => {
    const next = jest.fn();
    requireRole('ADMIN')(reqWithRole('ARTIST'), mockRes(), next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }),
    );
  });

  it('calls next(AppError 401) when req.user is not set', () => {
    const req = mockReq({ user: undefined });
    const next = jest.fn();
    requireRole('CUSTOMER')(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }),
    );
  });
});
