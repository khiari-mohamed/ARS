-- Delete all data but keep table structure
-- Run this in pgAdmin Query Tool

-- Delete in correct order (foreign keys)
DELETE FROM transactions;
DELETE FROM bulletin_soins;
DELETE FROM analytics_data;
DELETE FROM clients;
DELETE FROM donneurs;
DELETE FROM teams;
DELETE FROM departments;
DELETE FROM users;

-- Reset auto-increment sequences
ALTER SEQUENCE clients_id_seq RESTART WITH 1;
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE bulletin_soins_id_seq RESTART WITH 1;
ALTER SEQUENCE donneurs_id_seq RESTART WITH 1;
ALTER SEQUENCE transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE departments_id_seq RESTART WITH 1;
ALTER SEQUENCE teams_id_seq RESTART WITH 1;
ALTER SEQUENCE analytics_data_id_seq RESTART WITH 1;

-- Show results
SELECT 'Data cleared successfully!' as status;