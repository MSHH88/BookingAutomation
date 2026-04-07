/**
 * Uploads controller — Step 1.14
 *
 * HTTP handler for the File Upload API.
 *
 * Expects `req.files` to be an array of Express.Multer.File objects,
 * populated by the `uploadImages` Multer middleware registered in the router.
 *
 * Returns:
 *   201 — array of UploadResult objects (url, publicId, width, height, format, bytes)
 *   400 — no files attached, invalid MIME type, or magic-byte mismatch
 *   502 — Cloudinary upstream error
 */
import { Request, Response, NextFunction } from 'express';

import { success }                 from '../../utils/apiResponse';
import { AppError }                from '../../errors/AppError';
import { uploadImages as uploadSvc } from './uploads.service';

/**
 * POST /api/uploads/images
 *
 * Uploads 1–10 images to Cloudinary.  Requires authentication.
 *
 * Multipart form field name: `images`
 * (Must match the field name configured in the Multer middleware in upload.ts.)
 */
export async function uploadImagesHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      throw new AppError(
        400,
        'NO_FILES_UPLOADED',
        'At least one image file is required. ' +
          'Send files in the "images" multipart field.',
      );
    }

    const results = await uploadSvc(files);

    res.status(201).json(
      success({
        files: results,
        count: results.length,
      }),
    );
  } catch (err) {
    next(err);
  }
}
