-- ARS Database Backup Script
-- Run this BEFORE clearing data for production delivery

\echo '=== ARS DATABASE BACKUP STARTING ==='
\echo 'Timestamp:' \qecho `date`

-- Show current data counts BEFORE backup
\echo '\n=== CURRENT DATA COUNTS ==='
SELECT 'clients' as table_name, COUNT(*) as record_count FROM clients
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'bulletin_soins', COUNT(*) FROM bulletin_soins
UNION ALL
SELECT 'donneurs', COUNT(*) FROM donneurs
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'teams', COUNT(*) FROM teams
UNION ALL
SELECT 'analytics_data', COUNT(*) FROM analytics_data
ORDER BY table_name;

\echo '\n=== BACKING UP DATA ==='
-- Backup all table data to ARS folder
\copy clients TO 'd:/ARS/backup_clients.csv' DELIMITER ',' CSV HEADER;
\echo 'clients table backed up'
\copy users TO 'd:/ARS/backup_users.csv' DELIMITER ',' CSV HEADER;
\echo 'users table backed up'
\copy bulletin_soins TO 'd:/ARS/backup_bulletin_soins.csv' DELIMITER ',' CSV HEADER;
\echo 'bulletin_soins table backed up'
\copy donneurs TO 'd:/ARS/backup_donneurs.csv' DELIMITER ',' CSV HEADER;
\echo 'donneurs table backed up'
\copy transactions TO 'd:/ARS/backup_transactions.csv' DELIMITER ',' CSV HEADER;
\echo 'transactions table backed up'
\copy departments TO 'd:/ARS/backup_departments.csv' DELIMITER ',' CSV HEADER;
\echo 'departments table backed up'
\copy teams TO 'd:/ARS/backup_teams.csv' DELIMITER ',' CSV HEADER;
\echo 'teams table backed up'
\copy analytics_data TO 'd:/ARS/backup_analytics_data.csv' DELIMITER ',' CSV HEADER;
\echo 'analytics_data table backed up'

\echo '\n=== BACKUP COMPLETED SUCCESSFULLY ==='
\echo 'All backup files saved to d:/ARS/ folder'