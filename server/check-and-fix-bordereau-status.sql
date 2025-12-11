-- Check current status of the bordereau
SELECT id, reference, statut, "dateReceptionBO", "dateCloture", "dateExecutionVirement"
FROM "Bordereau"
WHERE reference = 'CLI-BULLETIN-2025-37531';

-- If the status is wrong, fix it back to TRAITE
UPDATE "Bordereau"
SET statut = 'TRAITE'
WHERE reference = 'CLI-BULLETIN-2025-37531' AND statut != 'TRAITE';

-- Verify the fix
SELECT id, reference, statut, "dateReceptionBO", "dateCloture", "dateExecutionVirement"
FROM "Bordereau"
WHERE reference = 'CLI-BULLETIN-2025-37531';
