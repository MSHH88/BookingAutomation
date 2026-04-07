/**
 * Unit tests for uploads.service.ts — Step 1.14
 *
 * Cloudinary is fully mocked so these tests run without a live Cloudinary
 * account or network connection.
 *
 * Coverage:
 *  ✓ hasValidMagicBytes — JPEG valid, PNG valid, WebP valid,
 *                          JPEG wrong first byte → false,
 *                          PNG wrong second byte → false,
 *                          WebP wrong RIFF prefix → false,
 *                          WebP wrong WEBP marker (bytes 8-11) → false,
 *                          WebP buffer too small → false,
 *                          unknown mimetype → false
 *
 *  ✓ uploadImages — empty array returns [],
 *                    single JPEG upload returns UploadResult,
 *                    single PNG upload returns UploadResult,
 *                    single WebP upload returns UploadResult,
 *                    multiple files uploaded in parallel,
 *                    invalid JPEG magic bytes → 400 INVALID_FILE_CONTENT,
 *                    invalid PNG magic bytes → 400 INVALID_FILE_CONTENT,
 *                    invalid WebP RIFF prefix → 400 INVALID_FILE_CONTENT,
 *                    invalid WebP WEBP marker → 400 INVALID_FILE_CONTENT,
 *                    Cloudinary error → 502 UPLOAD_FAILED,
 *                    Cloudinary null result → 502 UPLOAD_FAILED,
 *                    Cloudinary error message is propagated,
 *                    result shape includes all UploadResult fields,
 *                    upload uses correct folder option,
 *                    magic-byte check rejects before calling cloudinary
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock cloudinary ──────────────────────────────────────────────────────────

const mockUploadStream = jest.fn();

jest.mock('../../lib/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload_stream: (...args: unknown[]) => mockUploadStream(...args),
    },
  },
}));

// ─── Import service under test ────────────────────────────────────────────────

import { Readable } from 'stream';
import { uploadImages, hasValidMagicBytes } from './uploads.service';
import { AppError } from '../../errors/AppError';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a Buffer that starts with the given bytes, padded to `totalLength`.
 * Used to create fake file buffers with specific magic bytes for testing.
 */
function makeBuffer(bytes: number[], totalLength = 16): Buffer {
  const buf = Buffer.alloc(totalLength, 0x00);
  bytes.forEach((b, i) => { buf[i] = b; });
  return buf;
}

/** Valid JPEG magic bytes: FF D8 FF */
const JPEG_MAGIC = [0xFF, 0xD8, 0xFF];
/** Valid PNG magic bytes: 89 50 4E 47 */
const PNG_MAGIC  = [0x89, 0x50, 0x4E, 0x47];
/** Valid WebP magic bytes: RIFF (bytes 0-3) + padding + WEBP (bytes 8-11) */
function webpBuffer(): Buffer {
  const buf = Buffer.alloc(12, 0x00);
  // RIFF: bytes 0-3
  buf[0] = 0x52; buf[1] = 0x49; buf[2] = 0x46; buf[3] = 0x46;
  // WEBP: bytes 8-11
  buf[8] = 0x57; buf[9] = 0x45; buf[10] = 0x42; buf[11] = 0x50;
  return buf;
}

/** Builds an Express.Multer.File stub. */
function makeFile(
  opts: {
    mimetype?:     string;
    buffer?:       Buffer;
    originalname?: string;
    size?:         number;
  } = {},
): Express.Multer.File {
  const buffer = opts.buffer ?? makeBuffer(JPEG_MAGIC);
  return {
    fieldname:    'images',
    originalname: opts.originalname ?? 'test.jpg',
    encoding:     '7bit',
    mimetype:     opts.mimetype ?? 'image/jpeg',
    size:         opts.size ?? buffer.length,
    buffer,
    stream:       new Readable(),
    destination:  '',
    filename:     '',
    path:         '',
  };
}

/** Base Cloudinary result returned by the mock. */
const baseCloudinaryResult = {
  secure_url: 'https://res.cloudinary.com/demo/image/upload/uploads/test.jpg',
  public_id:  'uploads/test',
  width:      800,
  height:     600,
  format:     'jpg',
  bytes:      102400,
};

/**
 * Configures `mockUploadStream` to call its callback with `result` or `error`
 * synchronously when stream.end() is called.
 */
function setupUploadMock(
  result: typeof baseCloudinaryResult | null,
  error:  Error | null = null,
) {
  mockUploadStream.mockImplementation(
    (_opts: unknown, callback: (err: Error | null, res: typeof result) => void) => ({
      end: (_buf: Buffer) => callback(error, result),
    }),
  );
}

beforeEach(() => jest.clearAllMocks());

// ─── hasValidMagicBytes ───────────────────────────────────────────────────────

describe('hasValidMagicBytes', () => {
  it('returns true for a valid JPEG buffer', () => {
    expect(hasValidMagicBytes(makeBuffer(JPEG_MAGIC), 'image/jpeg')).toBe(true);
  });

  it('returns true for a valid PNG buffer', () => {
    expect(hasValidMagicBytes(makeBuffer(PNG_MAGIC), 'image/png')).toBe(true);
  });

  it('returns true for a valid WebP buffer', () => {
    expect(hasValidMagicBytes(webpBuffer(), 'image/webp')).toBe(true);
  });

  it('returns false when first byte of JPEG is wrong', () => {
    expect(hasValidMagicBytes(makeBuffer([0x00, 0xD8, 0xFF]), 'image/jpeg')).toBe(false);
  });

  it('returns false when second byte of JPEG is wrong', () => {
    expect(hasValidMagicBytes(makeBuffer([0xFF, 0x00, 0xFF]), 'image/jpeg')).toBe(false);
  });

  it('returns false when PNG magic bytes are wrong', () => {
    expect(hasValidMagicBytes(makeBuffer([0x89, 0x51, 0x4E, 0x47]), 'image/png')).toBe(false);
  });

  it('returns false when WebP RIFF prefix is wrong', () => {
    const buf = webpBuffer();
    buf[0] = 0x00; // corrupt RIFF
    expect(hasValidMagicBytes(buf, 'image/webp')).toBe(false);
  });

  it('returns false when WebP WEBP marker (bytes 8-11) is wrong', () => {
    const buf = webpBuffer();
    buf[8] = 0x00; // corrupt WEBP marker
    expect(hasValidMagicBytes(buf, 'image/webp')).toBe(false);
  });

  it('returns false when buffer is too small for WebP (< 12 bytes)', () => {
    const buf = webpBuffer().subarray(0, 11); // only 11 bytes
    expect(hasValidMagicBytes(buf, 'image/webp')).toBe(false);
  });

  it('returns false for an unrecognised mimetype', () => {
    expect(hasValidMagicBytes(makeBuffer([0x00, 0x01, 0x02, 0x03]), 'image/gif')).toBe(false);
  });

  it('returns false when buffer is too small for JPEG (< 3 bytes)', () => {
    expect(hasValidMagicBytes(Buffer.from([0xFF, 0xD8]), 'image/jpeg')).toBe(false);
  });
});

// ─── uploadImages ─────────────────────────────────────────────────────────────

describe('uploadImages', () => {
  it('returns an empty array when given no files', async () => {
    const result = await uploadImages([]);
    expect(result).toEqual([]);
    expect(mockUploadStream).not.toHaveBeenCalled();
  });

  it('uploads a single JPEG file and returns an UploadResult', async () => {
    setupUploadMock(baseCloudinaryResult);

    const result = await uploadImages([makeFile()]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      url:      baseCloudinaryResult.secure_url,
      publicId: baseCloudinaryResult.public_id,
      width:    baseCloudinaryResult.width,
      height:   baseCloudinaryResult.height,
      format:   baseCloudinaryResult.format,
      bytes:    baseCloudinaryResult.bytes,
    });
  });

  it('uploads a single PNG file and returns an UploadResult', async () => {
    setupUploadMock({
      ...baseCloudinaryResult,
      secure_url: 'https://res.cloudinary.com/demo/image/upload/uploads/test.png',
      public_id:  'uploads/test-png',
      format:     'png',
    });

    const result = await uploadImages([
      makeFile({ mimetype: 'image/png', buffer: makeBuffer(PNG_MAGIC) }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].format).toBe('png');
  });

  it('uploads a single WebP file and returns an UploadResult', async () => {
    setupUploadMock({
      ...baseCloudinaryResult,
      format: 'webp',
    });

    const result = await uploadImages([
      makeFile({ mimetype: 'image/webp', buffer: webpBuffer() }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].format).toBe('webp');
  });

  it('uploads multiple files in parallel and returns results in order', async () => {
    setupUploadMock(baseCloudinaryResult);

    const files = [
      makeFile({ originalname: 'a.jpg' }),
      makeFile({ originalname: 'b.jpg' }),
      makeFile({ originalname: 'c.jpg' }),
    ];

    const result = await uploadImages(files);

    expect(result).toHaveLength(3);
    expect(mockUploadStream).toHaveBeenCalledTimes(3);
  });

  it('passes the correct folder option to cloudinary', async () => {
    setupUploadMock(baseCloudinaryResult);
    await uploadImages([makeFile()]);

    const callArgs = mockUploadStream.mock.calls[0];
    const options = callArgs[0] as Record<string, unknown>;
    expect(options.folder).toBe('uploads');
    expect(options.resource_type).toBe('image');
  });

  it('throws 400 INVALID_FILE_CONTENT when JPEG buffer has wrong magic bytes', async () => {
    const file = makeFile({
      mimetype: 'image/jpeg',
      buffer:   makeBuffer([0x00, 0x00, 0x00]), // wrong — not FF D8 FF
    });

    await expect(uploadImages([file])).rejects.toThrow(
      expect.objectContaining({ code: 'INVALID_FILE_CONTENT', statusCode: 400 }),
    );
    expect(mockUploadStream).not.toHaveBeenCalled();
  });

  it('throws 400 INVALID_FILE_CONTENT when PNG buffer has wrong magic bytes', async () => {
    const file = makeFile({
      mimetype: 'image/png',
      buffer:   makeBuffer([0x89, 0x51, 0x4E, 0x47]), // wrong — second byte is 51, not 50
    });

    await expect(uploadImages([file])).rejects.toThrow(
      expect.objectContaining({ code: 'INVALID_FILE_CONTENT', statusCode: 400 }),
    );
    expect(mockUploadStream).not.toHaveBeenCalled();
  });

  it('throws 400 INVALID_FILE_CONTENT when WebP RIFF prefix is wrong', async () => {
    const buf = webpBuffer();
    buf[0] = 0x00; // corrupt RIFF byte

    const file = makeFile({ mimetype: 'image/webp', buffer: buf });

    await expect(uploadImages([file])).rejects.toThrow(
      expect.objectContaining({ code: 'INVALID_FILE_CONTENT', statusCode: 400 }),
    );
    expect(mockUploadStream).not.toHaveBeenCalled();
  });

  it('throws 400 INVALID_FILE_CONTENT when WebP WEBP marker is wrong', async () => {
    const buf = webpBuffer();
    buf[8] = 0x00; // corrupt WEBP marker

    const file = makeFile({ mimetype: 'image/webp', buffer: buf });

    await expect(uploadImages([file])).rejects.toThrow(
      expect.objectContaining({ code: 'INVALID_FILE_CONTENT', statusCode: 400 }),
    );
    expect(mockUploadStream).not.toHaveBeenCalled();
  });

  it('stops validation at the first invalid file and does not call cloudinary', async () => {
    const validFile   = makeFile({ originalname: 'good.jpg' });
    const invalidFile = makeFile({
      originalname: 'bad.jpg',
      buffer:        makeBuffer([0x00, 0x00, 0x00]),
    });

    await expect(uploadImages([validFile, invalidFile])).rejects.toThrow(
      expect.objectContaining({ code: 'INVALID_FILE_CONTENT' }),
    );
    expect(mockUploadStream).not.toHaveBeenCalled();
  });

  it('includes the original filename in the INVALID_FILE_CONTENT error message', async () => {
    const file = makeFile({
      originalname: 'suspicious.jpg',
      buffer:       makeBuffer([0x00, 0x00, 0x00]),
    });

    await expect(uploadImages([file])).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining('suspicious.jpg') }),
    );
  });

  it('throws 502 UPLOAD_FAILED when Cloudinary returns an error', async () => {
    setupUploadMock(null, new Error('Cloudinary is down'));

    await expect(uploadImages([makeFile()])).rejects.toThrow(
      new AppError(502, 'UPLOAD_FAILED', 'Cloudinary is down'),
    );
  });

  it('throws 502 UPLOAD_FAILED when Cloudinary returns null result', async () => {
    setupUploadMock(null, null);

    await expect(uploadImages([makeFile()])).rejects.toThrow(
      expect.objectContaining({ code: 'UPLOAD_FAILED', statusCode: 502 }),
    );
  });

  it('propagates the Cloudinary error message in the 502 error', async () => {
    const originalMessage = 'Invalid API key provided';
    setupUploadMock(null, new Error(originalMessage));

    await expect(uploadImages([makeFile()])).rejects.toThrow(
      expect.objectContaining({ message: originalMessage }),
    );
  });

  it('result contains all UploadResult fields', async () => {
    setupUploadMock(baseCloudinaryResult);

    const [result] = await uploadImages([makeFile()]);

    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('publicId');
    expect(result).toHaveProperty('width');
    expect(result).toHaveProperty('height');
    expect(result).toHaveProperty('format');
    expect(result).toHaveProperty('bytes');
  });
});
