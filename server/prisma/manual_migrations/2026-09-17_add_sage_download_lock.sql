-- Persist the one-time Sage TXT download lock for each ordre de virement.
ALTER TABLE "OrdreVirement"
ADD COLUMN IF NOT EXISTS "downloadedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "OrdreVirement_downloadedAt_idx"
ON "OrdreVirement"("downloadedAt");
