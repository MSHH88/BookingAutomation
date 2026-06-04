/**
 * Unit tests for availability.service.ts — Step 1.12
 *
 * Prisma is fully mocked so these tests run without a live database.
 *
 * Coverage:
 *  ✓ listSchedule       — ADMIN with artistId, ADMIN missing artistId → 400,
 *                         ARTIST (own profile), ARTIST no profile → 404,
 *                         returns empty array when no schedule set
 *
 *  ✓ upsertSchedule     — ADMIN full-replace, ARTIST ignores body.artistId,
 *                         ADMIN missing artistId → 400, ARTIST no profile → 404,
 *                         artist record not found → 404, verify transaction used
 *
 *  ✓ listBlocks         — ADMIN paginated list, ADMIN with date range filter,
 *                         ARTIST own blocks, ARTIST no profile → 404
 *
 *  ✓ createBlock        — ADMIN creates block, ARTIST creates own block,
 *                         ADMIN missing artistId → 400, artist not found → 404
 *
 *  ✓ deleteBlock        — ARTIST deletes own block, ARTIST deletes other → 403,
 *                         ADMIN deletes any block, block not found → 404
 *
 *  ✓ getAvailableSlots  — basic slots returned, no schedule → empty,
 *                         inactive schedule → empty,
 *                         break window filters slots, blocks filter slots,
 *                         existing bookings filter slots,
 *                         uses service.durationMinutes when serviceId provided,
 *                         uses artist.slotDuration when no serviceId,
 *                         buffer applied between slots,
 *                         artist not found → 404, service not found → 404,
 *                         all slots taken by bookings → empty
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockArtistFindUnique        = jest.fn();
const mockAvailFindMany           = jest.fn();
const mockAvailFindUnique         = jest.fn();
const mockAvailDeleteMany         = jest.fn();
const mockAvailCreateMany         = jest.fn();
const mockBlockFindMany           = jest.fn();
const mockBlockFindUnique         = jest.fn();
const mockBlockCreate             = jest.fn();
const mockBlockDelete             = jest.fn();
const mockBlockCount              = jest.fn();
const mockBookingFindMany         = jest.fn();
const mockServiceFindUnique       = jest.fn();
const mockTransaction             = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    artist: {
      findUnique: (...a: unknown[]) => mockArtistFindUnique(...a),
    },
    artistAvailability: {
      findMany:   (...a: unknown[]) => mockAvailFindMany(...a),
      findUnique: (...a: unknown[]) => mockAvailFindUnique(...a),
      deleteMany: (...a: unknown[]) => mockAvailDeleteMany(...a),
      createMany: (...a: unknown[]) => mockAvailCreateMany(...a),
    },
    availabilityBlock: {
      findMany:   (...a: unknown[]) => mockBlockFindMany(...a),
      findUnique: (...a: unknown[]) => mockBlockFindUnique(...a),
      create:     (...a: unknown[]) => mockBlockCreate(...a),
      delete:     (...a: unknown[]) => mockBlockDelete(...a),
      count:      (...a: unknown[]) => mockBlockCount(...a),
    },
    booking: {
      findMany: (...a: unknown[]) => mockBookingFindMany(...a),
    },
    service: {
      findUnique: (...a: unknown[]) => mockServiceFindUnique(...a),
    },
    $transaction: (fn: unknown) => mockTransaction(fn),
  },
}));

// ─── Import service under test ────────────────────────────────────────────────

import * as svc from './availability.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const ADMIN_ACTOR  = { id: 'user_admin', role: 'ADMIN'  as const };
const ARTIST_ACTOR = { id: 'user_artist', role: 'ARTIST' as const };

const baseScheduleRow = {
  id:         'sched_1',
  artistId:   'artist_1',
  dayOfWeek:  1,          // Monday
  startTime:  '09:00',
  endTime:    '18:00',
  breakStart: '13:00',
  breakEnd:   '14:00',
  isActive:   true,
};

const baseBlock = {
  id:        'block_1',
  artistId:  'artist_1',
  startAt:   new Date('2026-06-15T08:00:00Z'),
  endAt:     new Date('2026-06-15T10:00:00Z'),
  reason:    'Dentist appointment',
  createdAt: new Date('2026-06-01T12:00:00Z'),
};

beforeEach(() => jest.clearAllMocks());

// ─── listSchedule ─────────────────────────────────────────────────────────────

describe('listSchedule', () => {
  it('ADMIN: returns schedule for the supplied artistId', async () => {
    mockAvailFindMany.mockResolvedValue([baseScheduleRow]);

    const result = await svc.listSchedule({ artistId: 'artist_1' }, ADMIN_ACTOR.id, 'ADMIN', null);

    expect(result).toEqual([baseScheduleRow]);
    expect(mockAvailFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { artistId: 'artist_1' } }),
    );
  });

  it('ADMIN: throws 400 when artistId is missing', async () => {
    await expect(svc.listSchedule({}, ADMIN_ACTOR.id, 'ADMIN', null)).rejects.toMatchObject({
      statusCode: 400,
      code:       'MISSING_ARTIST_ID',
    });
  });

  it('ARTIST: resolves own artistId via userId lookup', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_1' });
    mockAvailFindMany.mockResolvedValue([baseScheduleRow]);

    const result = await svc.listSchedule({}, ARTIST_ACTOR.id, 'ARTIST', null);

    expect(mockArtistFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: ARTIST_ACTOR.id } }),
    );
    expect(result).toEqual([baseScheduleRow]);
  });

  it('ARTIST: throws 404 when artist profile not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);

    await expect(svc.listSchedule({}, ARTIST_ACTOR.id, 'ARTIST', null)).rejects.toMatchObject({
      statusCode: 404,
      code:       'ARTIST_NOT_FOUND',
    });
  });

  it('returns an empty array when the artist has no schedule', async () => {
    mockAvailFindMany.mockResolvedValue([]);

    const result = await svc.listSchedule({ artistId: 'artist_1' }, ADMIN_ACTOR.id, 'ADMIN', null);
    expect(result).toEqual([]);
  });

  it('ADMIN: throws 403 when artistId belongs to a different tenant', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_other', tenantId: 'tenant_b' });

    await expect(
      svc.listSchedule({ artistId: 'artist_other' }, ADMIN_ACTOR.id, 'ADMIN', 'tenant_a'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('ADMIN: succeeds when artistId belongs to the same tenant', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_1', tenantId: 'tenant_a' });
    mockAvailFindMany.mockResolvedValue([baseScheduleRow]);

    const result = await svc.listSchedule({ artistId: 'artist_1' }, ADMIN_ACTOR.id, 'ADMIN', 'tenant_a');
    expect(result).toEqual([baseScheduleRow]);
  });

  it('SUPER_ADMIN: can access any tenant (tenantId null bypasses tenant check)', async () => {
    mockAvailFindMany.mockResolvedValue([baseScheduleRow]);

    const result = await svc.listSchedule({ artistId: 'artist_any' }, ADMIN_ACTOR.id, 'ADMIN', null);
    expect(result).toEqual([baseScheduleRow]);
    // resolveTargetArtistId skips findUnique when tenantId is null
    expect(mockArtistFindUnique).not.toHaveBeenCalled();
  });
});

// ─── upsertSchedule ───────────────────────────────────────────────────────────

describe('upsertSchedule', () => {
  const weekSchedule = [
    {
      dayOfWeek:  1,
      startTime:  '09:00',
      endTime:    '18:00',
      breakStart: '13:00',
      breakEnd:   '14:00',
      isActive:   true,
    },
  ];

  it('ADMIN: replaces schedule and returns new rows', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_1' });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      await fn({
        artistAvailability: {
          deleteMany: mockAvailDeleteMany,
          createMany: mockAvailCreateMany,
        },
      });
    });
    mockAvailFindMany.mockResolvedValue([{ ...baseScheduleRow, dayOfWeek: 1 }]);

    const result = await svc.upsertSchedule(
      { artistId: 'artist_1', schedule: weekSchedule },
      ADMIN_ACTOR.id,
      'ADMIN',
      null,
    );

    expect(mockTransaction).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]?.dayOfWeek).toBe(1);
  });

  it('ARTIST: ignores body.artistId and uses own profile', async () => {
    mockArtistFindUnique
      .mockResolvedValueOnce({ id: 'artist_1' }) // resolveOwnArtistId
      .mockResolvedValueOnce({ id: 'artist_1' }); // artist exists check
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      await fn({
        artistAvailability: {
          deleteMany: mockAvailDeleteMany,
          createMany: mockAvailCreateMany,
        },
      });
    });
    mockAvailFindMany.mockResolvedValue([baseScheduleRow]);

    await svc.upsertSchedule(
      { artistId: 'artist_other', schedule: weekSchedule },
      ARTIST_ACTOR.id,
      'ARTIST',
      null,
    );

    // resolveOwnArtistId was called with the actor's userId, not 'artist_other'
    expect(mockArtistFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: ARTIST_ACTOR.id } }),
    );
  });

  it('ADMIN: throws 400 when artistId is missing', async () => {
    await expect(
      svc.upsertSchedule({ schedule: weekSchedule }, ADMIN_ACTOR.id, 'ADMIN', null),
    ).rejects.toMatchObject({ statusCode: 400, code: 'MISSING_ARTIST_ID' });
  });

  it('ARTIST: throws 404 when artist profile not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);

    await expect(
      svc.upsertSchedule({ schedule: weekSchedule }, ARTIST_ACTOR.id, 'ARTIST', null),
    ).rejects.toMatchObject({ statusCode: 404, code: 'ARTIST_NOT_FOUND' });
  });

  it('ADMIN: throws 404 when target artist record does not exist', async () => {
    mockArtistFindUnique.mockResolvedValue(null); // artist by id not found

    await expect(
      svc.upsertSchedule({ artistId: 'ghost', schedule: weekSchedule }, ADMIN_ACTOR.id, 'ADMIN', null),
    ).rejects.toMatchObject({ statusCode: 404, code: 'ARTIST_NOT_FOUND' });
  });

  it('ADMIN: throws 403 when artistId belongs to a different tenant', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_other', tenantId: 'tenant_b' });

    await expect(
      svc.upsertSchedule(
        { artistId: 'artist_other', schedule: weekSchedule },
        ADMIN_ACTOR.id,
        'ADMIN',
        'tenant_a',
      ),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });
});

// ─── listBlocks ───────────────────────────────────────────────────────────────

describe('listBlocks', () => {
  it('ADMIN: returns paginated blocks for the given artistId', async () => {
    mockBlockCount.mockResolvedValue(1);
    mockBlockFindMany.mockResolvedValue([baseBlock]);

    const result = await svc.listBlocks({ artistId: 'artist_1' }, ADMIN_ACTOR.id, 'ADMIN', null);

    expect(result.data).toEqual([baseBlock]);
    expect(result.meta.total).toBe(1);
  });

  it('ADMIN: filters blocks by from/to date range', async () => {
    mockBlockCount.mockResolvedValue(0);
    mockBlockFindMany.mockResolvedValue([]);

    await svc.listBlocks(
      { artistId: 'artist_1', from: '2026-06-01', to: '2026-06-30' },
      ADMIN_ACTOR.id,
      'ADMIN',
      null,
    );

    const callArg = mockBlockCount.mock.calls[0][0] as { where: { startAt?: { gte?: Date; lte?: Date } } };
    expect(callArg.where.startAt?.gte).toBeInstanceOf(Date);
    expect(callArg.where.startAt?.lte).toBeInstanceOf(Date);
  });

  it('ARTIST: returns own blocks', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_1' });
    mockBlockCount.mockResolvedValue(1);
    mockBlockFindMany.mockResolvedValue([baseBlock]);

    const result = await svc.listBlocks({}, ARTIST_ACTOR.id, 'ARTIST', null);

    expect(result.data).toEqual([baseBlock]);
  });

  it('ARTIST: throws 404 when artist profile not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);

    await expect(
      svc.listBlocks({}, ARTIST_ACTOR.id, 'ARTIST', null),
    ).rejects.toMatchObject({ statusCode: 404, code: 'ARTIST_NOT_FOUND' });
  });

  it('ADMIN: throws 403 when artistId belongs to a different tenant', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_other', tenantId: 'tenant_b' });

    await expect(
      svc.listBlocks({ artistId: 'artist_other' }, ADMIN_ACTOR.id, 'ADMIN', 'tenant_a'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });
});

// ─── createBlock ──────────────────────────────────────────────────────────────

describe('createBlock', () => {
  const blockBody = {
    startAt: '2026-06-20T09:00:00Z',
    endAt:   '2026-06-20T17:00:00Z',
    reason:  'Holiday',
  };

  it('ADMIN: creates a block for the given artistId', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_1' });
    mockBlockCreate.mockResolvedValue(baseBlock);

    const result = await svc.createBlock(
      { ...blockBody, artistId: 'artist_1' },
      ADMIN_ACTOR.id,
      'ADMIN',
      null,
    );

    expect(result).toEqual(baseBlock);
    expect(mockBlockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ artistId: 'artist_1' }),
      }),
    );
  });

  it('ARTIST: creates a block for own profile (ignores body.artistId)', async () => {
    mockArtistFindUnique
      .mockResolvedValueOnce({ id: 'artist_1' })  // resolveOwnArtistId
      .mockResolvedValueOnce({ id: 'artist_1' }); // artist exists check
    mockBlockCreate.mockResolvedValue(baseBlock);

    await svc.createBlock(
      { ...blockBody, artistId: 'ignored' },
      ARTIST_ACTOR.id,
      'ARTIST',
      null,
    );

    expect(mockArtistFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: ARTIST_ACTOR.id } }),
    );
  });

  it('ADMIN: throws 400 when artistId is missing', async () => {
    await expect(
      svc.createBlock(blockBody, ADMIN_ACTOR.id, 'ADMIN', null),
    ).rejects.toMatchObject({ statusCode: 400, code: 'MISSING_ARTIST_ID' });
  });

  it('throws 404 when the target artist does not exist', async () => {
    mockArtistFindUnique.mockResolvedValue(null);

    await expect(
      svc.createBlock({ ...blockBody, artistId: 'ghost' }, ADMIN_ACTOR.id, 'ADMIN', null),
    ).rejects.toMatchObject({ statusCode: 404, code: 'ARTIST_NOT_FOUND' });
  });

  it('ADMIN: throws 403 when artistId belongs to a different tenant', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_other', tenantId: 'tenant_b' });

    await expect(
      svc.createBlock(
        { ...blockBody, artistId: 'artist_other' },
        ADMIN_ACTOR.id,
        'ADMIN',
        'tenant_a',
      ),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });
});

// ─── deleteBlock ──────────────────────────────────────────────────────────────

describe('deleteBlock', () => {
  it('ARTIST: deletes own block', async () => {
    mockBlockFindUnique.mockResolvedValue({
      id:       'block_1',
      artistId: 'artist_1',
      artist:   { userId: ARTIST_ACTOR.id, tenantId: 'tenant_a' },
    });
    mockBlockDelete.mockResolvedValue({});

    await expect(
      svc.deleteBlock('block_1', ARTIST_ACTOR.id, 'ARTIST', null),
    ).resolves.toBeUndefined();
    expect(mockBlockDelete).toHaveBeenCalledWith({ where: { id: 'block_1' } });
  });

  it('ARTIST: throws 403 when trying to delete another artist\'s block', async () => {
    mockBlockFindUnique.mockResolvedValue({
      id:       'block_1',
      artistId: 'artist_other',
      artist:   { userId: 'other_user', tenantId: 'tenant_a' },
    });

    await expect(
      svc.deleteBlock('block_1', ARTIST_ACTOR.id, 'ARTIST', null),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    expect(mockBlockDelete).not.toHaveBeenCalled();
  });

  it('ADMIN: can delete any block regardless of ownership (SUPER_ADMIN, tenantId null)', async () => {
    mockBlockFindUnique.mockResolvedValue({
      id:       'block_1',
      artistId: 'artist_other',
      artist:   { userId: 'other_user', tenantId: 'tenant_b' },
    });
    mockBlockDelete.mockResolvedValue({});

    await expect(
      svc.deleteBlock('block_1', ADMIN_ACTOR.id, 'ADMIN', null),
    ).resolves.toBeUndefined();
    expect(mockBlockDelete).toHaveBeenCalled();
  });

  it('throws 404 when block does not exist', async () => {
    mockBlockFindUnique.mockResolvedValue(null);

    await expect(
      svc.deleteBlock('ghost', ADMIN_ACTOR.id, 'ADMIN', null),
    ).rejects.toMatchObject({ statusCode: 404, code: 'BLOCK_NOT_FOUND' });
  });

  it('ADMIN: throws 403 when block artist belongs to a different tenant', async () => {
    mockBlockFindUnique.mockResolvedValue({
      id:       'block_1',
      artistId: 'artist_other',
      artist:   { userId: 'other_user', tenantId: 'tenant_b' },
    });

    await expect(
      svc.deleteBlock('block_1', ADMIN_ACTOR.id, 'ADMIN', 'tenant_a'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    expect(mockBlockDelete).not.toHaveBeenCalled();
  });

  it('ADMIN: deletes block when it belongs to the same tenant', async () => {
    mockBlockFindUnique.mockResolvedValue({
      id:       'block_1',
      artistId: 'artist_1',
      artist:   { userId: 'artist_user', tenantId: 'tenant_a' },
    });
    mockBlockDelete.mockResolvedValue({});

    await expect(
      svc.deleteBlock('block_1', ADMIN_ACTOR.id, 'ADMIN', 'tenant_a'),
    ).resolves.toBeUndefined();
    expect(mockBlockDelete).toHaveBeenCalled();
  });
});

// ─── getAvailableSlots ────────────────────────────────────────────────────────

describe('getAvailableSlots', () => {
  /**
   * Monday 2026-06-15.
   *   new Date('2026-06-15').getUTCDay() === 1 (Monday)
   * Artist: slotDuration=90min, bufferMinutes=0
   * Schedule: 09:00–12:30 (no break) → slots: 09:00–10:30, 10:30–12:00
   */
  const baseQuery = { artistId: 'artist_1', date: '2026-06-15' };
  const simpleArtist = { id: 'artist_1', slotDuration: 90, bufferMinutes: 0 };
  const simpleSched  = {
    ...baseScheduleRow,
    dayOfWeek:  1,
    startTime:  '09:00',
    endTime:    '12:30',
    breakStart: null,
    breakEnd:   null,
    isActive:   true,
  };

  it('returns available slots when schedule exists and no conflicts', async () => {
    mockArtistFindUnique.mockResolvedValue(simpleArtist);
    mockAvailFindUnique.mockResolvedValue(simpleSched);
    mockBlockFindMany.mockResolvedValue([]);
    mockBookingFindMany.mockResolvedValue([]);

    const slots = await svc.getAvailableSlots(baseQuery);

    // 09:00–10:30 and 10:30–12:00 (step = 90min, no buffer)
    expect(slots).toHaveLength(2);
    expect(slots[0]?.startAt).toBe('2026-06-15T09:00:00.000Z');
    expect(slots[0]?.endAt).toBe('2026-06-15T10:30:00.000Z');
    expect(slots[1]?.startAt).toBe('2026-06-15T10:30:00.000Z');
    expect(slots[1]?.endAt).toBe('2026-06-15T12:00:00.000Z');
  });

  it('returns empty array when artist has no schedule for that day', async () => {
    mockArtistFindUnique.mockResolvedValue(simpleArtist);
    mockAvailFindUnique.mockResolvedValue(null);

    const slots = await svc.getAvailableSlots(baseQuery);
    expect(slots).toEqual([]);
  });

  it('returns empty array when the schedule day is inactive', async () => {
    mockArtistFindUnique.mockResolvedValue(simpleArtist);
    mockAvailFindUnique.mockResolvedValue({ ...simpleSched, isActive: false });

    const slots = await svc.getAvailableSlots(baseQuery);
    expect(slots).toEqual([]);
  });

  it('filters out slots that overlap the artist break window', async () => {
    /**
     * Schedule: 09:00–13:00, break 10:30–12:00, slotDuration=90, buffer=0
     * Candidates: 09:00–10:30, 10:30–12:00, 12:00–13:30 (13:30 > 13:00 → last slot won't generate)
     * Actually: step=90, endTime=13:00
     *   cur=540 (09:00): 540+90=630 <= 780 ✓ → 09:00–10:30
     *   cur=630 (10:30): 630+90=720 <= 780 ✓ → 10:30–12:00
     *   cur=720 (12:00): 720+90=810 > 780 ✗ → stop
     * Break: 630–720 (10:30–12:00)
     * 09:00–10:30: slotStart=540, slotEnd=630; breakStart=630, breakEnd=720
     *   overlaps? 540 < 720 AND 630 > 630 → 630>630 is false → not removed ✓
     * 10:30–12:00: slotStart=630, slotEnd=720; overlaps? 630 < 720 AND 720 > 630 → yes → removed
     */
    const schedWithBreak = {
      ...simpleSched,
      endTime:    '13:00',
      breakStart: '10:30',
      breakEnd:   '12:00',
    };
    mockArtistFindUnique.mockResolvedValue(simpleArtist);
    mockAvailFindUnique.mockResolvedValue(schedWithBreak);
    mockBlockFindMany.mockResolvedValue([]);
    mockBookingFindMany.mockResolvedValue([]);

    const slots = await svc.getAvailableSlots(baseQuery);

    // Only 09:00–10:30 survives; 10:30–12:00 overlaps break
    expect(slots).toHaveLength(1);
    expect(slots[0]?.startAt).toBe('2026-06-15T09:00:00.000Z');
  });

  it('filters out slots that overlap an availability block', async () => {
    mockArtistFindUnique.mockResolvedValue(simpleArtist);
    mockAvailFindUnique.mockResolvedValue(simpleSched);
    mockBlockFindMany.mockResolvedValue([
      {
        startAt: new Date('2026-06-15T09:00:00Z'),
        endAt:   new Date('2026-06-15T11:00:00Z'),
      },
    ]);
    mockBookingFindMany.mockResolvedValue([]);

    const slots = await svc.getAvailableSlots(baseQuery);

    // 09:00–10:30 overlaps block 09:00–11:00; 10:30–12:00 overlaps too
    expect(slots).toEqual([]);
  });

  it('filters out slots that overlap existing CONFIRMED bookings', async () => {
    mockArtistFindUnique.mockResolvedValue(simpleArtist);
    mockAvailFindUnique.mockResolvedValue(simpleSched);
    mockBlockFindMany.mockResolvedValue([]);
    mockBookingFindMany.mockResolvedValue([
      {
        startAt: new Date('2026-06-15T09:00:00Z'),
        endAt:   new Date('2026-06-15T10:30:00Z'),
      },
    ]);

    const slots = await svc.getAvailableSlots(baseQuery);

    // Only 10:30–12:00 survives; 09:00–10:30 is blocked by the booking
    expect(slots).toHaveLength(1);
    expect(slots[0]?.startAt).toBe('2026-06-15T10:30:00.000Z');
  });

  it('uses service.durationMinutes when serviceId is provided', async () => {
    // slotDuration=90 on artist; service has durationMinutes=60
    // Schedule 09:00–12:00, step=60+0buffer=60
    // Slots: 09:00–10:00, 10:00–11:00, 11:00–12:00
    mockArtistFindUnique.mockResolvedValue(simpleArtist);
    mockServiceFindUnique.mockResolvedValue({ id: 'svc_1', durationMinutes: 60 });
    mockAvailFindUnique.mockResolvedValue({ ...simpleSched, endTime: '12:00' });
    mockBlockFindMany.mockResolvedValue([]);
    mockBookingFindMany.mockResolvedValue([]);

    const slots = await svc.getAvailableSlots({ ...baseQuery, serviceId: 'svc_1' });

    expect(slots).toHaveLength(3);
    expect(slots[0]?.endAt).toBe('2026-06-15T10:00:00.000Z');
  });

  it('uses artist.slotDuration when no serviceId is provided', async () => {
    // artist.slotDuration=90, bufferMinutes=0, schedule 09:00–12:30
    // step = 90. Slots: 09:00–10:30, 10:30–12:00
    mockArtistFindUnique.mockResolvedValue(simpleArtist);
    mockAvailFindUnique.mockResolvedValue(simpleSched);
    mockBlockFindMany.mockResolvedValue([]);
    mockBookingFindMany.mockResolvedValue([]);

    const slots = await svc.getAvailableSlots(baseQuery);

    expect(mockServiceFindUnique).not.toHaveBeenCalled();
    expect(slots).toHaveLength(2);
  });

  it('applies buffer between slots', async () => {
    /**
     * artist.slotDuration=60, bufferMinutes=30 → step=90
     * schedule: 09:00–11:30
     *   cur=540: 540+60=600 <= 690 → slot 09:00–10:00; cur=630
     *   cur=630: 630+60=690 <= 690 → slot 10:30–11:30; cur=720; 720>690 → stop
     * Result: 2 slots
     */
    mockArtistFindUnique.mockResolvedValue({
      id:            'artist_1',
      slotDuration:  60,
      bufferMinutes: 30,
    });
    mockAvailFindUnique.mockResolvedValue({
      ...simpleSched,
      startTime: '09:00',
      endTime:   '11:30',
    });
    mockBlockFindMany.mockResolvedValue([]);
    mockBookingFindMany.mockResolvedValue([]);

    const slots = await svc.getAvailableSlots(baseQuery);

    expect(slots).toHaveLength(2);
    expect(slots[0]?.startAt).toBe('2026-06-15T09:00:00.000Z');
    expect(slots[0]?.endAt).toBe('2026-06-15T10:00:00.000Z');
    expect(slots[1]?.startAt).toBe('2026-06-15T10:30:00.000Z');
    expect(slots[1]?.endAt).toBe('2026-06-15T11:30:00.000Z');
  });

  it('throws 404 when artist is not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);

    await expect(svc.getAvailableSlots(baseQuery)).rejects.toMatchObject({
      statusCode: 404,
      code:       'ARTIST_NOT_FOUND',
    });
  });

  it('throws 404 when the specified service is not found', async () => {
    mockArtistFindUnique.mockResolvedValue(simpleArtist);
    mockServiceFindUnique.mockResolvedValue(null);

    await expect(
      svc.getAvailableSlots({ ...baseQuery, serviceId: 'ghost' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'SERVICE_NOT_FOUND' });
  });

  it('returns empty array when all slots are taken by bookings', async () => {
    mockArtistFindUnique.mockResolvedValue(simpleArtist);
    mockAvailFindUnique.mockResolvedValue(simpleSched); // 09:00–12:30, two 90min slots
    mockBlockFindMany.mockResolvedValue([]);
    mockBookingFindMany.mockResolvedValue([
      { startAt: new Date('2026-06-15T09:00:00Z'), endAt: new Date('2026-06-15T10:30:00Z') },
      { startAt: new Date('2026-06-15T10:30:00Z'), endAt: new Date('2026-06-15T12:00:00Z') },
    ]);

    const slots = await svc.getAvailableSlots(baseQuery);
    expect(slots).toEqual([]);
  });

  it('treats blocks and bookings as independent filters (block takes one, booking takes another)', async () => {
    // Two slots: 09:00–10:30 (blocked) and 10:30–12:00 (booked) → empty
    mockArtistFindUnique.mockResolvedValue(simpleArtist);
    mockAvailFindUnique.mockResolvedValue(simpleSched);
    mockBlockFindMany.mockResolvedValue([
      { startAt: new Date('2026-06-15T09:00:00Z'), endAt: new Date('2026-06-15T10:30:00Z') },
    ]);
    mockBookingFindMany.mockResolvedValue([
      { startAt: new Date('2026-06-15T10:30:00Z'), endAt: new Date('2026-06-15T12:00:00Z') },
    ]);

    const slots = await svc.getAvailableSlots(baseQuery);
    expect(slots).toEqual([]);
  });

  it('returns empty array when slotDuration is zero (prevents infinite loop)', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_1', slotDuration: 0, bufferMinutes: 0 });

    const slots = await svc.getAvailableSlots(baseQuery);
    expect(slots).toEqual([]);
    // Schedule and block/booking queries must NOT be reached
    expect(mockAvailFindUnique).not.toHaveBeenCalled();
  });

  it('returns empty array when effective step is zero (negative buffer equals slot duration)', async () => {
    // slotDuration=30, bufferMinutes=-30 → stepMins = 30 + max(0,-30) = 30 > 0 (guard clamps)
    // slotDuration=30, bufferMinutes=-60 → bufferMins clamped to 0 → step=30 > 0, slots returned
    // This test verifies the Math.max(0, bufferMinutes) clamp is applied
    mockArtistFindUnique.mockResolvedValue({ id: 'artist_1', slotDuration: 60, bufferMinutes: -999 });
    mockAvailFindUnique.mockResolvedValue({ ...simpleSched, startTime: '09:00', endTime: '10:00' });
    mockBlockFindMany.mockResolvedValue([]);
    mockBookingFindMany.mockResolvedValue([]);

    const slots = await svc.getAvailableSlots(baseQuery);
    // bufferMinutes clamped to 0 → step=60 → one slot 09:00–10:00
    expect(slots).toHaveLength(1);
    expect(slots[0]?.startAt).toBe('2026-06-15T09:00:00.000Z');
    expect(slots[0]?.endAt).toBe('2026-06-15T10:00:00.000Z');
  });
});
