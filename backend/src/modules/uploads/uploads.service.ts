/**
 * Uploads service — Step 1.14
 *
 * Business logic for the File Upload API.
 *
 * Responsibilities:
 *  1. Validate each file's magic bytes (first N bytes of the buffer) to confirm
 *     the content matches the declared MIME type.  This is the server-side
 *     defence against mis-labelled files (e.g. an executable renamed to .jpg).
 *
 *  2. Upload all validated files to Cloudinary in parallel using upload_stream
 *     (avoids base64 encoding overhead; streams directly from the Buffer).
 *
 *  3. Return a typed UploadResult for each uploaded file.
 *
 * Magic-byte signatures:
 *  JPEG  — [FF D8 FF]           (3 bytes)
 *  PNG   — [89 50 4E 47]        (4 bytes: \x89PNG)
 *  WebP  — bytes 0-3  = RIFF    (52 49 46 46)
 *          bytes 8-11 = WEBP    (57 45 42 50)  ← RIFF sub-type marker
 *
 * Security rationale:
 *  Multer's fileFilter (upload.ts) rejects unknown MIME types at the HTTP layer.
 *  Magic-byte validation here is a second, independent layer of defence that
 *  catches attackers who supply a correct MIME type header but upload different
 *  content.  Both guards must pass before a file is sent to Cloudinary.
 *
 * Error codes:
 *  400 INVALID_FILE_CONTENT — magic bytes do not match the declared MIME type
 *  502 UPLOAD_FAILED        — Cloudinary returned an error or no result
 */
import { cloudinary } from '../../lib/cloudinary';
import { AppError }   from '../../errors/AppError';
import { logger }     from '../../utils/logger';

// ─── Result type ──────────────────────────────────────────────────────────────

/**
 * Shape returned for each successfully uploaded image.
 * The `url` is the Cloudinary secure CDN URL (https://).
 */
export interface UploadResult {
  /** HTTPS Cloudinary CDN URL — use this as the image src. */
  url:      string;
  /** Cloudinary public ID — required to delete or transform the image later. */
  publicId: string;
  /** Image width in pixels as reported by Cloudinary. */
  width:    number;
  /** Image height in pixels as reported by Cloudinary. */
  height:   number;
  /** Normalised format string reported by Cloudinary (e.g. "jpg", "png", "webp"). */
  format:   string;
  /** File size in bytes stored on Cloudinary (after any optimisation). */
  bytes:    number;
}

// ─── Magic-byte validation ────────────────────────────────────────────────────

/**
 * Checks whether the first bytes of `buffer` match the expected magic bytes for
 * the given `mimetype`.
 *
 * Returns `false` when:
 *  - the buffer is too small to contain the signature
 *  - the bytes do not match
 *  - the mimetype is unrecognised
 */
export function hasValidMagicBytes(buffer: Buffer, mimetype: string): boolean {
  switch (mimetype) {
    case 'image/jpeg':
      // JPEG: FF D8 FF
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xFF &&
        buffer[1] === 0xD8 &&
        buffer[2] === 0xFF
      );

    case 'image/png':
      // PNG: 89 50 4E 47 (= \x89PNG)
      return (
        buffer.length >= 4 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 && // P
        buffer[2] === 0x4E && // N
        buffer[3] === 0x47    // G
      );

    case 'image/webp':
      // WebP: RIFF container — bytes 0-3 = "RIFF", bytes 8-11 = "WEBP"
      return (
        buffer.length >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50  // WEBP
      );

    default:
      return false;
  }
}

// ─── Cloudinary upload ────────────────────────────────────────────────────────

/**
 * Uploads a single in-memory file to Cloudinary using upload_stream.
 *
 * Wraps the callback-based upload_stream API in a Promise.
 * Throws 502 UPLOAD_FAILED if Cloudinary returns an error or null result.
 */
function uploadToCloudinary(file: Express.Multer.File): Promise<UploadResult> {
  return new Promise<UploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        'uploads',
        resource_type: 'image',
        // Cloudinary auto-optimises quality and converts to the best format for
        // the requesting browser when the image is served via the CDN.
        transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error || !result) {
          reject(
            new AppError(
              502,
              'UPLOAD_FAILED',
              error?.message ?? 'Cloudinary upload returned no result',
            ),
          );
          return;
        }
        resolve({
          url:      result.secure_url,
          publicId: result.public_id,
          width:    result.width,
          height:   result.height,
          format:   result.format,
          bytes:    result.bytes,
        });
      },
    );

    stream.end(file.buffer);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates and uploads an array of in-memory files to Cloudinary.
 *
 * Steps:
 *  1. Validate magic bytes for every file — throws 400 on first failure.
 *  2. Upload all valid files to Cloudinary in parallel (Promise.all).
 *  3. Return an array of UploadResult in the same order as the input.
 *
 * An empty `files` array is valid and returns `[]`.
 */
export async function uploadImages(
  files: Express.Multer.File[],
): Promise<UploadResult[]> {
  if (files.length === 0) {
    return [];
  }

  // ── Step 1: Magic-byte validation (synchronous, fast) ─────────────────────
  for (const file of files) {
    if (!hasValidMagicBytes(file.buffer, file.mimetype)) {
      throw new AppError(
        400,
        'INVALID_FILE_CONTENT',
        `File "${file.originalname}" content does not match its declared ` +
          `MIME type "${file.mimetype}". Only genuine JPEG, PNG, and WebP ` +
          'images are accepted.',
      );
    }
  }

  // ── Step 2: Parallel Cloudinary upload ────────────────────────────────────
  logger.info('Uploading images to Cloudinary', { count: files.length });

  const results = await Promise.all(files.map(uploadToCloudinary));

  logger.info('Image upload complete', { count: results.length });

  return results;
}
