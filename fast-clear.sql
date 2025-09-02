-- Fast clear without detailed counts
-- Just clear everything quickly

\echo '=== FAST DATABASE CLEAR ===';

-- Disable foreign key checks
SET session_replication_role = replica;

-- Clear all data fast
TRUNCATE TABLE transactions, bulletin_soins, clients, donneurs, analytics_data, teams, departments, users CASCADE;

-- Re-enable foreign key checks  
SET session_replication_role = DEFAULT;

-- Reset sequences
ALTER SEQUENCE clients_id_seq RESTART WITH 1;
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE bulletin_soins_id_seq RESTART WITH 1;
ALTER SEQUENCE donneurs_id_seq RESTART WITH 1;
ALTER SEQUENCE transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE departments_id_seq RESTART WITH 1;
ALTER SEQUENCE teams_id_seq RESTART WITH 1;
ALTER SEQUENCE analytics_data_id_seq RESTART WITH 1;

\echo 'Database cleared and ready for production!';