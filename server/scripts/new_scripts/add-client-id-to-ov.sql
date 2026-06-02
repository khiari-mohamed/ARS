-- Add clientId column to OrdreVirement table (nullable, so no data loss)
ALTER TABLE "OrdreVirement" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- Add foreign key constraint
ALTER TABLE "OrdreVirement" 
ADD CONSTRAINT "OrdreVirement_clientId_fkey" 
FOREIGN KEY ("clientId") REFERENCES "Client"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Optional: Migrate existing manual entries to use clientId
-- Find manual entries (bordereauId is NULL) and try to match clientName to Client.name
UPDATE "OrdreVirement" 
SET "clientId" = (
  SELECT "id" FROM "Client" 
  WHERE "Client"."name" = "OrdreVirement"."clientName" 
  LIMIT 1
)
WHERE "bordereauId" IS NULL 
AND "clientName" IS NOT NULL
AND "clientId" IS NULL;

-- Verify the changes
SELECT 
  reference,
  "bordereauId",
  "clientId",
  "clientName"
FROM "OrdreVirement"
ORDER BY "dateCreation" DESC
LIMIT 10;
