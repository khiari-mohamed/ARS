-- Add scanStatus and completionRate fields to Bordereau table
ALTER TABLE "Bordereau" 
ADD COLUMN IF NOT EXISTS "scanStatus" VARCHAR(20) DEFAULT 'NON_SCANNE',
ADD COLUMN IF NOT EXISTS "completionRate" INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "idx_bordereau_scan_status" ON "Bordereau"("scanStatus");
CREATE INDEX IF NOT EXISTS "idx_bordereau_completion_rate" ON "Bordereau"("completionRate");

-- Create BSPerformanceLog table for tracking BS processing performance
CREATE TABLE IF NOT EXISTS "BSPerformanceLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bsId" UUID REFERENCES "BulletinSoin"(id) ON DELETE CASCADE,
  "gestionnairId" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "processingTime" INTEGER, -- milliseconds
  "action" VARCHAR(50),
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance queries
CREATE INDEX IF NOT EXISTS "idx_bs_performance_gestionnaire" 
ON "BSPerformanceLog"("gestionnairId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_bs_performance_bs" 
ON "BSPerformanceLog"("bsId", "createdAt");

-- Update existing bordereaux to have proper scan status based on their current state
UPDATE "Bordereau" 
SET "scanStatus" = CASE 
  WHEN "statut" = 'A_SCANNER' THEN 'NON_SCANNE'
  WHEN "statut" IN ('SCAN_EN_COURS', 'EN_COURS', 'ASSIGNE') THEN 'SCAN_EN_COURS'
  WHEN "statut" IN ('SCANNE', 'TRAITE', 'CLOTURE') THEN 'SCAN_FINALISE'
  ELSE 'NON_SCANNE'
END
WHERE "scanStatus" = 'NON_SCANNE';

-- Calculate initial completion rates for existing bordereaux
UPDATE "Bordereau" 
SET "completionRate" = (
  SELECT CASE 
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      (COUNT(CASE WHEN "etat" IN ('VALIDATED', 'REJECTED') THEN 1 END) * 100.0) / COUNT(*)
    )
  END
  FROM "BulletinSoin" 
  WHERE "bordereauId" = "Bordereau".id
)
WHERE "completionRate" = 0;