/**
 * Jest global test environment setup — Step 1.22
 *
 * Loaded via "setupFiles" in jest config so this runs BEFORE each test module
 * is imported.  All required environment variables are set here so that
 * config/index.ts (which reads them at module-load time) never calls
 * process.exit(1) during tests.
 *
 * External-service credentials are intentionally set to placeholder values:
 * every test file mocks the relevant lib modules (prisma, resend, cloudinary,
 * whatsapp, BullMQ queues) so no real network calls are ever made.
 *
 * DATABASE_URL points to a local "_test" database name.  The integration test
 * suite mocks Prisma, so no real connection is opened and this value is only
 * used to satisfy the config validator.
 */

// ── Server ────────────────────────────────────────────────────────────────────
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3001'; // test port (app won't actually listen — supertest binds its own)

// ── Business identity ─────────────────────────────────────────────────────────
process.env['BUSINESS_TYPE'] = 'tattoo_studio'; // all features ON by default
process.env['STUDIO_NAME'] = 'Test Studio';
process.env['STUDIO_ADMIN_EMAIL'] = 'admin@teststudio.com';
process.env['GOOGLE_REVIEW_URL'] = 'https://g.page/test';

// ── Database ──────────────────────────────────────────────────────────────────
// Mocked by every integration test — value only satisfies config validation.
process.env['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/automation_test';

// ── Redis ─────────────────────────────────────────────────────────────────────
// BullMQ queues are fully mocked — this value is never used during tests.
process.env['REDIS_URL'] = 'redis://localhost:6379';

// ── JWT ───────────────────────────────────────────────────────────────────────
// Real secrets used so that makeToken() produces JWTs that actually verify.
process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-must-be-at-least-32-chars!aa';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-must-be-at-least-32-chars!b';
process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';

// ── CORS ──────────────────────────────────────────────────────────────────────
process.env['FRONTEND_URL'] = 'http://localhost:5173';
process.env['CRM_URL'] = 'http://localhost:5174';

// ── Email (Resend) ────────────────────────────────────────────────────────────
// Resend SDK is mocked — placeholder satisfies the optional() check.
process.env['RESEND_API_KEY'] = 're_test_placeholder_key_000000000000';
process.env['RESEND_FROM_EMAIL'] = 'noreply@teststudio.com';
process.env['RESEND_FROM_NAME'] = 'Test Studio';

// ── File storage (Cloudinary) ─────────────────────────────────────────────────
// Cloudinary SDK is mocked in upload tests — these satisfy config validation.
process.env['CLOUDINARY_CLOUD_NAME'] = 'test_cloud';
process.env['CLOUDINARY_API_KEY'] = 'test_cloudinary_key';
process.env['CLOUDINARY_API_SECRET'] = 'test_cloudinary_secret';

// ── WhatsApp / Twilio ─────────────────────────────────────────────────────────
// whatsapp.service is mocked — placeholders satisfy optional() checks.
process.env['TWILIO_ACCOUNT_SID'] = 'ACtest00000000000000000000000000000';
process.env['TWILIO_AUTH_TOKEN'] = 'test_twilio_auth_token_placeholder_';
process.env['TWILIO_WHATSAPP_FROM'] = 'whatsapp:+15550000000';

// ── Google Calendar ───────────────────────────────────────────────────────────
process.env['GOOGLE_CLIENT_ID'] = 'test-google-client-id.apps.googleusercontent.com';
process.env['GOOGLE_CLIENT_SECRET'] = 'test-google-client-secret';
process.env['GOOGLE_REDIRECT_URI'] = 'http://localhost:3000/api/auth/google/callback';

// ── Stripe ────────────────────────────────────────────────────────────────────
process.env['STRIPE_SECRET_KEY'] = 'sk_test_placeholder_0000000000000000';
process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_test_placeholder_0000000000';
process.env['STRIPE_PUBLISHABLE_KEY'] = 'pk_test_placeholder_00000000000000';

// ── Feature flags (overrideable per test) ────────────────────────────────────
// EMAIL_REMINDERS_ENABLED and REVIEW_REQUEST_ENABLED affect BullMQ behaviour
// (the queues themselves are mocked, so these only affect log messages).
process.env['EMAIL_REMINDERS_ENABLED'] = 'true';
process.env['REVIEW_REQUEST_ENABLED'] = 'true';
process.env['WHATSAPP_CONTACT_ENABLED'] = 'true';
process.env['ANALYTICS_ENABLED'] = 'true';
process.env['LEAD_CAPTURE_ENABLED'] = 'true';
