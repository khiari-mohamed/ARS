-- Check if clientId column exists and verify data
SELECT 
  reference,
  "bordereauId",
  "clientId",
  "clientName"
FROM "OrdreVirement"
ORDER BY "dateCreation" DESC
LIMIT 10;
