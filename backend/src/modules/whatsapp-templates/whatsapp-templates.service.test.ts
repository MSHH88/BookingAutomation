/**
 * Unit tests for whatsapp-templates.service.ts — Phase 1 (Messaging Foundation)
 *
 * All external dependencies are mocked:
 *   - ../../lib/prisma           — database calls
 *   - ../../lib/redis            — Redis get / set / del
 *   - ../../lib/template-renderer — template interpolation
 *   - ../../utils/logger         — silenced in tests
 *
 * Coverage:
 *  ✓ listTemplates
 *      — returns paginated results for tenant
 *      — applies isActive filter when provided
 *      — uses default pagination when page/limit not specified
 *      — returns empty list when no templates match
 *
 *  ✓ getTemplateByKey
 *      — returns cached template when Redis has the key (no DB call)
 *      — fetches from DB, writes to cache, and returns data on cache miss
 *      — throws 404 when template not found in DB
 *      — falls through to DB when Redis.get() throws (non-fatal)
 *      — returns data even when Redis.set() throws after DB fetch (non-fatal)
 *
 *  ✓ updateTemplate
 *      — updates template and returns updated data
 *      — invalidates Redis cache after successful update
 *      — throws 404 when template not found
 *      — handles Redis.del() failure gracefully (non-fatal)
 *
 *  ✓ renderWhatsAppTemplate
 *      — renders template body with provided variables
 *      — throws 404 when template not found
 *      — passes variables through to template-renderer
 *
 *  ✓ previewTemplate
 *      — returns key and rendered text
 *      — throws 404 when template not found
 *
 * Total: 17 tests across 5 describes
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockFindFirst = jest.fn();
const mockFindMany  = jest.fn();
const mockCount     = jest.fn();
const mockUpdate    = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    whatsAppTemplate: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      findMany:  (...a: unknown[]) => mockFindMany(...a),
      count:     (...a: unknown[]) => mockCount(...a),
      update:    (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

// ─── Redis mock ───────────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

jest.mock('../../lib/redis', () => ({
  getRedis: () => ({
    get: (...a: unknown[]) => mockRedisGet(...a),
    set: (...a: unknown[]) => mockRedisSet(...a),
    del: (...a: unknown[]) => mockRedisDel(...a),
  }),
}));

// ─── Template renderer mock ──────────────────────────────────────────────────

const mockRender = jest.fn();

jest.mock('../../lib/template-renderer', () => ({
  renderTemplate: (...a: unknown[]) => mockRender(...a),
}));

// ─── Logger mock ─────────────────────────────────────────────────────────────

jest.mock('../../utils/logger', () => ({
  logger: {
    warn:  jest.fn(),
    error: jest.fn(),
    info:  jest.fn(),
    debug: jest.fn(),
  },
}));

// ─── BullMQ mock ─────────────────────────────────────────────────────────────

jest.mock('bullmq', () => ({
  Queue:  jest.fn().mockImplementation(() => ({ add: jest.fn(), close: jest.fn() })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  listTemplates,
  getTemplateByKey,
  updateTemplate,
  renderWhatsAppTemplate,
  previewTemplate,
} from './whatsapp-templates.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const TENANT_ID = 'tenant_1';

const templateFixture = {
  id:        'tpl_1',
  tenantId:  TENANT_ID,
  key:       'lead-inquiry',
  body:      'Hi {{customerName}}, thanks for your inquiry at {{studioName}}!',
  variables: ['customerName', 'studioName'],
  isActive:  true,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const templateFixture2 = {
  id:        'tpl_2',
  tenantId:  TENANT_ID,
  key:       'booking-confirmed',
  body:      'Your booking is confirmed, {{customerName}}!',
  variables: ['customerName'],
  isActive:  true,
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

// ─────────────────────────────────────────────────────────────────────────────
// listTemplates
// ─────────────────────────────────────────────────────────────────────────────

describe('listTemplates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated results for tenant', async () => {
    mockCount.mockResolvedValue(2);
    mockFindMany.mockResolvedValue([templateFixture, templateFixture2]);

    const result = await listTemplates(TENANT_ID, {});

    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT_ID } }),
    );
  });

  it('applies isActive filter when provided', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([templateFixture]);

    await listTemplates(TENANT_ID, { isActive: 'true' });

    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT_ID, isActive: true } }),
    );
  });

  it('uses default pagination when page/limit not specified', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    const result = await listTemplates(TENANT_ID, {});

    expect(result.meta.page).toBe(1);
    expect(result.data).toEqual([]);
  });

  it('returns empty list when no templates match', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    const result = await listTemplates(TENANT_ID, { isActive: 'false' });

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTemplateByKey
// ─────────────────────────────────────────────────────────────────────────────

describe('getTemplateByKey', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns cached template when Redis has the key — no DB call', async () => {
    mockRedisGet.mockResolvedValue(JSON.stringify(templateFixture));

    const result = await getTemplateByKey(TENANT_ID, 'lead-inquiry');

    expect(result).toMatchObject({ key: 'lead-inquiry' });
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('fetches from DB, writes to cache, and returns data on cache miss', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(templateFixture);
    mockRedisSet.mockResolvedValue('OK');

    const result = await getTemplateByKey(TENANT_ID, 'lead-inquiry');

    expect(result).toMatchObject({ key: 'lead-inquiry' });
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
    expect(mockRedisSet).toHaveBeenCalledWith(
      'wa_template:tenant_1:lead-inquiry',
      expect.any(String),
      'EX',
      300,
    );
  });

  it('throws 404 when template not found in DB', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);

    await expect(
      getTemplateByKey(TENANT_ID, 'nonexistent'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEMPLATE_NOT_FOUND',
    });
  });

  it('falls through to DB when Redis.get() throws (non-fatal)', async () => {
    mockRedisGet.mockRejectedValue(new Error('Redis connection refused'));
    mockFindFirst.mockResolvedValue(templateFixture);
    mockRedisSet.mockResolvedValue('OK');

    const result = await getTemplateByKey(TENANT_ID, 'lead-inquiry');

    expect(result).toMatchObject({ key: 'lead-inquiry' });
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });

  it('returns data even when Redis.set() throws after DB fetch (non-fatal)', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(templateFixture);
    mockRedisSet.mockRejectedValue(new Error('Redis write error'));

    const result = await getTemplateByKey(TENANT_ID, 'lead-inquiry');

    expect(result).toMatchObject({ key: 'lead-inquiry' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateTemplate
// ─────────────────────────────────────────────────────────────────────────────

describe('updateTemplate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates template and returns updated data', async () => {
    mockFindFirst.mockResolvedValue({ id: 'tpl_1' });
    const updated = { ...templateFixture, body: 'Updated body' };
    mockUpdate.mockResolvedValue(updated);
    mockRedisDel.mockResolvedValue(1);

    const result = await updateTemplate(TENANT_ID, 'lead-inquiry', { body: 'Updated body' });

    expect(result).toMatchObject({ body: 'Updated body' });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tpl_1' },
        data: { body: 'Updated body' },
      }),
    );
  });

  it('invalidates Redis cache after successful update', async () => {
    mockFindFirst.mockResolvedValue({ id: 'tpl_1' });
    mockUpdate.mockResolvedValue(templateFixture);
    mockRedisDel.mockResolvedValue(1);

    await updateTemplate(TENANT_ID, 'lead-inquiry', { isActive: false });

    expect(mockRedisDel).toHaveBeenCalledWith('wa_template:tenant_1:lead-inquiry');
  });

  it('throws 404 when template not found', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      updateTemplate(TENANT_ID, 'nonexistent', { body: 'test' }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEMPLATE_NOT_FOUND',
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('handles Redis.del() failure gracefully (non-fatal)', async () => {
    mockFindFirst.mockResolvedValue({ id: 'tpl_1' });
    mockUpdate.mockResolvedValue(templateFixture);
    mockRedisDel.mockRejectedValue(new Error('Redis unavailable'));

    await expect(
      updateTemplate(TENANT_ID, 'lead-inquiry', { body: 'Updated' }),
    ).resolves.toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renderWhatsAppTemplate
// ─────────────────────────────────────────────────────────────────────────────

describe('renderWhatsAppTemplate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders template body with provided variables', async () => {
    // getTemplateByKey will use Redis → miss → DB
    mockRedisGet.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(templateFixture);
    mockRedisSet.mockResolvedValue('OK');
    mockRender.mockReturnValue('Hi Jane, thanks for your inquiry at The Ink Spot!');

    const result = await renderWhatsAppTemplate(TENANT_ID, 'lead-inquiry', {
      customerName: 'Jane',
      studioName: 'The Ink Spot',
    });

    expect(result).toBe('Hi Jane, thanks for your inquiry at The Ink Spot!');
    expect(mockRender).toHaveBeenCalledWith(
      templateFixture.body,
      { customerName: 'Jane', studioName: 'The Ink Spot' },
    );
  });

  it('throws 404 when template not found', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);

    await expect(
      renderWhatsAppTemplate(TENANT_ID, 'nonexistent', {}),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEMPLATE_NOT_FOUND',
    });
  });

  it('passes variables through to template-renderer', async () => {
    mockRedisGet.mockResolvedValue(JSON.stringify(templateFixture));
    mockRender.mockReturnValue('rendered');

    await renderWhatsAppTemplate(TENANT_ID, 'lead-inquiry', {
      customerName: 'Bob',
      studioName: 'Studio X',
    });

    expect(mockRender).toHaveBeenCalledWith(
      templateFixture.body,
      { customerName: 'Bob', studioName: 'Studio X' },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// previewTemplate
// ─────────────────────────────────────────────────────────────────────────────

describe('previewTemplate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns key and rendered text', async () => {
    mockRedisGet.mockResolvedValue(JSON.stringify(templateFixture));
    mockRender.mockReturnValue('Hi Jane, thanks for your inquiry at Ink Spot!');

    const result = await previewTemplate(TENANT_ID, 'lead-inquiry', {
      customerName: 'Jane',
      studioName: 'Ink Spot',
    });

    expect(result).toEqual({
      key: 'lead-inquiry',
      rendered: 'Hi Jane, thanks for your inquiry at Ink Spot!',
    });
  });

  it('throws 404 when template not found', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);

    await expect(
      previewTemplate(TENANT_ID, 'nonexistent', {}),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TEMPLATE_NOT_FOUND',
    });
  });
});
