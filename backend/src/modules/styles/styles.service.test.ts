/**
 * Unit tests for styles.service.ts
 *
 * Prisma is fully mocked so these tests run without a database.
 *
 * Coverage:
 *  ✓ listStyles — public (active only) and admin (all / filtered)
 *  ✓ getStyleById — found (active), found (inactive + admin), not found, inactive + public → 404
 *  ✓ createStyle — success, duplicate name → 409
 *  ✓ updateStyle — success, not found → 404, name conflict → 409
 *  ✓ deleteStyle — success, not found → 404
 */

// ─── Mock prisma ──────────────────────────────────────────────────────────────
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    tattooStyle: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      findMany:   (...a: unknown[]) => mockFindMany(...a),
      count:      (...a: unknown[]) => mockCount(...a),
      create:     (...a: unknown[]) => mockCreate(...a),
      update:     (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

// ─── Set required env vars ────────────────────────────────────────────────────
process.env['BUSINESS_TYPE']  = 'tattoo_studio';
process.env['DATABASE_URL']   = 'postgresql://test';
process.env['NODE_ENV']       = 'test';

// ─── Import service under test (after mocks are set up) ──────────────────────
import * as stylesService from './styles.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const baseStyle = {
  id:              'style_cuid_1',
  name:            'Blackwork',
  description:     'High-contrast ink work using solid black',
  exampleImageUrl: null,
  isActive:        true,
};

const inactiveStyle = { ...baseStyle, id: 'style_cuid_2', name: 'Tribal', isActive: false };

// ─── Reset mocks between tests ────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── listStyles ───────────────────────────────────────────────────────────────

describe('listStyles', () => {
  it('public caller gets only active styles', async () => {
    mockCount.mockResolvedValueOnce(1);
    mockFindMany.mockResolvedValueOnce([baseStyle]);

    const result = await stylesService.listStyles({}, false);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Blackwork');
    // The where clause passed to count/findMany should filter isActive = true
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
  });

  it('admin caller with isActive=false gets inactive styles', async () => {
    mockCount.mockResolvedValueOnce(1);
    mockFindMany.mockResolvedValueOnce([inactiveStyle]);

    const result = await stylesService.listStyles({ isActive: 'false' }, true);

    expect(result.data[0].isActive).toBe(false);
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: false } }),
    );
  });

  it('admin caller with no filter gets all styles', async () => {
    mockCount.mockResolvedValueOnce(2);
    mockFindMany.mockResolvedValueOnce([baseStyle, inactiveStyle]);

    const result = await stylesService.listStyles({}, true);

    expect(result.data).toHaveLength(2);
    // where should be empty object (no isActive filter)
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('paginates correctly', async () => {
    mockCount.mockResolvedValueOnce(30);
    mockFindMany.mockResolvedValueOnce([baseStyle]);

    const result = await stylesService.listStyles({ page: '2', limit: '10' }, true);

    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(10);
    expect(result.meta.total).toBe(30);
  });
});

// ─── getStyleById ─────────────────────────────────────────────────────────────

describe('getStyleById', () => {
  it('returns an active style to a public caller', async () => {
    mockFindUnique.mockResolvedValueOnce(baseStyle);

    const result = await stylesService.getStyleById('style_cuid_1', false);
    expect(result.name).toBe('Blackwork');
  });

  it('throws 404 when style does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(stylesService.getStyleById('nonexistent', false)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('public caller gets 404 for an inactive style', async () => {
    mockFindUnique.mockResolvedValueOnce(inactiveStyle);

    await expect(stylesService.getStyleById('style_cuid_2', false)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('admin caller can access an inactive style', async () => {
    mockFindUnique.mockResolvedValueOnce(inactiveStyle);

    const result = await stylesService.getStyleById('style_cuid_2', true);
    expect(result.isActive).toBe(false);
  });
});

// ─── createStyle ─────────────────────────────────────────────────────────────

describe('createStyle', () => {
  it('creates a style successfully', async () => {
    mockFindUnique.mockResolvedValueOnce(null); // no name conflict
    mockCreate.mockResolvedValueOnce(baseStyle);

    const result = await stylesService.createStyle({
      name: 'Blackwork',
      description: 'High-contrast ink work using solid black',
    });

    expect(result.name).toBe('Blackwork');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('throws 409 when name already exists', async () => {
    mockFindUnique.mockResolvedValueOnce(baseStyle); // name conflict

    await expect(
      stylesService.createStyle({ name: 'Blackwork' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });

    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ─── updateStyle ─────────────────────────────────────────────────────────────

describe('updateStyle', () => {
  it('updates fields successfully', async () => {
    mockFindUnique.mockResolvedValueOnce(baseStyle); // style exists
    mockUpdate.mockResolvedValueOnce({ ...baseStyle, description: 'Updated desc' });

    const result = await stylesService.updateStyle('style_cuid_1', {
      description: 'Updated desc',
    });

    expect(result.description).toBe('Updated desc');
  });

  it('throws 404 when style does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(
      stylesService.updateStyle('nonexistent', { name: 'New Name' }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws 409 when renaming to an existing name', async () => {
    mockFindUnique
      .mockResolvedValueOnce(baseStyle)     // style to update
      .mockResolvedValueOnce(inactiveStyle); // name clash

    await expect(
      stylesService.updateStyle('style_cuid_1', { name: 'Tribal' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('does NOT check name uniqueness when name is unchanged', async () => {
    mockFindUnique.mockResolvedValueOnce(baseStyle); // style to update (same name)
    mockUpdate.mockResolvedValueOnce({ ...baseStyle, description: 'Changed' });

    // Providing the same name — should not trigger a uniqueness check
    await stylesService.updateStyle('style_cuid_1', {
      name: 'Blackwork',
      description: 'Changed',
    });

    // findUnique only called once (to fetch the style) — not a second time for name check
    expect(mockFindUnique).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

// ─── deleteStyle ─────────────────────────────────────────────────────────────

describe('deleteStyle', () => {
  it('soft-deletes a style (sets isActive = false)', async () => {
    mockFindUnique.mockResolvedValueOnce(baseStyle);
    mockUpdate.mockResolvedValueOnce({ ...baseStyle, isActive: false });

    await stylesService.deleteStyle('style_cuid_1');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'style_cuid_1' },
        data:  { isActive: false },
      }),
    );
  });

  it('throws 404 when style does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(stylesService.deleteStyle('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
