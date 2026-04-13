/**
 * Artist Media controller — Phase 6.4
 */
import { Request, Response, NextFunction } from 'express';
import type { ArtistMediaType } from '@prisma/client';
import multer from 'multer';

import * as mediaService from './artist-media.service';
import { success } from '../../utils/apiResponse';
import { AppError } from '../../errors/AppError';

// ─── Multer single-file middleware for artist media uploads ───────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

/**
 * GET /api/artists/:id/media
 * ADMIN: Returns all media for the artist.
 */
export async function listMedia(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const { id }   = req.params as { id: string };
    const media    = await mediaService.listMedia(id, tenantId);
    res.json(success(media));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/artists/:id/media
 * ADMIN: Uploads a new image (multipart/form-data).
 * Form field: `image` (single file)
 * Optional body field: `type` = 'PROFILE' | 'PORTFOLIO'
 */
export const uploadMedia = [
  // Apply multer middleware inline (single file, field name 'image')
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('image')(req, res, (err: unknown) => {
      if (err) return next(new AppError(400, 'UPLOAD_ERROR', (err as Error).message));
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user!.tenantId!;
      const { id }   = req.params as { id: string };

      const file = req.file;
      if (!file) {
        throw new AppError(400, 'MISSING_FILE', 'An image file is required');
      }

      const rawType = (req.body as { type?: string }).type;
      const type: ArtistMediaType =
        rawType === 'PROFILE' ? 'PROFILE' : 'PORTFOLIO';

      const media = await mediaService.uploadMedia(id, tenantId, file, type);
      res.status(201).json(success(media));
    } catch (err) {
      next(err);
    }
  },
];

/**
 * DELETE /api/artists/:id/media/:publicId
 * ADMIN: Removes a media item from Cloudinary and the DB.
 */
export async function deleteMedia(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId  = req.user!.tenantId!;
    const { id, publicId } = req.params as { id: string; publicId: string };
    await mediaService.deleteMedia(id, tenantId, publicId);
    res.json(success({ deleted: true }));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/artists/:id/profile-photo
 * ADMIN: Promotes an existing media item to be the artist's profile photo.
 * Body: { cloudinaryPublicId: string }
 */
export async function setProfilePhoto(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const { id }   = req.params as { id: string };
    const { cloudinaryPublicId } = req.body as { cloudinaryPublicId: string };

    if (!cloudinaryPublicId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'cloudinaryPublicId is required');
    }

    const media = await mediaService.setProfilePhoto(id, tenantId, cloudinaryPublicId);
    res.json(success(media));
  } catch (err) {
    next(err);
  }
}
