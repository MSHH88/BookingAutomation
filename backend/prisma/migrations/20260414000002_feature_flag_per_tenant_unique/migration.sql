-- FINDING-011: Enable per-tenant feature flag overrides.
-- Replace the unique constraint on `key` alone with a composite
-- unique on (key, tenantId) so that a tenant-specific row can
-- coexist with the global (tenantId IS NULL) default row.

-- Drop the old unique index on key alone
DROP INDEX IF EXISTS "feature_flags_key_key";
ALTER TABLE "feature_flags" DROP CONSTRAINT IF EXISTS "feature_flags_key_key";

-- Add composite unique index on (key, tenantId)
CREATE UNIQUE INDEX "feature_flags_key_tenantId_key" ON "feature_flags"("key", "tenantId");
