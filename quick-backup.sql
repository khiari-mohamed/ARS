-- Quick backup - just dump the entire database
-- Much faster than CSV exports

\echo '=== QUICK DATABASE BACKUP ===';
\! pg_dump -h localhost -U postgres -d ars_db > d:/ARS/ars_quick_backup.sql
\echo 'Full database backup saved to d:/ARS/ars_quick_backup.sql';
\echo 'Backup completed!';