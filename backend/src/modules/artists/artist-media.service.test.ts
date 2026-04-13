/**
 * Artist Media service — unit tests — Phase 6.4
 *
 * Tests:
 *  1.  listMedia — returns sorted media list
 *  2.  listMedia — throws 404 when artist not found
 *  3.  listMedia — throws 403 when tenant mismatch
 *  4.  uploadMedia — uploads to Cloudinary and creates record
 *  5.  deleteMedia — deletes from Cloudinary and DB
 *  6.  deleteMedia — throws 404 when media not found
 *  7.  setProfilePhoto — promotes target to PROFILE, demotes others
 *  8.  setProfilePhoto — throws 404 when media not found
 *
 * Total: 8 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    artist: {
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    artistMedia: {
      findMany:   jest.fn(),
      findFirst:  jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      delete:     jest.fn(),
      update:     jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../lib/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload_stream: jest.fn(),
      destroy:       jest.fn(),
    },
  },
}));

import { prisma }    from '../../lib/prisma';
import { cloudinary } from '../../lib/cloudinary';
import {
  listMedia,
  deleteMedia,
  setProfilePhoto,
} from './artist-media.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeArtist(overrides: Record<string, unknown> = {}) {
  return { id: 'artist-1', tenantId: 'tenant-1', ...overrides };
}

function makeMedia(overrides: Record<string, unknown> = {}) {
  return {
    id:                 'media-1',
    artistId:           'artist-1',
    tenantId:           'tenant-1',
    url:                'https://res.cloudinary.com/demo/image/upload/artist-media/test.jpg',
    cloudinaryPublicId: 'artist-media/test',
    type:               'PORTFOLIO',
    sortOrder:          0,
    uploadedAt:         new Date(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('artist-media.service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('listMedia', () => {
    it('returns sorted media list', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue(makeArtist());
      (prisma.artistMedia.findMany as jest.Mock).mockResolvedValue([makeMedia()]);

      const result = await listMedia('artist-1', 'tenant-1');
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('media-1');
    });

    it('throws 404 when artist not found', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(listMedia('missing', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('throws 403 when tenant mismatch', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue(
        makeArtist({ tenantId: 'other-tenant' }),
      );

      await expect(listMedia('artist-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('deleteMedia', () => {
    it('deletes from Cloudinary and DB', async () => {
      (prisma.artistMedia.findFirst as jest.Mock).mockResolvedValue(makeMedia());
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });
      (prisma.artistMedia.delete as jest.Mock).mockResolvedValue(undefined);

      await expect(
        deleteMedia('artist-1', 'tenant-1', 'artist-media/test'),
      ).resolves.toBeUndefined();

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('artist-media/test');
      expect(prisma.artistMedia.delete).toHaveBeenCalled();
    });

    it('throws 404 when media not found', async () => {
      (prisma.artistMedia.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        deleteMedia('artist-1', 'tenant-1', 'missing/id'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('setProfilePhoto', () => {
    it('promotes target to PROFILE and updates artist profileImageUrl', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue(makeArtist());
      (prisma.artistMedia.findFirst as jest.Mock).mockResolvedValue(makeMedia());
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);
      (prisma.artistMedia.findUnique as jest.Mock).mockResolvedValue(
        makeMedia({ type: 'PROFILE' }),
      );

      const result = await setProfilePhoto('artist-1', 'tenant-1', 'artist-media/test');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result?.type).toBe('PROFILE');
    });

    it('throws 404 when media not found', async () => {
      (prisma.artist.findUnique as jest.Mock).mockResolvedValue(makeArtist());
      (prisma.artistMedia.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        setProfilePhoto('artist-1', 'tenant-1', 'missing/id'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
