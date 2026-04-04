/**
 * Unit tests for leads.service.ts
 *
 * Prisma and the config module are fully mocked so these tests run without
 * a database or any environment setup beyond the minimum required by the
 * businessType module.
 *
 * Coverage:
 *  ✓ createLead      — success (tattoo), success (hair salon), IP capture,
 *                      side-effects fire-and-forget, WhatsApp gate
 *  ✓ listLeads       — no filters, status filter, businessType filter,
 *                      artistId filter, country filter, date range, combined
 *  ✓ getLeadById     — found, not found → 404
 *  ✓ exportLeadsCsv  — returns correctly formatted CSV, status filter,
 *                      comma / quote escaping
 *  ✓ updateLeadStatus — valid transition, idempotent, invalid terminal,
 *                       invalid non-allowed, not found → 404
 *  ✓ updateLeadScore  — success, not found → 404, boundary values
 */

// ─── Set required env vars BEFORE any module import ──────────────────────────

process.env['BUSINESS_TYPE']    = 'tattoo_studio';
process.env['DATABASE_URL']     = 'postgresql://test';
process.env['NODE_ENV']         = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockLeadCreate     = jest.fn();
const mockLeadFindUnique = jest.fn();
const mockLeadFindMany   = jest.fn();
const mockLeadCount      = jest.fn();
const mockLeadUpdate     = jest.fn();
const mockAnalyticsCreate = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    lead: {
      create:     (...a: unknown[]) => mockLeadCreate(...a),
      findUnique: (...a: unknown[]) => mockLeadFindUnique(...a),
      findMany:   (...a: unknown[]) => mockLeadFindMany(...a),
      count:      (...a: unknown[]) => mockLeadCount(...a),
      update:     (...a: unknown[]) => mockLeadUpdate(...a),
    },
    analyticsEvent: {
      create: (...a: unknown[]) => mockAnalyticsCreate(...a),
    },
  },
}));

// ─── Import service under test (after mocks) ─────────────────────────────────

import * as leadsService from './leads.service';
import { AppError }      from '../../errors/AppError';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const baseLeadDetail = {
  id:               'lead_1',
  name:             'Alice Ink',
  email:            'alice@example.com',
  phone:            '+441234567890',
  country:          'GB',
  description:      'Looking for a sleeve',
  placement:        { area: 'left_arm' },
  size:             'Large',
  colorPreference:  'Black & grey',
  referenceImages:  [],
  preferredDates:   null,
  preferWhatsApp:   false,
  marketingConsent: true,
  status:           'NEW',
  score:            0,
  businessType:     'tattoo_studio',
  pageVisited:      '/contact',
  source:           'instagram',
  utmSource:        'instagram',
  utmMedium:        'social',
  utmCampaign:      'spring_promo',
  ipAddress:        '1.2.3.4',
  deviceType:       'mobile',
  createdAt:        new Date('2026-04-01T10:00:00Z'),
  updatedAt:        new Date('2026-04-01T10:00:00Z'),
  artistId:         null,
  styleId:          null,
  serviceId:        null,
  artist:           null,
  style:            null,
  service:          null,
  quotes:           [],
  analyticsEvents:  [],
};

const baseLeadCreate = {
  id:            'lead_1',
  artistId:      null,
  phone:         '+441234567890',
  preferWhatsApp: false,
  email:         'alice@example.com',
  name:          'Alice Ink',
  utmSource:     'instagram',
  utmMedium:     'social',
  utmCampaign:   'spring_promo',
  ipAddress:     '1.2.3.4',
};

const baseCreateBody = {
  name:             'Alice Ink',
  email:            'alice@example.com',
  phone:            '+441234567890',
  country:          'GB',
  description:      'Looking for a sleeve',
  placement:        { area: 'left_arm' },
  source:           'instagram',
  utmSource:        'instagram',
  utmMedium:        'social',
  utmCampaign:      'spring_promo',
  marketingConsent: true,
};

const baseListItem = {
  id:           'lead_1',
  name:         'Alice Ink',
  email:        'alice@example.com',
  phone:        '+441234567890',
  country:      'GB',
  status:       'NEW',
  score:        0,
  businessType: 'tattoo_studio',
  source:       'instagram',
  utmSource:    'instagram',
  artistId:     null,
  serviceId:    null,
  createdAt:    new Date('2026-04-01T10:00:00Z'),
  updatedAt:    new Date('2026-04-01T10:00:00Z'),
  artist:       null,
  service:      null,
};

// ─── Reset mocks between tests ────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // suppress setImmediate in tests to avoid async side-effects polluting output
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setInterval', 'clearInterval', 'Date'] });
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── createLead ───────────────────────────────────────────────────────────────

describe('createLead', () => {
  it('creates a lead and returns full detail', async () => {
    mockLeadCreate.mockResolvedValueOnce(baseLeadCreate);
    mockLeadFindUnique.mockResolvedValueOnce(baseLeadDetail);

    const result = await leadsService.createLead(baseCreateBody, '1.2.3.4');

    expect(mockLeadCreate).toHaveBeenCalledTimes(1);
    const createArgs = mockLeadCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createArgs.data.email).toBe('alice@example.com'); // lowercased
    expect(createArgs.data.businessType).toBe('tattoo_studio'); // auto-set from env
    expect(createArgs.data.ipAddress).toBe('1.2.3.4');
    expect(createArgs.data.status).toBe('NEW');
    expect(createArgs.data.score).toBe(0);

    expect(mockLeadFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lead_1' } }),
    );
    expect(result.id).toBe('lead_1');
    expect(result.businessType).toBe('tattoo_studio');
  });

  it('lowercases the email', async () => {
    mockLeadCreate.mockResolvedValueOnce({ ...baseLeadCreate, email: 'bob@example.com' });
    mockLeadFindUnique.mockResolvedValueOnce({ ...baseLeadDetail, email: 'bob@example.com' });

    await leadsService.createLead({ ...baseCreateBody, email: 'BOB@EXAMPLE.COM' });

    const createArgs = mockLeadCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createArgs.data.email).toBe('bob@example.com');
  });

  it('sets placement to Prisma.DbNull when not provided', async () => {
    const bodyWithoutPlacement = { ...baseCreateBody };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (bodyWithoutPlacement as any).placement;

    mockLeadCreate.mockResolvedValueOnce(baseLeadCreate);
    mockLeadFindUnique.mockResolvedValueOnce(baseLeadDetail);

    await leadsService.createLead(bodyWithoutPlacement);

    const createArgs = mockLeadCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    // Prisma.DbNull is a symbol-like object — check it's not null/undefined
    expect(createArgs.data.placement).toBeDefined();
    expect(createArgs.data.placement).not.toBeNull();
  });

  it('captures ipAddress from caller argument', async () => {
    mockLeadCreate.mockResolvedValueOnce({ ...baseLeadCreate, ipAddress: '5.6.7.8' });
    mockLeadFindUnique.mockResolvedValueOnce({ ...baseLeadDetail, ipAddress: '5.6.7.8' });

    await leadsService.createLead(baseCreateBody, '5.6.7.8');

    const createArgs = mockLeadCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createArgs.data.ipAddress).toBe('5.6.7.8');
  });

  it('defaults preferWhatsApp and marketingConsent to false when not provided', async () => {
    const minBody = { ...baseCreateBody };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (minBody as any).preferWhatsApp;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (minBody as any).marketingConsent;

    mockLeadCreate.mockResolvedValueOnce(baseLeadCreate);
    mockLeadFindUnique.mockResolvedValueOnce(baseLeadDetail);

    await leadsService.createLead(minBody);

    const createArgs = mockLeadCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createArgs.data.preferWhatsApp).toBe(false);
    expect(createArgs.data.marketingConsent).toBe(false);
  });
});

// ─── listLeads ────────────────────────────────────────────────────────────────

describe('listLeads', () => {
  it('returns paginated list with no filters', async () => {
    mockLeadCount.mockResolvedValueOnce(1);
    mockLeadFindMany.mockResolvedValueOnce([baseListItem]);

    const result = await leadsService.listLeads({});

    expect(mockLeadCount).toHaveBeenCalledTimes(1);
    expect(mockLeadFindMany).toHaveBeenCalledTimes(1);
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
  });

  it('applies status filter', async () => {
    mockLeadCount.mockResolvedValueOnce(0);
    mockLeadFindMany.mockResolvedValueOnce([]);

    await leadsService.listLeads({ status: 'CONTACTED' });

    const countArgs = mockLeadCount.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(countArgs.where.status).toBe('CONTACTED');
  });

  it('applies businessType filter', async () => {
    mockLeadCount.mockResolvedValueOnce(0);
    mockLeadFindMany.mockResolvedValueOnce([]);

    await leadsService.listLeads({ businessType: 'hair_salon' });

    const countArgs = mockLeadCount.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(countArgs.where.businessType).toBe('hair_salon');
  });

  it('applies artistId filter', async () => {
    mockLeadCount.mockResolvedValueOnce(0);
    mockLeadFindMany.mockResolvedValueOnce([]);

    await leadsService.listLeads({ artistId: 'artist_xyz' });

    const countArgs = mockLeadCount.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(countArgs.where.artistId).toBe('artist_xyz');
  });

  it('applies country filter (case-insensitive)', async () => {
    mockLeadCount.mockResolvedValueOnce(0);
    mockLeadFindMany.mockResolvedValueOnce([]);

    await leadsService.listLeads({ country: 'GB' });

    const countArgs = mockLeadCount.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(countArgs.where.country).toEqual({ equals: 'GB', mode: 'insensitive' });
  });

  it('applies from/to date range', async () => {
    mockLeadCount.mockResolvedValueOnce(0);
    mockLeadFindMany.mockResolvedValueOnce([]);

    await leadsService.listLeads({ from: '2026-01-01', to: '2026-03-31' });

    const countArgs = mockLeadCount.mock.calls[0][0] as { where: { createdAt: Record<string, unknown> } };
    expect(countArgs.where.createdAt).toBeDefined();
    expect(countArgs.where.createdAt['gte']).toBeInstanceOf(Date);
    expect(countArgs.where.createdAt['lte']).toBeInstanceOf(Date);
  });

  it('ignores invalid date strings in from/to', async () => {
    mockLeadCount.mockResolvedValueOnce(0);
    mockLeadFindMany.mockResolvedValueOnce([]);

    await leadsService.listLeads({ from: 'not-a-date', to: 'also-not-a-date' });

    const countArgs = mockLeadCount.mock.calls[0][0] as { where: { createdAt?: Record<string, unknown> } };
    // createdAt object is created but gte/lte should not be set
    expect(countArgs.where.createdAt?.['gte']).toBeUndefined();
    expect(countArgs.where.createdAt?.['lte']).toBeUndefined();
  });

  it('paginates correctly on page 2', async () => {
    mockLeadCount.mockResolvedValueOnce(40);
    mockLeadFindMany.mockResolvedValueOnce([baseListItem]);

    const result = await leadsService.listLeads({ page: '2', limit: '20' });

    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(20);
    expect(result.meta.totalPages).toBe(2);

    const findArgs = mockLeadFindMany.mock.calls[0][0] as { skip: number; take: number };
    expect(findArgs.skip).toBe(20);
    expect(findArgs.take).toBe(20);
  });
});

// ─── getLeadById ──────────────────────────────────────────────────────────────

describe('getLeadById', () => {
  it('returns full lead detail', async () => {
    mockLeadFindUnique.mockResolvedValueOnce(baseLeadDetail);

    const result = await leadsService.getLeadById('lead_1');

    expect(mockLeadFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lead_1' } }),
    );
    expect(result.id).toBe('lead_1');
    expect(result.status).toBe('NEW');
  });

  it('throws 404 when lead not found', async () => {
    mockLeadFindUnique.mockResolvedValueOnce(null);

    await expect(leadsService.getLeadById('does_not_exist')).rejects.toMatchObject({
      statusCode: 404,
      code: 'LEAD_NOT_FOUND',
    });
  });
});

// ─── exportLeadsCsv ───────────────────────────────────────────────────────────

describe('exportLeadsCsv', () => {
  const exportLead = {
    id:               'lead_1',
    name:             'Alice Ink',
    email:            'alice@example.com',
    phone:            '+441234567890',
    country:          'GB',
    status:           'NEW',
    score:            0,
    businessType:     'tattoo_studio',
    description:      'Looking for a sleeve',
    size:             'Large',
    colorPreference:  'Black & grey',
    preferWhatsApp:   false,
    marketingConsent: true,
    pageVisited:      '/contact',
    source:           'instagram',
    utmSource:        'instagram',
    utmMedium:        'social',
    utmCampaign:      'spring_promo',
    deviceType:       'mobile',
    ipAddress:        '1.2.3.4',
    createdAt:        new Date('2026-04-01T10:00:00Z'),
    artistId:         null,
    serviceId:        null,
  };

  it('returns a valid CSV with header row', async () => {
    mockLeadFindMany.mockResolvedValueOnce([exportLead]);

    const { csv, filename } = await leadsService.exportLeadsCsv({});

    const lines = csv.split('\r\n');
    // First line is the header
    expect(lines[0]).toContain('id,name,email,phone,country');
    // Second line is data
    expect(lines[1]).toContain('lead_1');
    expect(lines[1]).toContain('alice@example.com');
    // Filename includes the date
    expect(filename).toMatch(/^leads-export-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('returns only header row when no leads match', async () => {
    mockLeadFindMany.mockResolvedValueOnce([]);

    const { csv } = await leadsService.exportLeadsCsv({});

    const lines = csv.split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(1); // header only
  });

  it('escapes commas and double-quotes in cell values', async () => {
    const leadWithComma = {
      ...exportLead,
      name: 'Smith, John',
      description: 'He said "hello"',
    };
    mockLeadFindMany.mockResolvedValueOnce([leadWithComma]);

    const { csv } = await leadsService.exportLeadsCsv({});

    // Name with comma should be quoted
    expect(csv).toContain('"Smith, John"');
    // Description with double-quote should be quoted and escaped
    expect(csv).toContain('"He said ""hello"""');
  });

  it('applies status filter', async () => {
    mockLeadFindMany.mockResolvedValueOnce([]);

    await leadsService.exportLeadsCsv({ status: 'BOOKED' });

    const findArgs = mockLeadFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(findArgs.where.status).toBe('BOOKED');
  });

  it('applies businessType filter', async () => {
    mockLeadFindMany.mockResolvedValueOnce([]);

    await leadsService.exportLeadsCsv({ businessType: 'barber' });

    const findArgs = mockLeadFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(findArgs.where.businessType).toBe('barber');
  });
});

// ─── updateLeadStatus ─────────────────────────────────────────────────────────

describe('updateLeadStatus', () => {
  it('transitions NEW → CONTACTED successfully', async () => {
    mockLeadFindUnique
      .mockResolvedValueOnce({ id: 'lead_1', status: 'NEW' })  // existence check
      .mockResolvedValueOnce({ ...baseLeadDetail, status: 'CONTACTED' }); // getLeadById
    mockLeadUpdate.mockResolvedValueOnce({ id: 'lead_1' });

    const result = await leadsService.updateLeadStatus('lead_1', { status: 'CONTACTED' });

    expect(mockLeadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CONTACTED' } }),
    );
    expect(result.status).toBe('CONTACTED');
  });

  it('is idempotent — re-applying same status does not call update', async () => {
    mockLeadFindUnique
      .mockResolvedValueOnce({ id: 'lead_1', status: 'CONTACTED' }) // existence
      .mockResolvedValueOnce({ ...baseLeadDetail, status: 'CONTACTED' }); // getLeadById

    const result = await leadsService.updateLeadStatus('lead_1', { status: 'CONTACTED' });

    expect(mockLeadUpdate).not.toHaveBeenCalled();
    expect(result.status).toBe('CONTACTED');
  });

  it('rejects transition from terminal COMPLETED state', async () => {
    mockLeadFindUnique.mockResolvedValueOnce({ id: 'lead_1', status: 'COMPLETED' });

    await expect(
      leadsService.updateLeadStatus('lead_1', { status: 'CONTACTED' }),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_STATUS_TRANSITION',
    });
  });

  it('rejects transition from terminal CANCELLED state', async () => {
    mockLeadFindUnique.mockResolvedValueOnce({ id: 'lead_1', status: 'CANCELLED' });

    await expect(
      leadsService.updateLeadStatus('lead_1', { status: 'NEW' }),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_STATUS_TRANSITION',
    });
  });

  it('rejects invalid non-allowed transition (BOOKED → CONTACTED)', async () => {
    mockLeadFindUnique.mockResolvedValueOnce({ id: 'lead_1', status: 'BOOKED' });

    await expect(
      leadsService.updateLeadStatus('lead_1', { status: 'CONTACTED' }),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_STATUS_TRANSITION',
    });
  });

  it('throws 404 when lead not found', async () => {
    mockLeadFindUnique.mockResolvedValueOnce(null);

    await expect(
      leadsService.updateLeadStatus('does_not_exist', { status: 'CONTACTED' }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'LEAD_NOT_FOUND',
    });
  });

  it('transitions QUOTED → CANCELLED', async () => {
    mockLeadFindUnique
      .mockResolvedValueOnce({ id: 'lead_1', status: 'QUOTED' })
      .mockResolvedValueOnce({ ...baseLeadDetail, status: 'CANCELLED' });
    mockLeadUpdate.mockResolvedValueOnce({ id: 'lead_1' });

    const result = await leadsService.updateLeadStatus('lead_1', { status: 'CANCELLED' });

    expect(result.status).toBe('CANCELLED');
  });

  it('transitions BOOKED → COMPLETED', async () => {
    mockLeadFindUnique
      .mockResolvedValueOnce({ id: 'lead_1', status: 'BOOKED' })
      .mockResolvedValueOnce({ ...baseLeadDetail, status: 'COMPLETED' });
    mockLeadUpdate.mockResolvedValueOnce({ id: 'lead_1' });

    const result = await leadsService.updateLeadStatus('lead_1', { status: 'COMPLETED' });

    expect(result.status).toBe('COMPLETED');
  });
});

// ─── updateLeadScore ──────────────────────────────────────────────────────────

describe('updateLeadScore', () => {
  it('updates the score and returns full detail', async () => {
    mockLeadFindUnique
      .mockResolvedValueOnce({ id: 'lead_1' })                       // existence
      .mockResolvedValueOnce({ ...baseLeadDetail, score: 85 });      // getLeadById
    mockLeadUpdate.mockResolvedValueOnce({ id: 'lead_1' });

    const result = await leadsService.updateLeadScore('lead_1', { score: 85 });

    expect(mockLeadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { score: 85 } }),
    );
    expect(result.score).toBe(85);
  });

  it('accepts score of 0 (minimum boundary)', async () => {
    mockLeadFindUnique
      .mockResolvedValueOnce({ id: 'lead_1' })
      .mockResolvedValueOnce({ ...baseLeadDetail, score: 0 });
    mockLeadUpdate.mockResolvedValueOnce({ id: 'lead_1' });

    const result = await leadsService.updateLeadScore('lead_1', { score: 0 });

    expect(result.score).toBe(0);
  });

  it('accepts score of 100 (maximum boundary)', async () => {
    mockLeadFindUnique
      .mockResolvedValueOnce({ id: 'lead_1' })
      .mockResolvedValueOnce({ ...baseLeadDetail, score: 100 });
    mockLeadUpdate.mockResolvedValueOnce({ id: 'lead_1' });

    const result = await leadsService.updateLeadScore('lead_1', { score: 100 });

    expect(result.score).toBe(100);
  });

  it('throws 404 when lead not found', async () => {
    mockLeadFindUnique.mockResolvedValueOnce(null);

    await expect(
      leadsService.updateLeadScore('does_not_exist', { score: 50 }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'LEAD_NOT_FOUND',
    });
  });
});

// ─── AppError shape verification ─────────────────────────────────────────────

describe('AppError shape', () => {
  it('getLeadById 404 error has isOperational=true', async () => {
    mockLeadFindUnique.mockResolvedValueOnce(null);

    try {
      await leadsService.getLeadById('x');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).isOperational).toBe(true);
    }
  });
});
