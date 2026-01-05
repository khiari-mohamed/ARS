-- Fix existing documents for Gestionnaire Senior bordereaux
-- Update all documents that belong to bordereaux with GESTIONNAIRE_SENIOR as team leader

UPDATE "Document" 
SET status = 'EN_COURS'
WHERE "bordereauId" IN (
  SELECT b.id 
  FROM "Bordereau" b
  INNER JOIN "Contract" c ON b."contractId" = c.id
  INNER JOIN "User" u ON c."teamLeaderId" = u.id
  WHERE u.role = 'GESTIONNAIRE_SENIOR'
)
AND status = 'UPLOADED';
