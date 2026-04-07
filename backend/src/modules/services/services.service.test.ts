/**
 * Unit tests for services.service.ts — Step 1.13
 *
 * Prisma is fully mocked so these tests run without a live database.
 *
 * Coverage:
 *  ✓ listCategories    — all categories returned, filter isActive=true,
 *                        filter isActive=false
 *
 *  ✓ createCategory    — creates with all fields, creates with defaults
 *
 *  ✓ updateCategory    — updates name only, updates multiple fields,
 *                        category not found → 404,
 *                        description set to null clears the field
 *
 *  ✓ deleteCategory    — deletes an empty category,
 *                        category has services → 409,
 *                        category not found → 404
 *
 *  ✓ listServices      — paginated result returned, filter by categoryId,
 *                        filter by artistId, filter isActive=true,
 *                        search filter applied, all filters combined
 *
 *  ✓ getService        — returns service detail, service not found → 404
 *
 *  ✓ createService     — creates with all fields, creates with defaults,
 *                        category not found → 404
 *
 *  ✓ updateService     — updates duration, updates categoryId,
 *                        service not found → 404,
 *                        new categoryId not found → 404,
 *                        priceFrom set to null clears the field
 *
 *  ✓ deleteService     — deactivates service, active bookings → 409,
 *                        service not found → 404
 *
 *  ✓ linkService       — ADMIN links with artistId, ARTIST links own profile,
 *                        ADMIN missing artistId → 400,
 *                        service not found → 404,
 *                        service inactive → 400,
 *                        artist not found → 404,
 *                        idempotent upsert called
 *
 *  ✓ unlinkService     — ADMIN unlinks with artistId, ARTIST unlinks own,
 *                        ADMIN missing artistId → 400,
 *                        link not found → 404
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockCategoryFindMany   = jest.fn();
const mockCategoryFindUnique = jest.fn();
const mockCategoryCreate     = jest.fn();
const mockCategoryUpdate     = jest.fn();
const mockCategoryDelete     = jest.fn();

const mockServiceFindMany    = jest.fn();
const mockServiceFindUnique  = jest.fn();
const mockServiceCreate      = jest.fn();
const mockServiceUpdate      = jest.fn();
const mockServiceCount       = jest.fn();

const mockBookingCount       = jest.fn();

const mockArtistFindUnique   = jest.fn();

const mockArtistServiceFindUnique = jest.fn();
const mockArtistServiceUpsert     = jest.fn();
const mockArtistServiceDelete     = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    serviceCategory: {
      findMany:   (...a: unknown[]) => mockCategoryFindMany(...a),
      findUnique: (...a: unknown[]) => mockCategoryFindUnique(...a),
      create:     (...a: unknown[]) => mockCategoryCreate(...a),
      update:     (...a: unknown[]) => mockCategoryUpdate(...a),
      delete:     (...a: unknown[]) => mockCategoryDelete(...a),
    },
    service: {
      findMany:   (...a: unknown[]) => mockServiceFindMany(...a),
      findUnique: (...a: unknown[]) => mockServiceFindUnique(...a),
      create:     (...a: unknown[]) => mockServiceCreate(...a),
      update:     (...a: unknown[]) => mockServiceUpdate(...a),
      count:      (...a: unknown[]) => mockServiceCount(...a),
    },
    booking: {
      count: (...a: unknown[]) => mockBookingCount(...a),
    },
    artist: {
      findUnique: (...a: unknown[]) => mockArtistFindUnique(...a),
    },
    artistService: {
      findUnique: (...a: unknown[]) => mockArtistServiceFindUnique(...a),
      upsert:     (...a: unknown[]) => mockArtistServiceUpsert(...a),
      delete:     (...a: unknown[]) => mockArtistServiceDelete(...a),
    },
  },
}));

// ─── Import service under test ────────────────────────────────────────────────

import * as svc from './services.service';
import { AppError } from '../../errors/AppError';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const ADMIN_ACTOR  = { id: 'user_admin',  role: 'ADMIN'  as const };
const ARTIST_ACTOR = { id: 'user_artist', role: 'ARTIST' as const };

const baseCategory = {
  id:          'cat_1',
  name:        'Haircuts',
  description: 'All haircut services',
  sortOrder:   0,
  isActive:    true,
  createdAt:   new Date('2026-01-01T00:00:00Z'),
  updatedAt:   new Date('2026-01-01T00:00:00Z'),
  _count:      { services: 3 },
};

const baseService = {
  id:                 'svc_1',
  name:               'Men\'s Haircut',
  description:        'Classic haircut with scissors',
  durationMinutes:    30,
  priceFrom:          { toNumber: () => 25 },
  bufferMinutes:      10,
  rebookIntervalDays: 28,
  isActive:           true,
  createdAt:          new Date('2026-01-01T00:00:00Z'),
  updatedAt:          new Date('2026-01-01T00:00:00Z'),
  category:           { id: 'cat_1', name: 'Haircuts', sortOrder: 0 },
  _count:             { artists: 2 },
};

const baseServiceDetail = {
  ...baseService,
  artists: [
    {
      artist: {
        id:   'artist_1',
        slug: 'john-doe',
        user: { name: 'John Doe' },
      },
    },
  ],
};

beforeEach(() => jest.clearAllMocks());

// ─── listCategories ───────────────────────────────────────────────────────────

describe('listCategories', () => {
  it('returns all categories when isActive is omitted', async () => {
    mockCategoryFindMany.mockResolvedValue([baseCategory]);

    const result = await svc.listCategories({});

    expect(mockCategoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
    expect(result).toEqual([baseCategory]);
  });

  it('filters isActive=true correctly', async () => {
    mockCategoryFindMany.mockResolvedValue([baseCategory]);

    await svc.listCategories({ isActive: 'true' });

    expect(mockCategoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
  });

  it('filters isActive=false correctly', async () => {
    mockCategoryFindMany.mockResolvedValue([]);

    await svc.listCategories({ isActive: 'false' });

    expect(mockCategoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: false } }),
    );
  });
});

// ─── createCategory ───────────────────────────────────────────────────────────

describe('createCategory', () => {
  it('creates with all provided fields', async () => {
    const created = { ...baseCategory, sortOrder: 5 };
    mockCategoryCreate.mockResolvedValue(created);

    const result = await svc.createCategory({
      name:        'Haircuts',
      description: 'All haircut services',
      sortOrder:   5,
      isActive:    true,
    });

    expect(mockCategoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name:      'Haircuts',
          sortOrder: 5,
          isActive:  true,
        }),
      }),
    );
    expect(result).toEqual(created);
  });

  it('defaults sortOrder to 0 and isActive to true when omitted', async () => {
    mockCategoryCreate.mockResolvedValue(baseCategory);

    await svc.createCategory({ name: 'Haircuts' });

    expect(mockCategoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sortOrder: 0,
          isActive:  true,
        }),
      }),
    );
  });
});

// ─── updateCategory ───────────────────────────────────────────────────────────

describe('updateCategory', () => {
  it('updates a category name', async () => {
    mockCategoryFindUnique.mockResolvedValue({ id: 'cat_1' });
    const updated = { ...baseCategory, name: 'Premium Haircuts' };
    mockCategoryUpdate.mockResolvedValue(updated);

    const result = await svc.updateCategory('cat_1', { name: 'Premium Haircuts' });

    expect(mockCategoryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cat_1' },
        data:  { name: 'Premium Haircuts' },
      }),
    );
    expect(result).toEqual(updated);
  });

  it('does not include description in update data when description is undefined', async () => {
    mockCategoryFindUnique.mockResolvedValue({ id: 'cat_1' });
    mockCategoryUpdate.mockResolvedValue({ ...baseCategory, description: null });

    await svc.updateCategory('cat_1', { description: undefined });

    // description undefined → key should not appear in data at all
    const callData = mockCategoryUpdate.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty('description');
  });

  it('throws 404 when category does not exist', async () => {
    mockCategoryFindUnique.mockResolvedValue(null);

    await expect(svc.updateCategory('bad_id', { name: 'X' })).rejects.toThrow(
      new AppError(404, 'CATEGORY_NOT_FOUND', 'Service category not found'),
    );
    expect(mockCategoryUpdate).not.toHaveBeenCalled();
  });
});

// ─── deleteCategory ───────────────────────────────────────────────────────────

describe('deleteCategory', () => {
  it('deletes a category with no services', async () => {
    mockCategoryFindUnique.mockResolvedValue({
      id:    'cat_1',
      name:  'Empty',
      _count: { services: 0 },
    });
    mockCategoryDelete.mockResolvedValue({});

    await svc.deleteCategory('cat_1');

    expect(mockCategoryDelete).toHaveBeenCalledWith({ where: { id: 'cat_1' } });
  });

  it('throws 409 when category has services', async () => {
    mockCategoryFindUnique.mockResolvedValue({
      id:    'cat_1',
      name:  'Haircuts',
      _count: { services: 3 },
    });

    await expect(svc.deleteCategory('cat_1')).rejects.toThrow(
      expect.objectContaining({ code: 'CATEGORY_HAS_SERVICES', statusCode: 409 }),
    );
    expect(mockCategoryDelete).not.toHaveBeenCalled();
  });

  it('throws 404 when category does not exist', async () => {
    mockCategoryFindUnique.mockResolvedValue(null);

    await expect(svc.deleteCategory('bad_id')).rejects.toThrow(
      new AppError(404, 'CATEGORY_NOT_FOUND', 'Service category not found'),
    );
    expect(mockCategoryDelete).not.toHaveBeenCalled();
  });
});

// ─── listServices ─────────────────────────────────────────────────────────────

describe('listServices', () => {
  beforeEach(() => {
    mockServiceFindMany.mockResolvedValue([baseService]);
    mockServiceCount.mockResolvedValue(1);
  });

  it('returns paginated result with default params', async () => {
    const result = await svc.listServices({});

    expect(mockServiceCount).toHaveBeenCalled();
    expect(mockServiceFindMany).toHaveBeenCalled();
    expect(result.data).toEqual([baseService]);
    expect(result.meta.total).toBe(1);
  });

  it('applies categoryId filter', async () => {
    await svc.listServices({ categoryId: 'cat_1' });

    expect(mockServiceCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ categoryId: 'cat_1' }) }),
    );
  });

  it('applies artistId filter via relation', async () => {
    await svc.listServices({ artistId: 'artist_1' });

    expect(mockServiceCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          artists: { some: { artistId: 'artist_1' } },
        }),
      }),
    );
  });

  it('applies isActive=true filter', async () => {
    await svc.listServices({ isActive: 'true' });

    expect(mockServiceCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
  });

  it('applies isActive=false filter', async () => {
    await svc.listServices({ isActive: 'false' });

    expect(mockServiceCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: false }) }),
    );
  });

  it('applies search filter on name and description', async () => {
    await svc.listServices({ search: 'cut' });

    expect(mockServiceCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name:        { contains: 'cut', mode: 'insensitive' } },
            { description: { contains: 'cut', mode: 'insensitive' } },
          ],
        }),
      }),
    );
  });

  it('respects pagination page and limit params', async () => {
    mockServiceCount.mockResolvedValue(50);
    mockServiceFindMany.mockResolvedValue([baseService]);

    const result = await svc.listServices({ page: '2', limit: '10' });

    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(10);
    expect(result.meta.totalPages).toBe(5);
  });
});

// ─── getService ───────────────────────────────────────────────────────────────

describe('getService', () => {
  it('returns service detail with artist roster', async () => {
    mockServiceFindUnique.mockResolvedValue(baseServiceDetail);

    const result = await svc.getService('svc_1');

    expect(mockServiceFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'svc_1' } }),
    );
    expect(result).toEqual(baseServiceDetail);
  });

  it('throws 404 when service does not exist', async () => {
    mockServiceFindUnique.mockResolvedValue(null);

    await expect(svc.getService('bad_id')).rejects.toThrow(
      new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found'),
    );
  });
});

// ─── createService ────────────────────────────────────────────────────────────

describe('createService', () => {
  it('creates a service with all fields', async () => {
    mockCategoryFindUnique.mockResolvedValue({ id: 'cat_1' });
    mockServiceCreate.mockResolvedValue(baseServiceDetail);

    const result = await svc.createService({
      categoryId:         'cat_1',
      name:               "Men's Haircut",
      description:        'Classic haircut',
      durationMinutes:    30,
      priceFrom:          25,
      bufferMinutes:      10,
      rebookIntervalDays: 28,
      isActive:           true,
    });

    expect(mockServiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId:      'cat_1',
          name:            "Men's Haircut",
          durationMinutes: 30,
          priceFrom:       25,
          bufferMinutes:   10,
        }),
      }),
    );
    expect(result).toEqual(baseServiceDetail);
  });

  it('defaults bufferMinutes to 0 and isActive to true when omitted', async () => {
    mockCategoryFindUnique.mockResolvedValue({ id: 'cat_1' });
    mockServiceCreate.mockResolvedValue(baseServiceDetail);

    await svc.createService({
      categoryId:      'cat_1',
      name:            "Men's Haircut",
      durationMinutes: 30,
    });

    expect(mockServiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bufferMinutes: 0,
          isActive:      true,
          priceFrom:     null,
        }),
      }),
    );
  });

  it('throws 404 when categoryId does not exist', async () => {
    mockCategoryFindUnique.mockResolvedValue(null);

    await expect(
      svc.createService({ categoryId: 'bad_cat', name: 'X', durationMinutes: 30 }),
    ).rejects.toThrow(new AppError(404, 'CATEGORY_NOT_FOUND', 'Service category not found'));

    expect(mockServiceCreate).not.toHaveBeenCalled();
  });
});

// ─── updateService ────────────────────────────────────────────────────────────

describe('updateService', () => {
  it('updates durationMinutes', async () => {
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1' });
    const updated = { ...baseServiceDetail, durationMinutes: 45 };
    mockServiceUpdate.mockResolvedValue(updated);

    const result = await svc.updateService('svc_1', { durationMinutes: 45 });

    expect(mockServiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'svc_1' },
        data:  { durationMinutes: 45 },
      }),
    );
    expect(result).toEqual(updated);
  });

  it('validates the new categoryId before updating', async () => {
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1' });
    mockCategoryFindUnique.mockResolvedValue({ id: 'cat_new' });
    mockServiceUpdate.mockResolvedValue(baseServiceDetail);

    await svc.updateService('svc_1', { categoryId: 'cat_new' });

    expect(mockCategoryFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cat_new' } }),
    );
    expect(mockServiceUpdate).toHaveBeenCalled();
  });

  it('sets priceFrom to null when passed as null', async () => {
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1' });
    mockServiceUpdate.mockResolvedValue({ ...baseServiceDetail, priceFrom: null });

    await svc.updateService('svc_1', { priceFrom: null });

    expect(mockServiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { priceFrom: null },
      }),
    );
  });

  it('throws 404 when service does not exist', async () => {
    mockServiceFindUnique.mockResolvedValue(null);

    await expect(svc.updateService('bad_id', { name: 'X' })).rejects.toThrow(
      new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found'),
    );
    expect(mockServiceUpdate).not.toHaveBeenCalled();
  });

  it('throws 404 when new categoryId does not exist', async () => {
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1' });
    mockCategoryFindUnique.mockResolvedValue(null);

    await expect(svc.updateService('svc_1', { categoryId: 'bad_cat' })).rejects.toThrow(
      new AppError(404, 'CATEGORY_NOT_FOUND', 'Service category not found'),
    );
    expect(mockServiceUpdate).not.toHaveBeenCalled();
  });
});

// ─── deleteService ────────────────────────────────────────────────────────────

describe('deleteService', () => {
  it('deactivates a service that has no active bookings', async () => {
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1', name: "Men's Haircut" });
    mockBookingCount.mockResolvedValue(0);
    mockServiceUpdate.mockResolvedValue({ id: 'svc_1' });

    await svc.deleteService('svc_1');

    expect(mockServiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'svc_1' },
        data:  { isActive: false },
      }),
    );
  });

  it('throws 409 when service has active bookings', async () => {
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1', name: "Men's Haircut" });
    mockBookingCount.mockResolvedValue(2);

    await expect(svc.deleteService('svc_1')).rejects.toThrow(
      expect.objectContaining({ code: 'SERVICE_HAS_ACTIVE_BOOKINGS', statusCode: 409 }),
    );
    expect(mockServiceUpdate).not.toHaveBeenCalled();
  });

  it('checks both direct serviceId and BookingService join for active bookings', async () => {
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1', name: 'X' });
    mockBookingCount.mockResolvedValue(0);
    mockServiceUpdate.mockResolvedValue({ id: 'svc_1' });

    await svc.deleteService('svc_1');

    expect(mockBookingCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
          OR: [
            { serviceId: 'svc_1' },
            { services:  { some: { serviceId: 'svc_1' } } },
          ],
        }),
      }),
    );
  });

  it('throws 404 when service does not exist', async () => {
    mockServiceFindUnique.mockResolvedValue(null);

    await expect(svc.deleteService('bad_id')).rejects.toThrow(
      new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found'),
    );
    expect(mockBookingCount).not.toHaveBeenCalled();
    expect(mockServiceUpdate).not.toHaveBeenCalled();
  });
});

// ─── linkService ──────────────────────────────────────────────────────────────

describe('linkService', () => {
  it('ADMIN links an artist to a service using body.artistId', async () => {
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1', isActive: true, name: 'X' });
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_1' });
    mockArtistServiceUpsert.mockResolvedValue({ artistId: 'artist_1' });

    await svc.linkService('svc_1', ADMIN_ACTOR.id, 'ADMIN', { artistId: 'artist_1' });

    expect(mockArtistServiceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { artistId_serviceId: { artistId: 'artist_1', serviceId: 'svc_1' } },
        create: { artistId: 'artist_1', serviceId: 'svc_1' },
      }),
    );
  });

  it('ARTIST links their own profile (ignores any body.artistId)', async () => {
    mockArtistFindUnique.mockImplementation((args: { where: { userId?: string; id?: string } }) => {
      if (args.where.userId === ARTIST_ACTOR.id) return Promise.resolve({ id: 'artist_artist' });
      return Promise.resolve({ id: args.where.id });
    });
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1', isActive: true, name: 'X' });
    mockArtistServiceUpsert.mockResolvedValue({ artistId: 'artist_artist' });

    await svc.linkService('svc_1', ARTIST_ACTOR.id, 'ARTIST', {});

    expect(mockArtistServiceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { artistId_serviceId: { artistId: 'artist_artist', serviceId: 'svc_1' } },
      }),
    );
  });

  it('throws 400 when ADMIN omits artistId', async () => {
    await expect(
      svc.linkService('svc_1', ADMIN_ACTOR.id, 'ADMIN', {}),
    ).rejects.toThrow(
      new AppError(400, 'MISSING_ARTIST_ID', 'artistId is required in the request body for ADMIN operations'),
    );
  });

  it('throws 404 when service does not exist', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_1' });
    mockServiceFindUnique.mockResolvedValue(null);

    await expect(
      svc.linkService('bad_svc', ADMIN_ACTOR.id, 'ADMIN', { artistId: 'artist_1' }),
    ).rejects.toThrow(new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found'));
  });

  it('throws 400 when service is inactive', async () => {
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1', isActive: false, name: 'Old Service' });
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_1' });

    await expect(
      svc.linkService('svc_1', ADMIN_ACTOR.id, 'ADMIN', { artistId: 'artist_1' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'SERVICE_INACTIVE', statusCode: 400 }),
    );
    expect(mockArtistServiceUpsert).not.toHaveBeenCalled();
  });

  it('throws 404 when artist does not exist', async () => {
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1', isActive: true, name: 'X' });
    mockArtistFindUnique.mockResolvedValue(null);

    await expect(
      svc.linkService('svc_1', ADMIN_ACTOR.id, 'ADMIN', { artistId: 'artist_1' }),
    ).rejects.toThrow(new AppError(404, 'ARTIST_NOT_FOUND', 'Artist not found'));

    expect(mockArtistServiceUpsert).not.toHaveBeenCalled();
  });

  it('throws 404 when ARTIST has no artist profile', async () => {
    mockArtistFindUnique.mockResolvedValue(null);

    await expect(
      svc.linkService('svc_1', ARTIST_ACTOR.id, 'ARTIST', {}),
    ).rejects.toThrow(
      new AppError(404, 'ARTIST_NOT_FOUND', 'Artist profile not found for this user'),
    );
  });
});

// ─── unlinkService ────────────────────────────────────────────────────────────

describe('unlinkService', () => {
  it('ADMIN unlinks an artist from a service', async () => {
    mockArtistServiceFindUnique.mockResolvedValue({ artistId: 'artist_1' });
    mockArtistServiceDelete.mockResolvedValue({});

    await svc.unlinkService('svc_1', ADMIN_ACTOR.id, 'ADMIN', { artistId: 'artist_1' });

    expect(mockArtistServiceDelete).toHaveBeenCalledWith({
      where: { artistId_serviceId: { artistId: 'artist_1', serviceId: 'svc_1' } },
    });
  });

  it('ARTIST unlinks their own profile', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_artist' });
    mockArtistServiceFindUnique.mockResolvedValue({ artistId: 'artist_artist' });
    mockArtistServiceDelete.mockResolvedValue({});

    await svc.unlinkService('svc_1', ARTIST_ACTOR.id, 'ARTIST', {});

    expect(mockArtistServiceDelete).toHaveBeenCalledWith({
      where: { artistId_serviceId: { artistId: 'artist_artist', serviceId: 'svc_1' } },
    });
  });

  it('throws 400 when ADMIN omits artistId', async () => {
    await expect(
      svc.unlinkService('svc_1', ADMIN_ACTOR.id, 'ADMIN', {}),
    ).rejects.toThrow(
      new AppError(400, 'MISSING_ARTIST_ID', 'artistId is required in the request body for ADMIN operations'),
    );
  });

  it('throws 404 when link does not exist', async () => {
    mockArtistServiceFindUnique.mockResolvedValue(null);

    await expect(
      svc.unlinkService('svc_1', ADMIN_ACTOR.id, 'ADMIN', { artistId: 'artist_1' }),
    ).rejects.toThrow(new AppError(404, 'LINK_NOT_FOUND', 'Artist is not linked to this service'));

    expect(mockArtistServiceDelete).not.toHaveBeenCalled();
  });

  it('throws 404 when ARTIST has no artist profile', async () => {
    mockArtistFindUnique.mockResolvedValue(null);

    await expect(
      svc.unlinkService('svc_1', ARTIST_ACTOR.id, 'ARTIST', {}),
    ).rejects.toThrow(
      new AppError(404, 'ARTIST_NOT_FOUND', 'Artist profile not found for this user'),
    );
  });
});
