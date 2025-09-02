-- ARS Production Data Cleanup Script
-- This clears all fake/test data while preserving table structure
-- IMPORTANT: Run database-backup.sql FIRST!

\echo '=== ARS PRODUCTION DATA CLEANUP STARTING ==='

-- Show data counts BEFORE cleanup
\echo '\n=== DATA COUNTS BEFORE CLEANUP ==='
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

\echo '\n=== CLEARING DATA ==='
-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Clear all table data (keeps structure)
TRUNCATE TABLE transactions CASCADE;
\echo 'transactions table cleared'
TRUNCATE TABLE bulletin_soins CASCADE;
\echo 'bulletin_soins table cleared'
TRUNCATE TABLE clients CASCADE;
\echo 'clients table cleared'
TRUNCATE TABLE donneurs CASCADE;
\echo 'donneurs table cleared'
TRUNCATE TABLE analytics_data CASCADE;
\echo 'analytics_data table cleared'
TRUNCATE TABLE teams CASCADE;
\echo 'teams table cleared'
TRUNCATE TABLE departments CASCADE;
\echo 'departments table cleared'
TRUNCATE TABLE users CASCADE;
\echo 'users table cleared'

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

\echo '\n=== RESETTING SEQUENCES ==='
-- Reset auto-increment sequences
ALTER SEQUENCE clients_id_seq RESTART WITH 1;
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE bulletin_soins_id_seq RESTART WITH 1;
ALTER SEQUENCE donneurs_id_seq RESTART WITH 1;
ALTER SEQUENCE transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE departments_id_seq RESTART WITH 1;
ALTER SEQUENCE teams_id_seq RESTART WITH 1;
ALTER SEQUENCE analytics_data_id_seq RESTART WITH 1;
\echo 'All sequences reset to 1'

-- Verify cleanup
\echo '\n=== DATA COUNTS AFTER CLEANUP ==='
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

\echo '\n=== PRODUCTION CLEANUP COMPLETED ==='
\echo 'Database is ready for real client data!'