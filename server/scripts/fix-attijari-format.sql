-- fix-attijari-format.sql
-- Fixes ATTIJARI donneurs that have wrong formatTxtType = 'STRUCTURE_1' on prod
-- Run: psql -U postgres -d ars_db -f scripts/fix-attijari-format.sql

BEGIN;

UPDATE "DonneurOrdre" SET "formatTxtType" = 'ATTIJARI' WHERE id = '83c6fd5b-19fc-483b-8cc7-e160950c740d';
UPDATE "DonneurOrdre" SET "formatTxtType" = 'ATTIJARI' WHERE id = 'd323621c-9301-4f06-9140-52f39881ab4b';

-- Verify
SELECT id, nom, rib, "formatTxtType" FROM "DonneurOrdre" ORDER BY nom;

COMMIT;
