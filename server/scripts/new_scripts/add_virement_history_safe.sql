-- Safe migration: Add VirementHistory table without losing data
-- Run this with: psql -U your_user -d your_database -f add_virement_history_safe.sql

-- Create VirementHistory table if it doesn't exist
CREATE TABLE IF NOT EXISTS "VirementHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "virementId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousState" TEXT,
    "newState" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    
    CONSTRAINT "VirementHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VirementHistory_virementId_fkey" FOREIGN KEY ("virementId") REFERENCES "OrdreVirement"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "VirementHistory_virementId_idx" ON "VirementHistory"("virementId");
CREATE INDEX IF NOT EXISTS "VirementHistory_createdAt_idx" ON "VirementHistory"("createdAt");
CREATE INDEX IF NOT EXISTS "VirementHistory_action_idx" ON "VirementHistory"("action");

-- Verify table was created
SELECT 'VirementHistory table created successfully' AS status;
