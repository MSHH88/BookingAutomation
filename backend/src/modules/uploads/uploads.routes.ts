/**
 * Uploads router — Step 1.14
 *
 * | Method | Path                    | Auth | Description                              |
 * |--------|-------------------------|------|------------------------------------------|
 * | POST   | /api/uploads/images     | Auth | Upload 1–10 images; returns CDN URLs     |
 *
 * Pipeline for POST /api/uploads/images:
 *  1. requireAuth   — validates the JWT; attaches req.user
 *  2. uploadImages  — Multer middleware: validates MIME type, enforces limits,
 *                     populates req.files with in-memory buffers
 *  3. controller    — magic-byte validation, Cloudinary upload, response
 *
 * Multer errors (LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, LIMIT_UNEXPECTED_FILE)
 * are forwarded to the global errorHandler (app.ts) which maps them to 400.
 *
 * No feature flag gate — file uploads are a core capability used by multiple
 * modules (lead inquiry reference images, artist portfolio uploads, etc.).
 * Individual features that trigger uploads are gated by their own flags.
 */
import { Router, Request, Response, NextFunction } from 'express';

import { requireAuth }        from '../../middleware/auth';
import { uploadImages }       from '../../middleware/upload';
import { uploadImagesHandler } from './uploads.controller';

const router = Router();

/**
 * POST /api/uploads/images
 *
 * Upload 1–10 images (JPEG / PNG / WebP, max 10 MB each).
 * Returns an array of UploadResult objects with Cloudinary CDN URLs.
 *
 * Request: multipart/form-data with field name "images"
 * Response: { success: true, data: { files: [...], count: N } }
 */
router.post(
  '/images',
  requireAuth,
  // Multer is a callback-style middleware — wrap it so errors reach next(err)
  (req: Request, res: Response, next: NextFunction) => {
    uploadImages(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  uploadImagesHandler,
);

export { router as uploadRoutes };
