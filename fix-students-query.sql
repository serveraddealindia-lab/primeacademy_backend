-- Direct SQL query to check and fix students not showing issue
-- Run this on your VPS MySQL to verify students exist

-- 1. Check if students exist
SELECT 
  COUNT(*) as total_students,
  COUNT(CASE WHEN isActive = 1 THEN 1 END) as active_students
FROM users 
WHERE LOWER(role) = 'student';

-- 2. Show recent students
SELECT 
  id,
  name,
  email,
  phone,
  role,
  isActive,
  createdAt
FROM users 
WHERE LOWER(role) = 'student'
ORDER BY createdAt DESC
LIMIT 10;

-- 3. Check student profiles
SELECT 
  sp.id as profile_id,
  sp.userId,
  u.name as student_name,
  u.role,
  sp.status
FROM student_profiles sp
LEFT JOIN users u ON sp.userId = u.id
WHERE LOWER(u.role) = 'student'
ORDER BY sp.createdAt DESC
LIMIT 10;

-- 4. Check for any role case issues
SELECT 
  role,
  COUNT(*) as count
FROM users
GROUP BY role;

-- 5. Verify the exact query the API should use
SELECT 
  u.id,
  u.name,
  u.email,
  u.phone,
  u.avatarUrl,
  u.isActive,
  u.createdAt,
  u.updatedAt,
  sp.id as profile_id,
  sp.userId,
  sp.dob,
  sp.address,
  sp.documents,
  sp.photoUrl,
  sp.softwareList,
  sp.enrollmentDate,
  sp.status,
  sp.finishedBatches,
  sp.currentBatches,
  sp.pendingBatches
FROM users u
LEFT JOIN student_profiles sp ON u.id = sp.userId
WHERE LOWER(u.role) = 'student'
ORDER BY u.createdAt DESC
LIMIT 5;

