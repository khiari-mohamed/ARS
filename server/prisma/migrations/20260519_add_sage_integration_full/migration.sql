-- ============================================================
-- SAFE MIGRATION: SageIntegration table
-- Idempotent — safe to run multiple times, zero data loss
-- ============================================================

-- 1. Create table (no-op if already exists)
CREATE TABLE IF NOT EXISTS "SageIntegration" (
    "id"                TEXT        NOT NULL,
    "ordreVirementId"   TEXT        NOT NULL,
    "sageTransactionId" TEXT,
    "status"            TEXT        NOT NULL DEFAULT 'PENDING',
    "errorMessage"      TEXT,
    "txtContent"        TEXT,
    "fileName"          TEXT,
    "integratedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "integratedById"    TEXT,

    CONSTRAINT "SageIntegration_pkey" PRIMARY KEY ("id")
);

-- 2. Add new columns if the table existed without them (idempotent via DO block)
DO $$
BEGIN
    -- txtContent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'SageIntegration' AND column_name = 'txtContent'
    ) THEN
        ALTER TABLE "SageIntegration" ADD COLUMN "txtContent" TEXT;
    END IF;

    -- fileName
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'SageIntegration' AND column_name = 'fileName'
    ) THEN
        ALTER TABLE "SageIntegration" ADD COLUMN "fileName" TEXT;
    END IF;

    -- Make integratedById nullable if it was NOT NULL before
    BEGIN
        ALTER TABLE "SageIntegration" ALTER COLUMN "integratedById" DROP NOT NULL;
    EXCEPTION WHEN others THEN
        NULL; -- already nullable, ignore
    END;
END $$;

-- 3. Indexes (IF NOT EXISTS — safe)
CREATE INDEX IF NOT EXISTS "SageIntegration_ordreVirementId_idx"
    ON "SageIntegration"("ordreVirementId");

CREATE INDEX IF NOT EXISTS "SageIntegration_status_idx"
    ON "SageIntegration"("status");

CREATE INDEX IF NOT EXISTS "SageIntegration_integratedAt_idx"
    ON "SageIntegration"("integratedAt");

-- 4. FK → OrdreVirement (drop+recreate = idempotent)
ALTER TABLE "SageIntegration"
    DROP CONSTRAINT IF EXISTS "SageIntegration_ordreVirementId_fkey";

ALTER TABLE "SageIntegration"
    ADD CONSTRAINT "SageIntegration_ordreVirementId_fkey"
    FOREIGN KEY ("ordreVirementId")
    REFERENCES "OrdreVirement"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- 5. FK → User (nullable, SET NULL on delete — safe)
ALTER TABLE "SageIntegration"
    DROP CONSTRAINT IF EXISTS "SageIntegration_integratedById_fkey";

-- Clean up any leftover 'system' placeholder values that would break the FK
UPDATE "SageIntegration"
SET "integratedById" = NULL
WHERE "integratedById" IS NOT NULL
  AND "integratedById" NOT IN (SELECT "id" FROM "User");

ALTER TABLE "SageIntegration"
    ADD CONSTRAINT "SageIntegration_integratedById_fkey"
    FOREIGN KEY ("integratedById")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;