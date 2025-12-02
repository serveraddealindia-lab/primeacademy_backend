# Fix Certificates and Orientation Issues - SQL Scripts

**Problem:** 
- Certificates returning 500 error
- Orientation acceptance failing

**Root Cause:** Missing database tables/columns on VPS

---

## Step 1: Check Current Database State

Connect to your VPS and run these commands to check what's missing:

```bash
# Connect to MySQL
mysql -u primeacademy_user -p primeacademy_db
```

Then run these SQL queries:

```sql
-- Check if student_orientations table exists
SHOW TABLES LIKE 'student_orientations';

-- Check certificates table structure
DESCRIBE certificates;

-- Check if declaration columns exist in certificates
SHOW COLUMNS FROM certificates LIKE '%declaration%';
```

---

## Step 2: Fix Certificates Table

If `studentDeclarationAccepted` and `studentDeclarationDate` columns are missing, add them:

```sql
-- Add declaration columns to certificates table
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS studentDeclarationAccepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS studentDeclarationDate DATE NULL;

-- Verify columns were added
DESCRIBE certificates;
```

**Note:** If your MySQL version doesn't support `IF NOT EXISTS` in `ALTER TABLE`, use this instead:

```sql
-- Check if columns exist first, then add if missing
-- Run this query to check:
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'primeacademy_db' 
  AND TABLE_NAME = 'certificates' 
  AND COLUMN_NAME IN ('studentDeclarationAccepted', 'studentDeclarationDate');

-- If columns don't exist, add them:
ALTER TABLE certificates 
ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE,
ADD COLUMN studentDeclarationDate DATE NULL;
```

---

## Step 3: Create student_orientations Table

If the `student_orientations` table doesn't exist, create it:

```sql
-- Create student_orientations table
CREATE TABLE IF NOT EXISTS student_orientations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  studentId INT NOT NULL,
  language ENUM('english', 'gujarati') NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  acceptedAt DATE NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_language (studentId, language),
  FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table was created
SHOW TABLES LIKE 'student_orientations';
DESCRIBE student_orientations;
```

**Note:** If `CREATE TABLE IF NOT EXISTS` fails, check if table already exists:

```sql
-- Check if table exists
SHOW TABLES LIKE 'student_orientations';

-- If it doesn't exist, create it (without IF NOT EXISTS):
CREATE TABLE student_orientations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  studentId INT NOT NULL,
  language ENUM('english', 'gujarati') NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  acceptedAt DATE NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_language (studentId, language),
  FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Step 4: Complete SQL Script (All-in-One)

Here's a complete script that checks and fixes everything:

```sql
-- ============================================
-- Fix Certificates and Orientation Issues
-- ============================================

USE primeacademy_db;

-- 1. Add declaration columns to certificates (if missing)
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'primeacademy_db' 
    AND TABLE_NAME = 'certificates' 
    AND COLUMN_NAME = 'studentDeclarationAccepted'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE certificates ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE, ADD COLUMN studentDeclarationDate DATE NULL',
  'SELECT "Columns already exist" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Create student_orientations table (if missing)
CREATE TABLE IF NOT EXISTS student_orientations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  studentId INT NOT NULL,
  language ENUM('english', 'gujarati') NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  acceptedAt DATE NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_language (studentId, language),
  FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Verify everything
SELECT 'Certificates table columns:' AS info;
DESCRIBE certificates;

SELECT 'Student orientations table:' AS info;
SHOW TABLES LIKE 'student_orientations';
DESCRIBE student_orientations;

SELECT '✅ Database fix complete!' AS status;
```

---

## Step 5: Alternative Simple Script (If Above Fails)

If the dynamic SQL approach doesn't work, use this simpler version:

```sql
USE primeacademy_db;

-- Add declaration columns (will error if already exist, that's OK)
ALTER TABLE certificates 
ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE;

ALTER TABLE certificates 
ADD COLUMN studentDeclarationDate DATE NULL;

-- Create student_orientations table (will error if exists, that's OK)
CREATE TABLE student_orientations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  studentId INT NOT NULL,
  language ENUM('english', 'gujarati') NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  acceptedAt DATE NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_language (studentId, language),
  FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Note:** This script will show errors if columns/table already exist, but that's fine. The important thing is that they exist after running.

---

## Step 6: Restart Backend

After fixing the database, restart the backend:

```bash
# On VPS
pm2 restart primeacademy-backend

# Check logs for errors
pm2 logs primeacademy-backend --lines 50
```

---

## Step 7: Verify Fix

### Test Certificates:
```bash
# From VPS, test the endpoint (replace YOUR_TOKEN with actual admin token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://crm.prashantthakar.com/api/certificates
```

Should return JSON with certificates array, not 500 error.

### Test Orientation:
```bash
# Test orientation acceptance (replace YOUR_TOKEN and STUDENT_ID)
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"language":"english"}' \
     https://crm.prashantthakar.com/api/orientation/STUDENT_ID/accept
```

Should return success message, not 500 error.

---

## Troubleshooting

### Error: "Column already exists"
- **Solution:** This is OK! The column already exists, so you can skip that part.

### Error: "Table already exists"
- **Solution:** This is OK! The table already exists, so you can skip that part.

### Error: "Unknown column 'studentDeclarationAccepted'"
- **Solution:** The column wasn't added. Check MySQL version and use the alternative script without `IF NOT EXISTS`.

### Error: "Table 'student_orientations' doesn't exist"
- **Solution:** The table creation failed. Check foreign key constraints and ensure `users` table exists.

### Still Getting 500 Errors After Fix
1. **Check backend logs:**
   ```bash
   pm2 logs primeacademy-backend --lines 100
   ```

2. **Verify database connection:**
   ```bash
   mysql -u primeacademy_user -p primeacademy_db -e "SELECT 1;"
   ```

3. **Check if backend code is updated:**
   ```bash
   cd /var/www/primeacademy/backend
   git pull origin main
   npm run build
   pm2 restart primeacademy-backend
   ```

---

## Quick Command Summary

```bash
# 1. Connect to MySQL
mysql -u primeacademy_user -p primeacademy_db

# 2. Run the SQL fix script (copy-paste from Step 4 or Step 5)

# 3. Exit MySQL
EXIT;

# 4. Restart backend
pm2 restart primeacademy-backend

# 5. Check logs
pm2 logs primeacademy-backend --lines 50
```

---

**After completing these steps, both certificates and orientation should work!** ✅


