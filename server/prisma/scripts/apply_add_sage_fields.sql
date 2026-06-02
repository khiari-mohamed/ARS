-- Add Sage integration fields without resetting the database
-- Run this script with psql or prisma db execute against your development DB.

BEGIN;

-- 1) Add optional compteGeneralSage to CompagnieAssurance
ALTER TABLE "CompagnieAssurance"
  ADD COLUMN IF NOT EXISTS "compteGeneralSage" TEXT;

-- 2) Add optional libelleSage to OrdreVirement
ALTER TABLE "OrdreVirement"
  ADD COLUMN IF NOT EXISTS "libelleSage" TEXT;

COMMIT;

-- End of script
