-- Fix existing bordereaux that have NULL dateReceptionBO
-- This ensures the new columns (Durée de traitement & Durée de règlement) work correctly

UPDATE "Bordereau" 
SET "dateReceptionBO" = "dateReception" 
WHERE "dateReceptionBO" IS NULL;
