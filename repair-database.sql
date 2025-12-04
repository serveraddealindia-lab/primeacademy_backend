-- Repair Aria Storage Engine Corruption
-- Run this as MySQL root user after starting MySQL in recovery mode if needed

-- Repair system tables (if corrupted)
USE mysql;
REPAIR TABLE user;
REPAIR TABLE db;
REPAIR TABLE tables_priv;
REPAIR TABLE columns_priv;
REPAIR TABLE procs_priv;
REPAIR TABLE host;
REPAIR TABLE func;

-- Repair your application database
USE primeacademy_db;

-- Check and repair all tables
-- Note: Replace with actual table names in your database
REPAIR TABLE users;
REPAIR TABLE batches;
REPAIR TABLE enrollments;
REPAIR TABLE student_profiles;
REPAIR TABLE faculty_profiles;
REPAIR TABLE sessions;
REPAIR TABLE attendance;
REPAIR TABLE payment_transactions;
REPAIR TABLE portfolios;
REPAIR TABLE software_completions;
REPAIR TABLE certificates;
REPAIR TABLE student_orientations;

-- Check table status
SHOW TABLE STATUS;

-- If repair fails, you may need to:
-- 1. Backup the table: mysqldump -u root -p primeacademy_db table_name > backup.sql
-- 2. Drop table: DROP TABLE table_name;
-- 3. Restore: mysql -u root -p primeacademy_db < backup.sql

