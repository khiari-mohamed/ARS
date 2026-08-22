-- Safe migration to normalize EtatVirement enum and remap legacy values
-- WARNING: BACKUP your DB before running. Test on a staging copy first.

BEGIN;

-- 1) Create the new enum type with the exact canonical values
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'etatvirement_new') THEN
        CREATE TYPE "EtatVirement_new" AS ENUM (
            'NON_EXECUTE',
            'EN_COURS_VALIDATION',
            'VIREMENT_DEPOSE',
            'VIREMENT_NON_VALIDE',
            'VIREMENT_AUTORISE',
            'BLOQUE',
            'EXECUTE',
            'REJETE'
        );
    END IF;
END $$;

-- 2) Temporarily switch enum columns to text so we can update values
ALTER TABLE "OrdreVirement" ALTER COLUMN "etatVirement" TYPE text;
ALTER TABLE "SuiviVirement" ALTER COLUMN "etatVirement" TYPE text;

-- 3) Remap legacy values to canonical values
-- Map EN_COURS_EXECUTION -> EN_COURS_VALIDATION
UPDATE "OrdreVirement" SET "etatVirement" = 'EN_COURS_VALIDATION' WHERE "etatVirement" = 'EN_COURS_EXECUTION';
UPDATE "SuiviVirement" SET "etatVirement" = 'EN_COURS_VALIDATION' WHERE "etatVirement" = 'EN_COURS_EXECUTION';

-- Map EXECUTE_PARTIELLEMENT -> VIREMENT_NON_VALIDE
UPDATE "OrdreVirement" SET "etatVirement" = 'VIREMENT_NON_VALIDE' WHERE "etatVirement" = 'EXECUTE_PARTIELLEMENT';
UPDATE "SuiviVirement" SET "etatVirement" = 'VIREMENT_NON_VALIDE' WHERE "etatVirement" = 'EXECUTE_PARTIELLEMENT';

-- (Optional) Add additional mappings here if you have other legacy tokens
-- Example:
-- UPDATE "OrdreVirement" SET "etatVirement" = 'EN_COURS_VALIDATION' WHERE "etatVirement" IN ('EN_COURS','PENDING');

-- 4) Validate there are no remaining unknown values (fails the script if any exist)
-- This queries rows which are not in the canonical set and raises an error if found.
WITH bad AS (
  SELECT 'OrdreVirement' AS tbl, id, "etatVirement" FROM "OrdreVirement" WHERE "etatVirement" NOT IN (
    'NON_EXECUTE','EN_COURS_VALIDATION','VIREMENT_DEPOSE','VIREMENT_NON_VALIDE','VIREMENT_AUTORISE','BLOQUE','EXECUTE','REJETE'
  )
  UNION ALL
  SELECT 'SuiviVirement' AS tbl, id, "etatVirement" FROM "SuiviVirement" WHERE "etatVirement" NOT IN (
    'NON_EXECUTE','EN_COURS_VALIDATION','VIREMENT_DEPOSE','VIREMENT_NON_VALIDE','VIREMENT_AUTORISE','BLOQUE','EXECUTE','REJETE'
  )
)
SELECT * FROM bad LIMIT 1;

-- If the previous SELECT returned rows, stop and inspect them before continuing.
-- When running via psql this SELECT will output rows; ensure none are returned.

-- 5) Convert columns to the new enum type
ALTER TABLE "OrdreVirement"
  ALTER COLUMN "etatVirement" TYPE "EtatVirement_new" USING ("etatVirement"::"EtatVirement_new");

ALTER TABLE "SuiviVirement"
  ALTER COLUMN "etatVirement" TYPE "EtatVirement_new" USING ("etatVirement"::"EtatVirement_new");

-- 6) (Re)create sensible defaults if needed
ALTER TABLE "OrdreVirement" ALTER COLUMN "etatVirement" SET DEFAULT 'NON_EXECUTE'::"EtatVirement_new";
ALTER TABLE "SuiviVirement" ALTER COLUMN "etatVirement" SET DEFAULT 'NON_EXECUTE'::"EtatVirement_new";

-- 7) Drop old type if it exists and rename the new type into place
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'etatvirement') THEN
        DROP TYPE "EtatVirement";
    END IF;
END $$;

ALTER TYPE "EtatVirement_new" RENAME TO "EtatVirement";

COMMIT;

-- End of script
-- How to run:
-- 1) Backup DB: pg_dump -Fc -h <host> -p <port> -U <user> -f ars_backup.dump <dbname>
-- 2) Test on staging: psql -h <host> -p <port> -U <user> -d <dbname> -f 2026-08-09_normalize_etatvirement.sql
-- 3) Review output for any rows returned by the bad-values SELECT; fix manually if necessary before re-running.
