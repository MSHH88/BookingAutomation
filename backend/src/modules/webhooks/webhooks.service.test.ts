/**
 * Unit tests for webhooks.service.ts — Step 1.27
 *
 * Prisma is fully mocked so these tests run without a live database.
 * The webhooks.queue module is mocked to prevent real BullMQ/Redis imports.
 *
 * Coverage:
 *  ✓ listWebhooks      — paginated list (all), isActive filter, empty list
 *  ✓ getWebhookById    — found (secret excluded), not found → 404
 *  ✓ createWebhook     — success (secret returned), events stored, auto secret
 *  ✓ updateWebhook     — partial update: url, events, isActive, description null
 *                        not found → 404, empty body → 400
 *  ✓ deleteWebhook     — success, not found → 404
 *  ✓ listWebhookDeliveries — paginated, success filter, webhook not found → 404
 *  ✓ testWebhook       — active webhook queues test event, inactive → 422,
 *                         not found → 404
 *
 * Total: 22 tests
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockWebhookFindMany   = jest.fn();
const mockWebhookFindUnique = jest.fn();
const mockWebhookCreate     = jest.fn();
const mockWebhookUpdate     = jest.fn();
const mockWebhookDelete     = jest.fn();
const mockWebhookCount      = jest.fn();

const mockDeliveryFindMany = jest.fn();
const mockDeliveryCreate   = jest.fn();
const mockDeliveryCount    = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    webhook: {
      findMany:   (...a: unknown[]) => mockWebhookFindMany(...a),
      findUnique: (...a: unknown[]) => mockWebhookFindUnique(...a),
      create:     (...a: unknown[]) => mockWebhookCreate(...a),
      update:     (...a: unknown[]) => mockWebhookUpdate(...a),
      delete:     (...a: unknown[]) => mockWebhookDelete(...a),
      count:      (...a: unknown[]) => mockWebhookCount(...a),
    },
    webhookDelivery: {
      findMany: (...a: unknown[]) => mockDeliveryFindMany(...a),
      create:   (...a: unknown[]) => mockDeliveryCreate(...a),
      count:    (...a: unknown[]) => mockDeliveryCount(...a),
    },
  },
}));

// ─── Mock webhooks.queue (prevents real BullMQ/Redis imports) ────────────────

jest.mock('./webhooks.queue', () => ({
  enqueueWebhookEvent: jest.fn().mockResolvedValue(undefined),
  webhookQueue:        { close: jest.fn().mockResolvedValue(undefined) },
  startWebhookWorker:  jest.fn(),
}));

// ─── Import service under test ────────────────────────────────────────────────

import * as svc from './webhooks.service';
import { enqueueWebhookEvent } from './webhooks.queue';
import { updateWebhookSchema } from './webhooks.schema';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const WEBHOOK_PUBLIC = {
  id:          'wh_1',
  tenantId:    null,
  url:         'https://example.com/hook',
  events:      ['booking.created', 'booking.confirmed'],
  description: 'Test hook',
  isActive:    true,
  createdAt:   new Date('2025-01-01'),
  updatedAt:   new Date('2025-01-01'),
};

const WEBHOOK_WITH_SECRET = {
  ...WEBHOOK_PUBLIC,
  secret: 'abc123secret',
};

const DELIVERY_ROW = {
  id:         'del_1',
  webhookId:  'wh_1',
  event:      'booking.created',
  payload:    { bookingId: 'b1' },
  statusCode: 200,
  response:   'OK',
  durationMs: 145,
  success:    true,
  error:      null,
  attempt:    1,
  createdAt:  new Date('2025-01-02'),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetMocks() {
  jest.clearAllMocks();
}

// ─── listWebhooks ─────────────────────────────────────────────────────────────

describe('listWebhooks', () => {
  beforeEach(resetMocks);

  it('returns paginated list of all webhooks', async () => {
    mockWebhookCount.mockResolvedValue(1);
    mockWebhookFindMany.mockResolvedValue([WEBHOOK_PUBLIC]);

    const result = await svc.listWebhooks(null, { page: 1, limit: 20, isActive: undefined });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('wh_1');
    expect(result.meta.total).toBe(1);
  });

  it('filters by isActive=true', async () => {
    mockWebhookCount.mockResolvedValue(0);
    mockWebhookFindMany.mockResolvedValue([]);

    const result = await svc.listWebhooks(null, { page: 1, limit: 20, isActive: true });

    expect(mockWebhookCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
    expect(result.data).toHaveLength(0);
  });

  it('returns empty list when no webhooks exist', async () => {
    mockWebhookCount.mockResolvedValue(0);
    mockWebhookFindMany.mockResolvedValue([]);

    const result = await svc.listWebhooks(null, { page: 1, limit: 20, isActive: undefined });

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});

// ─── getWebhookById ───────────────────────────────────────────────────────────

describe('getWebhookById', () => {
  beforeEach(resetMocks);

  it('returns webhook without secret', async () => {
    mockWebhookFindUnique.mockResolvedValue(WEBHOOK_PUBLIC);

    const result = await svc.getWebhookById(null, 'wh_1');

    expect(result.id).toBe('wh_1');
    expect((result as Record<string, unknown>)['secret']).toBeUndefined();
  });

  it('throws 404 when webhook not found', async () => {
    mockWebhookFindUnique.mockResolvedValue(null);

    await expect(svc.getWebhookById(null, 'wh_missing')).rejects.toMatchObject({
      statusCode: 404,
      code:       'WEBHOOK_NOT_FOUND',
    });
  });
});

// ─── createWebhook ────────────────────────────────────────────────────────────

describe('createWebhook', () => {
  beforeEach(resetMocks);

  it('creates webhook and returns secret', async () => {
    mockWebhookCreate.mockResolvedValue(WEBHOOK_WITH_SECRET);

    const result = await svc.createWebhook(null, {
      url:      'https://example.com/hook',
      events:   ['booking.created'],
      isActive: true,
    });

    expect(result.id).toBe('wh_1');
    expect(result.secret).toBe('abc123secret');
    expect(mockWebhookCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          url:    'https://example.com/hook',
          events: ['booking.created'],
        }),
      }),
    );
  });

  it('generates a 64-char hex secret automatically', async () => {
    mockWebhookCreate.mockImplementation((args: { data: { secret: string } }) => ({
      ...WEBHOOK_WITH_SECRET,
      secret: args.data.secret,
    }));

    const result = await svc.createWebhook(null, {
      url:    'https://example.com/hook',
      events: ['lead.created'],
    });

    expect(result.secret).toMatch(/^[0-9a-f]{64}$/);
  });

  it('stores description when provided', async () => {
    mockWebhookCreate.mockResolvedValue({ ...WEBHOOK_WITH_SECRET, description: 'My hook' });

    await svc.createWebhook(null, {
      url:         'https://example.com/hook',
      events:      ['booking.confirmed'],
      description: 'My hook',
    });

    expect(mockWebhookCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: 'My hook' }),
      }),
    );
  });
});

// ─── updateWebhook ────────────────────────────────────────────────────────────

describe('updateWebhook', () => {
  beforeEach(resetMocks);

  it('updates url', async () => {
    mockWebhookFindUnique.mockResolvedValue({ id: 'wh_1', tenantId: null });
    mockWebhookUpdate.mockResolvedValue({ ...WEBHOOK_PUBLIC, url: 'https://new.example.com/hook' });

    const result = await svc.updateWebhook(null, 'wh_1', { url: 'https://new.example.com/hook' });

    expect(result.url).toBe('https://new.example.com/hook');
  });

  it('updates events list', async () => {
    mockWebhookFindUnique.mockResolvedValue({ id: 'wh_1', tenantId: null });
    mockWebhookUpdate.mockResolvedValue({
      ...WEBHOOK_PUBLIC,
      events: ['payment.succeeded'],
    });

    const result = await svc.updateWebhook(null, 'wh_1', { events: ['payment.succeeded'] });

    expect(result.events).toEqual(['payment.succeeded']);
  });

  it('deactivates webhook with isActive=false', async () => {
    mockWebhookFindUnique.mockResolvedValue({ id: 'wh_1', tenantId: null });
    mockWebhookUpdate.mockResolvedValue({ ...WEBHOOK_PUBLIC, isActive: false });

    const result = await svc.updateWebhook(null, 'wh_1', { isActive: false });

    expect(result.isActive).toBe(false);
  });

  it('clears description with null', async () => {
    mockWebhookFindUnique.mockResolvedValue({ id: 'wh_1', tenantId: null });
    mockWebhookUpdate.mockResolvedValue({ ...WEBHOOK_PUBLIC, description: null });

    const result = await svc.updateWebhook(null, 'wh_1', { description: null });

    expect(result.description).toBeNull();
  });

  it('throws 404 when webhook not found', async () => {
    mockWebhookFindUnique.mockResolvedValue(null);

    await expect(svc.updateWebhook(null, 'wh_missing', { isActive: false })).rejects.toMatchObject({
      statusCode: 404,
      code:       'WEBHOOK_NOT_FOUND',
    });
  });

  it('rejects empty request body at schema level', () => {
    const result = updateWebhookSchema.safeParse({
      params: { id: 'wh_1' },
      body:   {},
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0]?.message).toMatch(/at least one field/i);
  });
});

// ─── deleteWebhook ────────────────────────────────────────────────────────────

describe('deleteWebhook', () => {
  beforeEach(resetMocks);

  it('deletes webhook', async () => {
    mockWebhookFindUnique.mockResolvedValue({ id: 'wh_1', tenantId: null });
    mockWebhookDelete.mockResolvedValue({});

    await expect(svc.deleteWebhook(null, 'wh_1')).resolves.toBeUndefined();
    expect(mockWebhookDelete).toHaveBeenCalledWith({ where: { id: 'wh_1' } });
  });

  it('throws 404 when webhook not found', async () => {
    mockWebhookFindUnique.mockResolvedValue(null);

    await expect(svc.deleteWebhook(null, 'wh_missing')).rejects.toMatchObject({
      statusCode: 404,
      code:       'WEBHOOK_NOT_FOUND',
    });
  });
});

// ─── listWebhookDeliveries ────────────────────────────────────────────────────

describe('listWebhookDeliveries', () => {
  beforeEach(resetMocks);

  it('returns paginated delivery history', async () => {
    mockWebhookFindUnique.mockResolvedValue({ id: 'wh_1', tenantId: null });
    mockDeliveryCount.mockResolvedValue(1);
    mockDeliveryFindMany.mockResolvedValue([DELIVERY_ROW]);

    const result = await svc.listWebhookDeliveries(null, 'wh_1', {
      page:    1,
      limit:   20,
      success: undefined,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('del_1');
    expect(result.data[0].success).toBe(true);
  });

  it('filters by success=false', async () => {
    mockWebhookFindUnique.mockResolvedValue({ id: 'wh_1', tenantId: null });
    mockDeliveryCount.mockResolvedValue(0);
    mockDeliveryFindMany.mockResolvedValue([]);

    await svc.listWebhookDeliveries(null, 'wh_1', { page: 1, limit: 20, success: false });

    expect(mockDeliveryCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ success: false }),
      }),
    );
  });

  it('throws 404 when webhook not found', async () => {
    mockWebhookFindUnique.mockResolvedValue(null);

    await expect(
      svc.listWebhookDeliveries(null, 'wh_missing', { page: 1, limit: 20, success: undefined }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code:       'WEBHOOK_NOT_FOUND',
    });
  });
});

// ─── testWebhook ─────────────────────────────────────────────────────────────

describe('testWebhook', () => {
  beforeEach(resetMocks);

  it('enqueues test event for active webhook', async () => {
    mockWebhookFindUnique.mockResolvedValue({ id: 'wh_1', tenantId: null, isActive: true });

    const result = await svc.testWebhook(null, 'wh_1');

    expect(result).toEqual({ queued: true });
    expect(enqueueWebhookEvent).toHaveBeenCalledWith(
      'webhook.test',
      expect.objectContaining({ event: 'webhook.test', webhookId: 'wh_1' }),
      ['wh_1'],
    );
  });

  it('throws 422 when webhook is inactive', async () => {
    mockWebhookFindUnique.mockResolvedValue({ id: 'wh_1', tenantId: null, isActive: false });

    await expect(svc.testWebhook(null, 'wh_1')).rejects.toMatchObject({
      statusCode: 422,
      code:       'WEBHOOK_INACTIVE',
    });
  });

  it('throws 404 when webhook not found', async () => {
    mockWebhookFindUnique.mockResolvedValue(null);

    await expect(svc.testWebhook(null, 'wh_missing')).rejects.toMatchObject({
      statusCode: 404,
      code:       'WEBHOOK_NOT_FOUND',
    });
  });
});
