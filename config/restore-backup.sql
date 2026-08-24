-- ARS Database Restore Script
-- Use this ONLY if something goes wrong after clearing data

-- Restore data from CSV backups
COPY clients FROM 'backup_clients.csv' DELIMITER ',' CSV HEADER;
COPY users FROM 'backup_users.csv' DELIMITER ',' CSV HEADER;
COPY departments FROM 'backup_departments.csv' DELIMITER ',' CSV HEADER;
COPY teams FROM 'backup_teams.csv' DELIMITER ',' CSV HEADER;
COPY donneurs FROM 'backup_donneurs.csv' DELIMITER ',' CSV HEADER;
COPY bulletin_soins FROM 'backup_bulletin_soins.csv' DELIMITER ',' CSV HEADER;
COPY transactions FROM 'backup_transactions.csv' DELIMITER ',' CSV HEADER;
COPY analytics_data FROM 'backup_analytics_data.csv' DELIMITER ',' CSV HEADER;

-- Alternative: Restore from full dump
-- psql -h localhost -U your_username -d ars_database < ars_full_backup.sql

PRINT 'Data restored successfully!';