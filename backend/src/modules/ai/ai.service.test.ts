/**
 * Unit tests for ai.service.ts — Phase 8.2
 *
 * All external dependencies are mocked.
 *
 * Coverage:
 *  ✓ listSuggestions    — empty list, paginated results
 *  ✓ getSuggestion      — success, not found → 404, wrong tenant → 403
 *  ✓ updateSuggestion   — success, not found → 404, wrong tenant → 403, already sent → 409
 *  ✓ sendSuggestion     — success (dispatches notification + marks SENT),
 *                         not found → 404, already sent → 409, dismissed → 409,
 *                         unsubscribed customer → 409
 *  ✓ dismissSuggestion  — success, not found → 404, already sent → 409
 */

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockSuggestionFindMany  = jest.fn();
const mockSuggestionCount     = jest.fn();
const mockSuggestionFindUnique = jest.fn();
const mockSuggestionCreate    = jest.fn();
const mockSuggestionUpdate    = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    aISuggestion: {
      findMany:   (...a: unknown[]) => mockSuggestionFindMany(...a),
      count:      (...a: unknown[]) => mockSuggestionCount(...a),
      findUnique: (...a: unknown[]) => mockSuggestionFindUnique(...a),
      create:     (...a: unknown[]) => mockSuggestionCreate(...a),
      update:     (...a: unknown[]) => mockSuggestionUpdate(...a),
    },
  },
}));

// ─── Mock notification-dispatcher ─────────────────────────────────────────────

const mockDispatchNotification = jest.fn().mockResolvedValue(undefined);

jest.mock('../../lib/notification-dispatcher', () => ({
  dispatchNotification: (...a: unknown[]) => mockDispatchNotification(...a),
}));

// ─── Import service under test ────────────────────────────────────────────────

import * as svc from './ai.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tenantId     = 'tenant_1';
const customerId   = 'customer_1';
const suggestionId = 'sugg_1';

const baseCustomer = {
  id:                  customerId,
  name:                'Jane Doe',
  email:               'jane@example.com',
  phone:               '+447700900000',
  notificationChannel: 'EMAIL',
  unsubscribed:        false,
};

const baseSuggestion = {
  id:          suggestionId,
  tenantId,
  customerId,
  bookingId:   'booking_1',
  message:     "We'd love to see you again!",
  serviceId:   'service_1',
  suggestedAt: null,
  status:      'PENDING',
  sentAt:      null,
  createdAt:   new Date(),
  updatedAt:   new Date(),
  customer:    baseCustomer,
  service:     { id: 'service_1', name: 'Tattoo Session' },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ── listSuggestions ───────────────────────────────────────────────────────────

describe('listSuggestions', () => {
  it('returns empty result', async () => {
    mockSuggestionFindMany.mockResolvedValue([]);
    mockSuggestionCount.mockResolvedValue(0);

    const result = await svc.listSuggestions(tenantId, { page: 1, limit: 20 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns paginated suggestions', async () => {
    mockSuggestionFindMany.mockResolvedValue([baseSuggestion]);
    mockSuggestionCount.mockResolvedValue(1);

    const result = await svc.listSuggestions(tenantId, { page: 1, limit: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(suggestionId);
    expect(result.totalPages).toBe(1);
  });
});

// ── getSuggestion ─────────────────────────────────────────────────────────────

describe('getSuggestion', () => {
  it('returns suggestion on success', async () => {
    mockSuggestionFindUnique.mockResolvedValue(baseSuggestion);
    const result = await svc.getSuggestion(tenantId, suggestionId);
    expect(result.id).toBe(suggestionId);
  });

  it('throws 404 when not found', async () => {
    mockSuggestionFindUnique.mockResolvedValue(null);
    await expect(svc.getSuggestion(tenantId, suggestionId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 403 for wrong tenant', async () => {
    mockSuggestionFindUnique.mockResolvedValue({ ...baseSuggestion, tenantId: 'other_tenant' });
    await expect(svc.getSuggestion(tenantId, suggestionId)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

// ── updateSuggestion ──────────────────────────────────────────────────────────

describe('updateSuggestion', () => {
  it('updates message successfully', async () => {
    mockSuggestionFindUnique.mockResolvedValue({
      id: suggestionId, tenantId, status: 'PENDING',
    });
    mockSuggestionUpdate.mockResolvedValue({ ...baseSuggestion, message: 'New message' });

    const result = await svc.updateSuggestion(tenantId, suggestionId, { message: 'New message' });
    expect(result.message).toBe('New message');
  });

  it('throws 409 when already sent', async () => {
    mockSuggestionFindUnique.mockResolvedValue({
      id: suggestionId, tenantId, status: 'SENT',
    });
    await expect(svc.updateSuggestion(tenantId, suggestionId, { message: 'new' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 404 when not found', async () => {
    mockSuggestionFindUnique.mockResolvedValue(null);
    await expect(svc.updateSuggestion(tenantId, suggestionId, {}))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── sendSuggestion ────────────────────────────────────────────────────────────

describe('sendSuggestion', () => {
  it('dispatches notification and marks SENT', async () => {
    mockSuggestionFindUnique.mockResolvedValue(baseSuggestion);
    mockSuggestionUpdate.mockResolvedValue({ ...baseSuggestion, status: 'SENT' });

    await svc.sendSuggestion(tenantId, suggestionId);

    expect(mockDispatchNotification).toHaveBeenCalledTimes(1);
    expect(mockSuggestionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SENT' }),
    }));
  });

  it('throws 409 when already sent', async () => {
    mockSuggestionFindUnique.mockResolvedValue({ ...baseSuggestion, status: 'SENT' });
    await expect(svc.sendSuggestion(tenantId, suggestionId)).rejects.toMatchObject({
      statusCode: 409, code: 'ALREADY_SENT',
    });
  });

  it('throws 409 when dismissed', async () => {
    mockSuggestionFindUnique.mockResolvedValue({ ...baseSuggestion, status: 'DISMISSED' });
    await expect(svc.sendSuggestion(tenantId, suggestionId)).rejects.toMatchObject({
      statusCode: 409, code: 'SUGGESTION_DISMISSED',
    });
  });

  it('throws 404 when not found', async () => {
    mockSuggestionFindUnique.mockResolvedValue(null);
    await expect(svc.sendSuggestion(tenantId, suggestionId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 409 when customer is unsubscribed', async () => {
    mockSuggestionFindUnique.mockResolvedValue({
      ...baseSuggestion,
      customer: { ...baseCustomer, unsubscribed: true },
    });
    await expect(svc.sendSuggestion(tenantId, suggestionId)).rejects.toMatchObject({
      statusCode: 409, code: 'CUSTOMER_UNSUBSCRIBED',
    });
  });
});

// ── dismissSuggestion ─────────────────────────────────────────────────────────

describe('dismissSuggestion', () => {
  it('marks suggestion as dismissed', async () => {
    mockSuggestionFindUnique.mockResolvedValue({
      id: suggestionId, tenantId, status: 'PENDING',
    });
    mockSuggestionUpdate.mockResolvedValue({});

    await svc.dismissSuggestion(tenantId, suggestionId);
    expect(mockSuggestionUpdate).toHaveBeenCalledWith({
      where: { id: suggestionId },
      data:  { status: 'DISMISSED' },
    });
  });

  it('throws 409 when already sent', async () => {
    mockSuggestionFindUnique.mockResolvedValue({
      id: suggestionId, tenantId, status: 'SENT',
    });
    await expect(svc.dismissSuggestion(tenantId, suggestionId)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('throws 404 when not found', async () => {
    mockSuggestionFindUnique.mockResolvedValue(null);
    await expect(svc.dismissSuggestion(tenantId, suggestionId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
