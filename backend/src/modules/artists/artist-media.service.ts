/**
 * Artist Media service — Phase 6.4
 *
 * Business logic for artist profile + portfolio image management.
 */
import type { ArtistMediaType } from '@prisma/client';

import { cloudinary }  from '../../lib/cloudinary';
import { prisma }      from '../../lib/prisma';
import { AppError }    from '../../errors/AppError';
import { logger }      from '../../utils/logger';

// ─── Media select shape ───────────────────────────────────────────────────────

const mediaSelect = {
  id:                 true,
  artistId:           true,
  tenantId:           true,
  url:                true,
  cloudinaryPublicId: true,
  type:               true,
  sortOrder:          true,
  uploadedAt:         true,
} as const;

// ─── listMedia ────────────────────────────────────────────────────────────────

export async function listMedia(artistId: string, tenantId: string | null) {
  await assertArtistOwnership(artistId, tenantId);

  return prisma.artistMedia.findMany({
    where:   { artistId },
    select:  mediaSelect,
    orderBy: [{ sortOrder: 'asc' }, { uploadedAt: 'asc' }],
  });
}

// ─── uploadMedia ──────────────────────────────────────────────────────────────

export async function uploadMedia(
  artistId: string,
  tenantId: string | null,
  file:     Express.Multer.File,
  type:     ArtistMediaType = 'PORTFOLIO',
) {
  await assertArtistOwnership(artistId, tenantId);

  // Upload to Cloudinary
  const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'artist-media', resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('No result from Cloudinary'));
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        },
      );
      stream.end(file.buffer);
    },
  );

  const media = await prisma.artistMedia.create({
    data: {
      artistId,
      tenantId,
      url:                uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      type,
      sortOrder:          0,
    },
    select: mediaSelect,
  });

  logger.info('Artist media uploaded', { artistId, mediaId: media.id, type });
  return media;
}

// ─── deleteMedia ──────────────────────────────────────────────────────────────

export async function deleteMedia(
  artistId:           string,
  tenantId:           string | null,
  cloudinaryPublicId: string,
) {
  const media = await prisma.artistMedia.findFirst({
    where:  { artistId, cloudinaryPublicId },
    select: { id: true, tenantId: true },
  });

  if (!media || media.tenantId !== tenantId) {
    throw new AppError(404, 'NOT_FOUND', 'Media not found');
  }

  // Remove from Cloudinary
  try {
    await cloudinary.uploader.destroy(cloudinaryPublicId);
  } catch (err) {
    logger.warn('Failed to delete from Cloudinary', { err, cloudinaryPublicId });
  }

  await prisma.artistMedia.delete({ where: { id: media.id } });
  logger.info('Artist media deleted', { artistId, cloudinaryPublicId });
}

// ─── setProfilePhoto ──────────────────────────────────────────────────────────

export async function setProfilePhoto(
  artistId:           string,
  tenantId:           string | null,
  cloudinaryPublicId: string,
) {
  await assertArtistOwnership(artistId, tenantId);

  const target = await prisma.artistMedia.findFirst({
    where:  { artistId, cloudinaryPublicId },
    select: { id: true, url: true, tenantId: true },
  });

  if (!target || target.tenantId !== tenantId) {
    throw new AppError(404, 'NOT_FOUND', 'Media not found');
  }

  // Atomically: set target to PROFILE, all others for this artist to PORTFOLIO
  await prisma.$transaction([
    prisma.artistMedia.updateMany({
      where: { artistId, type: 'PROFILE' },
      data:  { type: 'PORTFOLIO' },
    }),
    prisma.artistMedia.update({
      where: { id: target.id },
      data:  { type: 'PROFILE' },
    }),
    prisma.artist.update({
      where: { id: artistId },
      data:  { profileImageUrl: target.url },
    }),
  ]);

  return prisma.artistMedia.findUnique({ where: { id: target.id }, select: mediaSelect });
}

// ─── assertArtistOwnership ────────────────────────────────────────────────────

async function assertArtistOwnership(artistId: string, tenantId: string | null) {
  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { id: true, tenantId: true },
  });

  if (!artist) {
    throw new AppError(404, 'NOT_FOUND', 'Artist not found');
  }

  if (artist.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Artist does not belong to this tenant');
  }
}
