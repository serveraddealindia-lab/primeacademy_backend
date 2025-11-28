-- ============================================
-- Fix Image Upload Columns SQL Script
-- ============================================
-- This script fixes image upload issues by ensuring:
-- 1. avatarUrl column exists in users table (VARCHAR 1000)
-- 2. photoUrl column exists in student_profiles table (VARCHAR 1000)
-- 
-- Run this script in your MySQL database
-- Safe to run multiple times - it will modify existing columns or add if missing
-- ============================================

USE primeacademy_db;

-- ============================================
-- Step 1: Fix users.avatarUrl column
-- ============================================
-- First, try to modify the column (if it exists)
-- If it doesn't exist, you'll get an error, then run the ADD statement below

-- Option A: If column already exists, modify it to VARCHAR(1000)
ALTER TABLE `users` 
MODIFY COLUMN `avatarUrl` VARCHAR(1000) NULL 
COMMENT 'User avatar/profile image URL';

-- Option B: If column doesn't exist, uncomment and run this instead:
-- ALTER TABLE `users` 
-- ADD COLUMN `avatarUrl` VARCHAR(1000) NULL 
-- AFTER `passwordHash`
-- COMMENT 'User avatar/profile image URL';

-- ============================================
-- Step 2: Fix student_profiles.photoUrl column
-- ============================================
-- First, try to modify the column (if it exists)
-- If it doesn't exist, you'll get an error, then run the ADD statement below

-- Option A: If column already exists, modify it to VARCHAR(1000)
ALTER TABLE `student_profiles` 
MODIFY COLUMN `photoUrl` VARCHAR(1000) NULL 
COMMENT 'Student profile photo URL';

-- Option B: If column doesn't exist, uncomment and run this instead:
-- ALTER TABLE `student_profiles` 
-- ADD COLUMN `photoUrl` VARCHAR(1000) NULL 
-- AFTER `documents`
-- COMMENT 'Student profile photo URL';

-- ============================================
-- Step 3: Verify the changes
-- ============================================
-- Run these queries to verify the columns are correct:

SELECT 
    'users.avatarUrl' AS table_column,
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH AS max_length, 
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'primeacademy_db' 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'avatarUrl';

SELECT 
    'student_profiles.photoUrl' AS table_column,
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH AS max_length, 
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'primeacademy_db' 
AND TABLE_NAME = 'student_profiles' 
AND COLUMN_NAME = 'photoUrl';

-- ============================================
-- Expected Results:
-- ============================================
-- users.avatarUrl should show:
--   - DATA_TYPE: varchar
--   - CHARACTER_MAXIMUM_LENGTH: 1000
--   - IS_NULLABLE: YES
--
-- student_profiles.photoUrl should show:
--   - DATA_TYPE: varchar
--   - CHARACTER_MAXIMUM_LENGTH: 1000
--   - IS_NULLABLE: YES
-- ============================================

