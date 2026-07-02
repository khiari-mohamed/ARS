-- restore-users-clients.sql
-- Run this ONLY if you have a pg_dump backup file
-- Usage: psql postgresql://postgres:PASSWORD@HOST:5432/ars_db -f scripts/restore-users-clients.sql

-- Check what's currently in the DB
SELECT 'User' AS "table", COUNT(*) AS rows FROM "User"
UNION ALL SELECT 'Client', COUNT(*) FROM "Client"
UNION ALL SELECT 'Contract', COUNT(*) FROM "Contract";
