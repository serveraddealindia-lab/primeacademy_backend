-- Repair Aria Storage Engine Corruption (Safe Version)
-- This version checks if tables exist before repairing to avoid errors
-- Run this as MySQL root user

-- Set error handling
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='';

-- Function to check if table exists and repair it
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS SafeRepairTable(IN db_name VARCHAR(64), IN table_name VARCHAR(64))
BEGIN
    DECLARE table_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO table_exists
    FROM information_schema.tables
    WHERE table_schema = db_name
      AND table_name = table_name;
    
    IF table_exists > 0 THEN
        SET @sql = CONCAT('REPAIR TABLE `', db_name, '`.`', table_name, '`');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('✅ Repaired: ', table_name) AS result;
    ELSE
        SELECT CONCAT('⚠️  Table does not exist: ', table_name) AS result;
    END IF;
END$$

DELIMITER ;

-- Repair system tables (if corrupted)
USE mysql;

-- Only repair system tables if they exist
CALL SafeRepairTable('mysql', 'user');
CALL SafeRepairTable('mysql', 'db');
CALL SafeRepairTable('mysql', 'tables_priv');
CALL SafeRepairTable('mysql', 'columns_priv');
CALL SafeRepairTable('mysql', 'procs_priv');
CALL SafeRepairTable('mysql', 'host');
CALL SafeRepairTable('mysql', 'func');

-- Repair your application database
USE primeacademy_db;

-- Check and repair all application tables (only if they exist)
CALL SafeRepairTable('primeacademy_db', 'users');
CALL SafeRepairTable('primeacademy_db', 'batches');
CALL SafeRepairTable('primeacademy_db', 'enrollments');
CALL SafeRepairTable('primeacademy_db', 'student_profiles');
CALL SafeRepairTable('primeacademy_db', 'faculty_profiles');
CALL SafeRepairTable('primeacademy_db', 'employee_profiles');
CALL SafeRepairTable('primeacademy_db', 'sessions');
CALL SafeRepairTable('primeacademy_db', 'attendance');
CALL SafeRepairTable('primeacademy_db', 'payment_transactions');
CALL SafeRepairTable('primeacademy_db', 'portfolios');
CALL SafeRepairTable('primeacademy_db', 'software_completions');
CALL SafeRepairTable('primeacademy_db', 'certificates');
CALL SafeRepairTable('primeacademy_db', 'student_orientations');
CALL SafeRepairTable('primeacademy_db', 'student_leaves');
CALL SafeRepairTable('primeacademy_db', 'faculty_leaves');
CALL SafeRepairTable('primeacademy_db', 'employee_leaves');
CALL SafeRepairTable('primeacademy_db', 'batch_faculty_assignments');
CALL SafeRepairTable('primeacademy_db', 'change_requests');
CALL SafeRepairTable('primeacademy_db', 'batch_extensions');

-- Check table status
SHOW TABLE STATUS;

-- Clean up procedure
DROP PROCEDURE IF EXISTS SafeRepairTable;

-- Restore SQL mode
SET SQL_MODE=@OLD_SQL_MODE;

-- Summary
SELECT '✅ Database repair completed!' AS status;









