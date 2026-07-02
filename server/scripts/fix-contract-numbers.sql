-- SQL Script to Fix Contract Number Data
-- This script updates Contract.codeAssure to contain actual contract numbers
-- instead of insured codes

-- ============================================================================
-- STEP 1: BACKUP CURRENT DATA
-- ============================================================================
-- Run this BEFORE making any changes!

CREATE TABLE IF NOT EXISTS "Contract_backup_20260130" AS
SELECT * FROM "Contract";

-- Verify backup
SELECT COUNT(*) as "Total Contracts Backed Up" FROM "Contract_backup_20260130";


-- ============================================================================
-- STEP 2: ANALYZE CURRENT DATA
-- ============================================================================
-- Check what's currently in Contract.codeAssure

SELECT 
  c."id",
  c."clientName",
  c."codeAssure" as "Current_codeAssure_Value",
  LENGTH(c."codeAssure") as "Length",
  c."startDate",
  c."endDate"
FROM "Contract" c
ORDER BY c."clientName", c."startDate" DESC
LIMIT 20;


-- ============================================================================
-- STEP 3: FIND SAMPLE ADHERENTS TO UNDERSTAND DATA STRUCTURE
-- ============================================================================
-- This helps us understand if Contract.codeAssure matches Adherent.codeAssure (bad)
-- or if it's already a proper contract number (good)

SELECT 
  c."clientName",
  c."codeAssure" as "Contract_codeAssure",
  a."matricule" as "Adherent_Matricule",
  a."nom" as "Adherent_Name",
  a."codeAssure" as "Adherent_InsuredCode",
  a."numeroContrat" as "Adherent_ContractNumber",
  CASE 
    WHEN c."codeAssure" = a."codeAssure" THEN '❌ PROBLEM: Matches Insured Code'
    WHEN c."codeAssure" = a."numeroContrat" THEN '✅ CORRECT: Matches Contract Number'
    WHEN LENGTH(c."codeAssure") <= 6 THEN '⚠️ LIKELY INSURED CODE (short)'
    WHEN LENGTH(c."codeAssure") > 6 THEN '✅ LIKELY CONTRACT NUMBER (long)'
    ELSE '❓ UNKNOWN'
  END as "Analysis"
FROM "Contract" c
JOIN "Client" cl ON cl."name" = c."clientName"
JOIN "Adherent" a ON a."clientId" = cl."id" AND (a."codeAssure" = c."codeAssure" OR a."numeroContrat" IS NOT NULL)
LIMIT 50;


-- ============================================================================
-- STEP 4A: FIX OPTION 1 - Update from Adherent.numeroContrat
-- ============================================================================
-- Use this if Adherent.numeroContrat contains the correct contract numbers
-- This updates Contract.codeAssure to match Adherent.numeroContrat for the same client

-- CAUTION: Review the SELECT query first before running UPDATE!

-- Preview what will be updated:
SELECT 
  c."id" as "Contract_ID",
  c."clientName",
  c."codeAssure" as "OLD_Value",
  a."numeroContrat" as "NEW_Value",
  COUNT(DISTINCT a."id") as "Matching_Adherents"
FROM "Contract" c
JOIN "Client" cl ON cl."name" = c."clientName"
JOIN "Adherent" a ON a."clientId" = cl."id" 
  AND a."numeroContrat" IS NOT NULL 
  AND a."numeroContrat" != ''
GROUP BY c."id", c."clientName", c."codeAssure", a."numeroContrat"
ORDER BY c."clientName";

-- Uncomment to execute the update (REVIEW PREVIEW FIRST!):
/*
UPDATE "Contract" c
SET "codeAssure" = subq."numeroContrat"
FROM (
  SELECT DISTINCT
    c2."id" as "contractId",
    a."numeroContrat"
  FROM "Contract" c2
  JOIN "Client" cl ON cl."name" = c2."clientName"
  JOIN "Adherent" a ON a."clientId" = cl."id" 
    AND a."numeroContrat" IS NOT NULL 
    AND a."numeroContrat" != ''
  WHERE c2."codeAssure" IS NULL OR c2."codeAssure" = a."codeAssure" -- Only update if NULL or matches insured code
) subq
WHERE c."id" = subq."contractId";
*/


-- ============================================================================
-- STEP 4B: FIX OPTION 2 - Manual Update for Specific Clients
-- ============================================================================
-- Use this if you know the exact contract numbers for specific clients
-- Replace the VALUES with your actual data

-- Example for PGH:
/*
UPDATE "Contract"
SET "codeAssure" = '70240017'
WHERE "clientName" = 'POULINA GROUP HOLDING'
  AND "codeAssure" = '4103';
*/

-- Example for HPE:
/*
UPDATE "Contract"
SET "codeAssure" = 'A70240018'
WHERE "clientName" = 'HPE'
  AND "codeAssure" = '5201';
*/

-- Template for bulk update:
/*
UPDATE "Contract"
SET "codeAssure" = CASE 
  WHEN "clientName" = 'CLIENT_NAME_1' THEN 'CONTRACT_NUMBER_1'
  WHEN "clientName" = 'CLIENT_NAME_2' THEN 'CONTRACT_NUMBER_2'
  WHEN "clientName" = 'CLIENT_NAME_3' THEN 'CONTRACT_NUMBER_3'
  -- Add more cases as needed
  ELSE "codeAssure"
END
WHERE "clientName" IN ('CLIENT_NAME_1', 'CLIENT_NAME_2', 'CLIENT_NAME_3');
*/


-- ============================================================================
-- STEP 5: VERIFY THE FIX
-- ============================================================================
-- Check that Contract.codeAssure now contains contract numbers, not insured codes

SELECT 
  c."clientName",
  c."codeAssure" as "Contract_Number",
  COUNT(DISTINCT b."id") as "Bordeaux_Count",
  COUNT(DISTINCT ov."id") as "OV_Count"
FROM "Contract" c
LEFT JOIN "Bordereau" b ON b."contractId" = c."id"
LEFT JOIN "OrdreVirement" ov ON ov."bordereauId" = b."id"
GROUP BY c."clientName", c."codeAssure"
ORDER BY c."clientName";


-- ============================================================================
-- STEP 6: TEST IN APPLICATION
-- ============================================================================
-- After running the SQL updates:
-- 1. Restart the backend server
-- 2. Go to Finance Module → Tableau de Bord
-- 3. Check that "N° Contrat" column shows contract numbers (e.g., 70240017)
--    NOT insured codes (e.g., 4103)
-- 4. Check Tracking & Status tab as well
-- 5. Export to Excel and verify the data


-- ============================================================================
-- ROLLBACK (IF NEEDED)
-- ============================================================================
-- If something goes wrong, restore from backup:

/*
-- Restore all data:
DELETE FROM "Contract";
INSERT INTO "Contract" SELECT * FROM "Contract_backup_20260130";

-- Verify rollback:
SELECT COUNT(*) FROM "Contract";
*/


-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. Contract.codeAssure SHOULD contain:
--    ✅ ACTUAL CONTRACT NUMBER (e.g., "70240017", "A70240018")
--    ❌ NOT insured code (e.g., "4103", "5201")
--
-- 2. Adherent.codeAssure contains:
--    The insured code (e.g., "4103") - this is correct
--
-- 3. Adherent.numeroContrat contains:
--    The contract number (e.g., "70240017") - this should match Contract.codeAssure
--
-- 4. After this fix, the Finance Module will correctly display:
--    N° Contrat: 70240017 ✅ (instead of 4103 ❌)
--
-- ============================================================================
