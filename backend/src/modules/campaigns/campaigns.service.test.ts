/**
 * Unit tests for campaigns.service.ts — Phase 1, Step 1.9
 *
 * Prisma and campaign.job are fully mocked so these tests run without
 * a live database or Redis connection.
 *
 * Coverage:
 *  ✓ listCampaigns
 *      — returns paginated results with no filters
 *      — filters by status
 *      — applies tenant scoping
 *
 *  ✓ getCampaign
 *      — returns record when found
 *      — throws 404 when not found
 *
 *  ✓ createCampaign
 *      — creates record as DRAFT
 *      — creates record with all fields
 *
 *  ✓ updateCampaign
 *      — updates content fields on DRAFT campaign
 *      — transitions DRAFT → SCHEDULED and enqueues job
 *      — transitions DRAFT → CANCELLED
 *      — transitions SCHEDULED → CANCELLED
 *      — rejects edits on SCHEDULED campaign (non-cancel)
 *      — rejects edits on SENT campaign
 *      — throws 404 when campaign not found
 *
 *  ✓ getCampaignStats
 *      — returns stats when found
 *      — throws 404 when campaign not found
 *
 * 15 tests total
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockFindFirst  = jest.fn();
const mockFindMany   = jest.fn();
const mockCount      = jest.fn();
const mockCreate     = jest.fn();
const mockUpdate     = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    campaign: {
      findFirst:  (...a: unknown[]) => mockFindFirst(...a),
      findMany:   (...a: unknown[]) => mockFindMany(...a),
      count:      (...a: unknown[]) => mockCount(...a),
      create:     (...a: unknown[]) => mockCreate(...a),
      update:     (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

const mockEnqueueCampaign = jest.fn().mockResolvedValue(undefined);

jest.mock('../../jobs/campaign.job', () => ({
  enqueueCampaign: (...a: unknown[]) => mockEnqueueCampaign(...a),
}));

jest.mock('bullmq', () => ({
  Queue:  jest.fn().mockImplementation(() => ({ add: jest.fn(), close: jest.fn() })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));

// ─── Import service under test ────────────────────────────────────────────────

import * as service from './campaigns.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const NOW = new Date('2026-04-06T10:00:00Z');
const FUTURE = new Date('2026-04-10T10:00:00Z');

const baseCampaign = {
  id:             'camp_1',
  tenantId:       'tenant_1',
  name:           'Spring Promo',
  channel:        'WHATSAPP',
  templateKey:    'spring_promo',
  audienceFilter: { type: 'ALL' },
  scheduledAt:    null,
  status:         'DRAFT',
  stats:          {},
  createdAt:      NOW,
  updatedAt:      NOW,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// listCampaigns
// ─────────────────────────────────────────────────────────────────────────────

describe('listCampaigns', () => {
  it('returns paginated results with no filters', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([baseCampaign]);

    const result = await service.listCampaigns('tenant_1', {});

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(mockCount).toHaveBeenCalled();
  });

  it('filters by status', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await service.listCampaigns('tenant_1', { status: 'SCHEDULED' });

    const countArgs = mockCount.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(countArgs.where.status).toBe('SCHEDULED');
  });

  it('applies tenant scoping', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await service.listCampaigns('tenant_1', {});

    const countArgs = mockCount.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(countArgs.where.tenantId).toBe('tenant_1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCampaign
// ─────────────────────────────────────────────────────────────────────────────

describe('getCampaign', () => {
  it('returns record when found', async () => {
    mockFindFirst.mockResolvedValue(baseCampaign);

    const result = await service.getCampaign('tenant_1', 'camp_1');

    expect(result.id).toBe('camp_1');
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'camp_1', tenantId: 'tenant_1' }),
      }),
    );
  });

  it('throws 404 when not found', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      service.getCampaign('tenant_1', 'missing'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'CAMPAIGN_NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createCampaign
// ─────────────────────────────────────────────────────────────────────────────

describe('createCampaign', () => {
  it('creates record as DRAFT', async () => {
    mockCreate.mockResolvedValue(baseCampaign);

    const result = await service.createCampaign('tenant_1', {
      name:        'Spring Promo',
      channel:     'WHATSAPP',
      templateKey: 'spring_promo',
      audienceFilter: { type: 'ALL' },
    });

    expect(result.status).toBe('DRAFT');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DRAFT',
          tenantId: 'tenant_1',
        }),
      }),
    );
  });

  it('creates record with all fields including scheduledAt', async () => {
    const withSchedule = { ...baseCampaign, scheduledAt: FUTURE };
    mockCreate.mockResolvedValue(withSchedule);

    const result = await service.createCampaign('tenant_1', {
      name:        'Spring Promo',
      channel:     'WHATSAPP',
      templateKey: 'spring_promo',
      audienceFilter: { type: 'ALL' },
      scheduledAt: '2026-04-10T10:00:00Z',
    });

    expect(result.scheduledAt).toEqual(FUTURE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateCampaign
// ─────────────────────────────────────────────────────────────────────────────

describe('updateCampaign', () => {
  it('updates content fields on DRAFT campaign', async () => {
    mockFindFirst.mockResolvedValue(baseCampaign);
    mockUpdate.mockResolvedValue({ ...baseCampaign, name: 'Summer Promo' });

    const result = await service.updateCampaign('tenant_1', 'camp_1', { name: 'Summer Promo' });

    expect(result.name).toBe('Summer Promo');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Summer Promo' }),
      }),
    );
  });

  it('transitions DRAFT → SCHEDULED and enqueues job', async () => {
    mockFindFirst.mockResolvedValue(baseCampaign);
    mockUpdate.mockResolvedValue({
      ...baseCampaign,
      status:      'SCHEDULED',
      scheduledAt: FUTURE,
    });

    await service.updateCampaign('tenant_1', 'camp_1', {
      status:      'SCHEDULED',
      scheduledAt: '2026-04-10T10:00:00Z',
    });

    expect(mockEnqueueCampaign).toHaveBeenCalledWith('camp_1', expect.any(Number));
  });

  it('transitions DRAFT → CANCELLED', async () => {
    mockFindFirst.mockResolvedValue(baseCampaign);
    mockUpdate.mockResolvedValue({ ...baseCampaign, status: 'CANCELLED' });

    const result = await service.updateCampaign('tenant_1', 'camp_1', { status: 'CANCELLED' });

    expect(result.status).toBe('CANCELLED');
  });

  it('transitions SCHEDULED → CANCELLED', async () => {
    const scheduledCampaign = { ...baseCampaign, status: 'SCHEDULED', scheduledAt: FUTURE };
    mockFindFirst.mockResolvedValue(scheduledCampaign);
    mockUpdate.mockResolvedValue({ ...scheduledCampaign, status: 'CANCELLED' });

    const result = await service.updateCampaign('tenant_1', 'camp_1', { status: 'CANCELLED' });

    expect(result.status).toBe('CANCELLED');
  });

  it('rejects edits on SCHEDULED campaign (non-cancel)', async () => {
    const scheduledCampaign = { ...baseCampaign, status: 'SCHEDULED', scheduledAt: FUTURE };
    mockFindFirst.mockResolvedValue(scheduledCampaign);

    await expect(
      service.updateCampaign('tenant_1', 'camp_1', { name: 'New Name' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CAMPAIGN_NOT_EDITABLE' });
  });

  it('rejects edits on SENT campaign', async () => {
    const sentCampaign = { ...baseCampaign, status: 'SENT' };
    mockFindFirst.mockResolvedValue(sentCampaign);

    await expect(
      service.updateCampaign('tenant_1', 'camp_1', { name: 'New Name' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CAMPAIGN_NOT_EDITABLE' });
  });

  it('throws 404 when campaign not found', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      service.updateCampaign('tenant_1', 'missing', { name: 'New Name' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'CAMPAIGN_NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCampaignStats
// ─────────────────────────────────────────────────────────────────────────────

describe('getCampaignStats', () => {
  it('returns stats when found', async () => {
    const withStats = { ...baseCampaign, stats: { delivered: 10, failed: 2, total: 12 } };
    mockFindFirst.mockResolvedValue(withStats);

    const result = await service.getCampaignStats('tenant_1', 'camp_1');

    expect(result).toEqual({ delivered: 10, failed: 2, total: 12 });
  });

  it('throws 404 when campaign not found', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      service.getCampaignStats('tenant_1', 'missing'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'CAMPAIGN_NOT_FOUND' });
  });
});
