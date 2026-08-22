-- Safe, additive migration for BulletinSoin assignment tracking.
-- This migration does not modify or delete existing data.

BEGIN;

ALTER TABLE "BulletinSoin"
  ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "assignedByUserId" TEXT;

CREATE INDEX IF NOT EXISTS "BulletinSoin_ownerId_idx"
  ON "BulletinSoin" ("ownerId");

CREATE INDEX IF NOT EXISTS "BulletinSoin_etat_idx"
  ON "BulletinSoin" ("etat");

CREATE INDEX IF NOT EXISTS "BulletinSoin_assignedByUserId_idx"
  ON "BulletinSoin" ("assignedByUserId");

CREATE TABLE IF NOT EXISTS "BulletinSoinAssignmentHistory" (
  "id" TEXT NOT NULL,
  "bulletinSoinId" TEXT NOT NULL,
  "assignedToUserId" TEXT,
  "assignedByUserId" TEXT NOT NULL,
  "fromUserId" TEXT,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "etatAtAssignment" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BulletinSoinAssignmentHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BulletinSoinAssignmentHistory_bulletinSoinId_idx"
  ON "BulletinSoinAssignmentHistory" ("bulletinSoinId");

CREATE INDEX IF NOT EXISTS "BulletinSoinAssignmentHistory_assignedToUserId_idx"
  ON "BulletinSoinAssignmentHistory" ("assignedToUserId");

CREATE INDEX IF NOT EXISTS "BulletinSoinAssignmentHistory_createdAt_idx"
  ON "BulletinSoinAssignmentHistory" ("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BulletinSoin_assignedByUserId_fkey'
  ) THEN
    ALTER TABLE "BulletinSoin"
      ADD CONSTRAINT "BulletinSoin_assignedByUserId_fkey"
      FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BulletinSoinAssignmentHistory_bulletinSoinId_fkey'
  ) THEN
    ALTER TABLE "BulletinSoinAssignmentHistory"
      ADD CONSTRAINT "BulletinSoinAssignmentHistory_bulletinSoinId_fkey"
      FOREIGN KEY ("bulletinSoinId") REFERENCES "BulletinSoin"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BulletinSoinAssignmentHistory_assignedToUserId_fkey'
  ) THEN
    ALTER TABLE "BulletinSoinAssignmentHistory"
      ADD CONSTRAINT "BulletinSoinAssignmentHistory_assignedToUserId_fkey"
      FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BulletinSoinAssignmentHistory_assignedByUserId_fkey'
  ) THEN
    ALTER TABLE "BulletinSoinAssignmentHistory"
      ADD CONSTRAINT "BulletinSoinAssignmentHistory_assignedByUserId_fkey"
      FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BulletinSoinAssignmentHistory_fromUserId_fkey'
  ) THEN
    ALTER TABLE "BulletinSoinAssignmentHistory"
      ADD CONSTRAINT "BulletinSoinAssignmentHistory_fromUserId_fkey"
      FOREIGN KEY ("fromUserId") REFERENCES "User"("id");
  END IF;
END $$;

COMMIT;
