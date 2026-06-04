/**
 * Unit tests for requireLeadAccess middleware — Phase 0
 *
 * Coverage:
 *  ✓ calls next() for SUPER_ADMIN (regardless of canViewLeads)
 *  ✓ calls next() for ADMIN with canViewLeads=true
 *  ✓ calls next(AppError 403) for ADMIN with canViewLeads=false
 *  ✓ calls next(AppError 403) for ARTIST
 *  ✓ calls next(AppError 403) for CUSTOMER
 *  ✓ calls next(AppError 401) when req.user is not set
 *
 * Total: 6 tests
 */

process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';

import { Request, Response } from 'express';
import { requireLeadAccess } from './requireLeadAccess';
import { AppError } from '../errors/AppError';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(
  overrides: Partial<{
    role: string;
    canViewLeads: boolean;
    canAssignRoles: boolean;
    tenantId: string | null;
  }> | null = {},
): Request {
  if (overrides === null) {
    return { headers: {}, cookies: {} } as unknown as Request;
  }

  const user = {
    id:             'u1',
    email:          'test@example.com',
    role:           'CUSTOMER',
    tenantId:       'tenant1',
    canViewLeads:   false,
    canAssignRoles: false,
    ...overrides,
  };

  return { headers: {}, cookies: {}, user } as unknown as Request;
}

function makeRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn().mockReturnThis(),
  } as unknown as Response;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('requireLeadAccess', () => {
  it('calls next() for SUPER_ADMIN (unrestricted access)', () => {
    const next = jest.fn();
    requireLeadAccess(makeReq({ role: 'SUPER_ADMIN', canViewLeads: false }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(); // called with no error
  });

  it('calls next() for ADMIN with canViewLeads=true', () => {
    const next = jest.fn();
    requireLeadAccess(makeReq({ role: 'ADMIN', canViewLeads: true }), makeRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(AppError 403) for ADMIN with canViewLeads=false', () => {
    const next = jest.fn();
    requireLeadAccess(makeReq({ role: 'ADMIN', canViewLeads: false }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('calls next(AppError 403) for ARTIST', () => {
    const next = jest.fn();
    requireLeadAccess(makeReq({ role: 'ARTIST', canViewLeads: true }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(403);
  });

  it('calls next(AppError 403) for CUSTOMER', () => {
    const next = jest.fn();
    requireLeadAccess(makeReq({ role: 'CUSTOMER', canViewLeads: true }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(403);
  });

  it('calls next(AppError 401) when req.user is not set', () => {
    const next = jest.fn();
    requireLeadAccess(makeReq(null), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });
});
