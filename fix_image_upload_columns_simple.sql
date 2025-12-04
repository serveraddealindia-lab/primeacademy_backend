-- ============================================
-- SIMPLE FIX: Image Upload Columns
-- ============================================
-- Run this script in your MySQL database
-- It will fix both avatarUrl and photoUrl columns
-- ============================================

USE primeacademy_db;

-- ============================================
-- Fix users.avatarUrl column
-- ============================================
-- This will work whether the column exists or not
-- If column exists: modifies it to VARCHAR(1000)
-- If column doesn't exist: adds it as VARCHAR(1000)

-- Check and modify/add avatarUrl
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'avatarUrl';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  CONCAT('ALTER TABLE `', @tablename, '` MODIFY COLUMN `', @columnname, '` VARCHAR(1000) NULL COMMENT ''User avatar/profile image URL'''),
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` VARCHAR(1000) NULL AFTER `passwordHash` COMMENT ''User avatar/profile image URL''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- Fix student_profiles.photoUrl column
-- ============================================
-- This will work whether the column exists or not
-- If column exists: modifies it to VARCHAR(1000)
-- If column doesn't exist: adds it as VARCHAR(1000)

SET @tablename = 'student_profiles';
SET @columnname = 'photoUrl';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  CONCAT('ALTER TABLE `', @tablename, '` MODIFY COLUMN `', @columnname, '` VARCHAR(1000) NULL COMMENT ''Student profile photo URL'''),
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` VARCHAR(1000) NULL AFTER `documents` COMMENT ''Student profile photo URL''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- Verify Results
-- ============================================
SELECT '✓ Image upload columns fixed successfully!' AS Status;

SELECT 
    'users.avatarUrl' AS 'Table.Column',
    COLUMN_NAME AS 'Column Name', 
    DATA_TYPE AS 'Data Type', 
    CHARACTER_MAXIMUM_LENGTH AS 'Max Length', 
    IS_NULLABLE AS 'Nullable'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'avatarUrl'

UNION ALL

SELECT 
    'student_profiles.photoUrl' AS 'Table.Column',
    COLUMN_NAME AS 'Column Name', 
    DATA_TYPE AS 'Data Type', 
    CHARACTER_MAXIMUM_LENGTH AS 'Max Length', 
    IS_NULLABLE AS 'Nullable'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'student_profiles' 
AND COLUMN_NAME = 'photoUrl';




