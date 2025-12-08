-- Check and Fix Payment Plan Database Issues
-- Run this on your VPS database to diagnose payment plan issues

-- 1. Check if student_profiles table exists and has documents column
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    COLUMN_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'student_profiles'
  AND COLUMN_NAME = 'documents';

-- 2. Check sample data - see if documents field has data
SELECT 
    id,
    userId,
    documents,
    CASE 
        WHEN documents IS NULL THEN 'NULL'
        WHEN documents = '' THEN 'EMPTY'
        WHEN JSON_VALID(documents) THEN 'VALID JSON'
        ELSE 'INVALID JSON'
    END as documents_status
FROM student_profiles
LIMIT 10;

-- 3. Check if enrollmentMetadata exists in documents
SELECT 
    id,
    userId,
    JSON_EXTRACT(documents, '$.enrollmentMetadata') as enrollmentMetadata,
    JSON_EXTRACT(documents, '$.enrollmentMetadata.totalDeal') as totalDeal,
    JSON_EXTRACT(documents, '$.enrollmentMetadata.bookingAmount') as bookingAmount,
    JSON_EXTRACT(documents, '$.enrollmentMetadata.balanceAmount') as balanceAmount,
    JSON_EXTRACT(documents, '$.enrollmentMetadata.emiPlan') as emiPlan
FROM student_profiles
WHERE documents IS NOT NULL
  AND JSON_VALID(documents)
LIMIT 10;

-- 4. Fix: If documents column is TEXT instead of JSON, convert it
-- WARNING: Backup your database before running this!
-- ALTER TABLE student_profiles 
-- MODIFY COLUMN documents JSON;

-- 5. Check for students with enrollment data but no documents
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    sp.id as profile_id,
    sp.documents,
    CASE 
        WHEN sp.documents IS NULL THEN 'NO DOCUMENTS'
        WHEN JSON_EXTRACT(sp.documents, '$.enrollmentMetadata') IS NULL THEN 'NO ENROLLMENT METADATA'
        ELSE 'HAS DATA'
    END as status
FROM users u
LEFT JOIN student_profiles sp ON u.id = sp.userId
WHERE u.role = 'student'
LIMIT 20;







