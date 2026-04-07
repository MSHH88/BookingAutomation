/**
 * Multer upload middleware — Step 1.14
 *
 * Configures a Multer instance for handling multipart/form-data image uploads.
 *
 * Design decisions:
 *
 *  • Memory storage — files are held in memory as a Buffer and passed directly
 *    to Cloudinary's upload_stream.  This avoids the need for temporary disk
 *    files, simplifies cleanup, and keeps the server stateless.
 *
 *  • fileFilter — rejects files whose declared MIME type is not in the
 *    whitelist at the HTTP layer before the buffer is fully read.
 *    A deeper magic-byte check is performed in uploads.service.ts AFTER the
 *    upload to defend against mis-labelled files (e.g. a .exe renamed to .jpg).
 *
 *  • limits.fileSize — enforced per-file by Multer; throws LIMIT_FILE_SIZE.
 *
 *  • limits.files — enforced per-request by Multer; throws LIMIT_FILE_COUNT.
 *
 * Exported constants:
 *  ALLOWED_MIMETYPES  — used by both the middleware and uploads.service.ts
 *  MAX_FILE_SIZE_BYTES — used in error messages
 *  MAX_FILES          — used in error messages
 *
 * Usage in routes:
 *   router.post('/images', requireAuth, uploadImages, ctrl.uploadImages);
 */
import multer from 'multer';

import { AppError } from '../errors/AppError';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Allowed image MIME types — checked by fileFilter + magic-byte validation. */
export const ALLOWED_MIMETYPES: ReadonlyArray<string> = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

/** Maximum bytes per individual file (10 MB). */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum number of images per request. */
export const MAX_FILES = 10;

// ─── Multer instance ──────────────────────────────────────────────────────────

/**
 * Pre-configured Multer middleware that stores files in memory.
 *
 * Attach to a route with `uploadImages` as a named export:
 *   router.post('/images', requireAuth, uploadImages, handler);
 *
 * After this middleware, `req.files` is an array of Express.Multer.File.
 */
export const uploadImages = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // 10 MB per file
    files:    MAX_FILES,            // 10 files per request
  },

  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(
      new AppError(
        400,
        'INVALID_FILE_TYPE',
        `Unsupported file type "${file.mimetype}". ` +
          `Allowed types: ${ALLOWED_MIMETYPES.join(', ')}.`,
      ),
    );
  },
}).array('images', MAX_FILES);
