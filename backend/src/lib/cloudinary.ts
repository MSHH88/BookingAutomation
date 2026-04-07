/**
 * Cloudinary singleton — Step 1.14
 *
 * Configures and exports a single Cloudinary v2 instance that is shared
 * across the entire application.  Centralising configuration here means:
 *
 *  1. The credentials are loaded from `config` once at startup (fail-fast).
 *  2. Tests mock only this module — no need to intercept the cloudinary package
 *     directly.
 *  3. Future credential rotation only needs to happen in one place.
 *
 * Usage:
 *   import { cloudinary } from '../../lib/cloudinary';
 *   const result = await cloudinary.uploader.upload(dataUri, { folder: 'uploads' });
 */
import { v2 as cloudinary } from 'cloudinary';

import { config } from '../config';

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key:    config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure:     true, // Always use HTTPS CDN URLs
});

export { cloudinary };
