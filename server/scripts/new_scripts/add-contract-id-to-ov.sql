-- Add contractId column to OrdreVirement table (nullable, optional)
ALTER TABLE "OrdreVirement" ADD COLUMN IF NOT EXISTS "contractId" TEXT;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrdreVirement_contractId_fkey'
  ) THEN
    ALTER TABLE "OrdreVirement" 
    ADD CONSTRAINT "OrdreVirement_contractId_fkey" 
    FOREIGN KEY ("contractId") REFERENCES "Contract"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Verify the changes
SELECT 
  reference,
  "bordereauId",
  "clientId",
  "contractId"
FROM "OrdreVirement"
ORDER BY "dateCreation" DESC
LIMIT 10;
