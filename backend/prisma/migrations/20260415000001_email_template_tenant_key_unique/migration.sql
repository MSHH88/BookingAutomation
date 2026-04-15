-- BUG-12: Enable per-tenant email template overrides.
-- Replace the unique constraint on `key` alone with a composite
-- unique on (tenantId, key) so that a tenant-specific row can
-- coexist with the global (tenantId IS NULL) default row.
-- Mirrors the existing pattern on SmsTemplate, WhatsAppTemplate,
-- and FeatureFlag.

-- Drop the old unique index on key alone
DROP INDEX IF EXISTS "email_templates_key_key";
ALTER TABLE "email_templates" DROP CONSTRAINT IF EXISTS "email_templates_key_key";

-- Add composite unique index on (tenantId, key)
CREATE UNIQUE INDEX "email_templates_tenantId_key_key" ON "email_templates"("tenantId", "key");
