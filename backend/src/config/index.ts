/**
 * Application configuration module.
 *
 * Loads environment variables via dotenv, validates every required variable,
 * and exports a strongly-typed `config` object.  The process exits with a
 * descriptive error message if any required variable is missing or invalid —
 * fail fast, fail loudly.
 */
import dotenv from 'dotenv';

dotenv.config(); // Side effect: populates process.env from .env (dev/CI only)

// ─── Config Shape ─────────────────────────────────────────────────────────────

export interface AppConfig {
  // Server
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: string;

  // Business identity
  STUDIO_NAME: string;
  STUDIO_ADMIN_EMAIL: string;
  BUSINESS_TYPE: string;
  GOOGLE_REVIEW_URL: string;

  // Database
  DATABASE_URL: string;

  // Redis
  REDIS_URL: string;

  // JWT
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // CORS — both frontend origins merged into a single allow-list
  ALLOWED_ORIGINS: string[];

  // Email (Resend)
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  RESEND_FROM_NAME: string;

  // File storage (Cloudinary)
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;

  // WhatsApp automation (Twilio)
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_WHATSAPP_FROM: string;

  // Google Calendar OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;

  // Microsoft Outlook OAuth (Phase 7.1)
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_CLIENT_SECRET: string;
  MICROSOFT_REDIRECT_URI: string;
  MICROSOFT_TENANT_ID: string;

  // OpenAI (Phase 8.2)
  OPENAI_API_KEY: string;

  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PUBLISHABLE_KEY: string;

  // Frontend URL
  FRONTEND_URL: string;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

function loadConfig(): AppConfig {
  const missing: string[] = [];

  /** Returns the env var value; adds key to `missing` if absent. */
  function required(key: string): string {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
      return '';
    }
    return value;
  }

  /** Returns the env var value or a safe default. */
  function optional(key: string, defaultValue: string): string {
    return process.env[key] ?? defaultValue;
  }

  // ── Validate NODE_ENV ────────────────────────────────────────────────────
  const nodeEnvRaw = optional('NODE_ENV', 'development');
  const validNodeEnvs = ['development', 'production', 'test'] as const;
  type NodeEnv = (typeof validNodeEnvs)[number];
  if (!validNodeEnvs.includes(nodeEnvRaw as NodeEnv)) {
    console.error(
      `[Config] NODE_ENV must be one of: ${validNodeEnvs.join(', ')} — got "${nodeEnvRaw}"`,
    );
    process.exit(1);
  }
  const nodeEnv = nodeEnvRaw as NodeEnv;

  // ── Validate PORT ────────────────────────────────────────────────────────
  const portRaw = optional('PORT', '3000');
  const port = parseInt(portRaw, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(
      `[Config] PORT must be a valid port number (1–65535) — got "${portRaw}"`,
    );
    process.exit(1);
  }

  // ── Build config — required vars are collected, missing checked below ────
  const jwtAccessSecret = required('JWT_ACCESS_SECRET');
  const jwtRefreshSecret = required('JWT_REFRESH_SECRET');

  const cfg: AppConfig = {
    PORT: port,
    NODE_ENV: nodeEnv,
    LOG_LEVEL: optional('LOG_LEVEL', 'info'),

    STUDIO_NAME: optional('STUDIO_NAME', 'Studio'),
    STUDIO_ADMIN_EMAIL: optional('STUDIO_ADMIN_EMAIL', ''),
    BUSINESS_TYPE: optional('BUSINESS_TYPE', 'tattoo_studio'),
    GOOGLE_REVIEW_URL: optional('GOOGLE_REVIEW_URL', ''),

    DATABASE_URL: required('DATABASE_URL'),

    REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),

    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_ACCESS_EXPIRES_IN: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
    JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

    ALLOWED_ORIGINS: [
      ...optional('FRONTEND_URL', 'http://localhost:5173').split(','),
      ...optional('CRM_URL', 'http://localhost:5174').split(','),
    ]
      .map((u) => u.trim())
      .filter(Boolean),

    RESEND_API_KEY: optional('RESEND_API_KEY', ''),
    RESEND_FROM_EMAIL: optional('RESEND_FROM_EMAIL', ''),
    RESEND_FROM_NAME: optional(
      'RESEND_FROM_NAME',
      optional('STUDIO_NAME', 'Studio'),
    ),

    CLOUDINARY_CLOUD_NAME: optional('CLOUDINARY_CLOUD_NAME', ''),
    CLOUDINARY_API_KEY: optional('CLOUDINARY_API_KEY', ''),
    CLOUDINARY_API_SECRET: optional('CLOUDINARY_API_SECRET', ''),

    TWILIO_ACCOUNT_SID: optional('TWILIO_ACCOUNT_SID', ''),
    TWILIO_AUTH_TOKEN: optional('TWILIO_AUTH_TOKEN', ''),
    TWILIO_WHATSAPP_FROM: optional('TWILIO_WHATSAPP_FROM', ''),

    GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID', ''),
    GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET', ''),
    GOOGLE_REDIRECT_URI: optional('GOOGLE_REDIRECT_URI', ''),

    MICROSOFT_CLIENT_ID: optional('MICROSOFT_CLIENT_ID', ''),
    MICROSOFT_CLIENT_SECRET: optional('MICROSOFT_CLIENT_SECRET', ''),
    MICROSOFT_REDIRECT_URI: optional('MICROSOFT_REDIRECT_URI', ''),
    MICROSOFT_TENANT_ID: optional('MICROSOFT_TENANT_ID', 'common'),

    OPENAI_API_KEY: optional('OPENAI_API_KEY', ''),

    STRIPE_SECRET_KEY: optional('STRIPE_SECRET_KEY', ''),
    STRIPE_WEBHOOK_SECRET: optional('STRIPE_WEBHOOK_SECRET', ''),
    STRIPE_PUBLISHABLE_KEY: optional('STRIPE_PUBLISHABLE_KEY', ''),

    FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:5173'),
  };

  // ── Fail fast if any required vars are missing ────────────────────────────
  if (missing.length > 0) {
    console.error(
      '[Config] Server cannot start. Missing required environment variables:\n' +
        missing.map((k) => `  - ${k}`).join('\n'),
    );
    process.exit(1);
  }

  // ── Enforce minimum JWT secret length (security requirement) ──────────────
  // Short secrets are vulnerable to brute-force attacks on HS256/HS512 tokens.
  // Use: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  const MIN_JWT_SECRET_LENGTH = 32;
  const jwtSecretErrors: string[] = [];
  if (jwtAccessSecret.length < MIN_JWT_SECRET_LENGTH) {
    jwtSecretErrors.push(
      `JWT_ACCESS_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters (currently ${jwtAccessSecret.length})`,
    );
  }
  if (jwtRefreshSecret.length < MIN_JWT_SECRET_LENGTH) {
    jwtSecretErrors.push(
      `JWT_REFRESH_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters (currently ${jwtRefreshSecret.length})`,
    );
  }
  if (jwtSecretErrors.length > 0) {
    console.error(
      '[Config] Insecure JWT configuration:\n' +
        jwtSecretErrors.map((e) => `  - ${e}`).join('\n') +
        '\n  Generate a strong secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
    );
    process.exit(1);
  }

  // ── Production credential validation ────────────────────────────────────────
  // In production, if a feature relies on a third-party service, the corresponding
  // credential must be present or the server exits immediately.
  if (nodeEnv === 'production') {
    const credErrors: string[] = [];

    // Stripe — required if any payment feature is used (always needed in production)
    if (!cfg.STRIPE_SECRET_KEY)     credErrors.push('STRIPE_SECRET_KEY is required in production');
    if (!cfg.STRIPE_WEBHOOK_SECRET) credErrors.push('STRIPE_WEBHOOK_SECRET is required in production');
    if (!cfg.STRIPE_PUBLISHABLE_KEY) credErrors.push('STRIPE_PUBLISHABLE_KEY is required in production');

    // Resend — required for email (password reset, bookings, etc.)
    if (!cfg.RESEND_API_KEY)     credErrors.push('RESEND_API_KEY is required in production');
    if (!cfg.RESEND_FROM_EMAIL)  credErrors.push('RESEND_FROM_EMAIL is required in production');

    if (credErrors.length > 0) {
      console.error(
        '[Config] Server cannot start. Missing required production credentials:\n' +
          credErrors.map((e) => `  - ${e}`).join('\n'),
      );
      process.exit(1);
    }
  }

  return cfg;
}

export const config = loadConfig();
