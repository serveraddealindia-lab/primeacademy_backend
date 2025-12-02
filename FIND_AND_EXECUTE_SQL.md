# Find and Execute SQL File on VPS

The SQL file wasn't found in common locations. Let's find it or run SQL directly.

---

## Option 1: Find the Uploaded File

Run these commands on your VPS to find where WinSCP uploaded it:

```bash
# Search entire system for the file
find / -name "FIX_DATABASE_SAFE.sql" 2>/dev/null

# Search in common upload locations
find /home -name "FIX_DATABASE_SAFE.sql" 2>/dev/null
find /var/www -name "FIX_DATABASE_SAFE.sql" 2>/dev/null
find /tmp -name "FIX_DATABASE_SAFE.sql" 2>/dev/null

# Check current directory
pwd
ls -la *.sql
```

---

## Option 2: Upload File to Known Location

If you can't find it, upload it again via WinSCP to `/root/` directory:

1. **In WinSCP:**
   - Navigate to `/root/` on the VPS
   - Upload `FIX_DATABASE_SAFE.sql` there

2. **Then execute:**
```bash
mysql -u primeacademy_user -p primeacademy_db < /root/FIX_DATABASE_SAFE.sql
```

---

## Option 3: Run SQL Commands Directly (EASIEST)

Instead of finding the file, just paste these SQL commands directly into MySQL:

```bash
# Connect to MySQL
mysql -u primeacademy_user -p primeacademy_db
```

Then paste this SQL:

```sql
USE primeacademy_db;

-- Add studentDeclarationAccepted column (if missing)
SET @col1_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificates' 
    AND COLUMN_NAME = 'studentDeclarationAccepted'
);

SET @sql1 = IF(@col1_exists = 0,
  'ALTER TABLE certificates ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE',
  'SELECT "studentDeclarationAccepted column already exists" AS message'
);
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- Add studentDeclarationDate column (if missing)
SET @col2_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificates' 
    AND COLUMN_NAME = 'studentDeclarationDate'
);

SET @sql2 = IF(@col2_exists = 0,
  'ALTER TABLE certificates ADD COLUMN studentDeclarationDate DATE NULL',
  'SELECT "studentDeclarationDate column already exists" AS message'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Create student_orientations table (if missing)
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

-- Verify
SELECT 'Verification:' AS info;
SHOW COLUMNS FROM certificates WHERE Field LIKE '%declaration%';
SELECT COUNT(*) AS table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'student_orientations';

EXIT;
```

---

## Option 4: Create File on VPS and Execute

Create the SQL file directly on the VPS:

```bash
# Create the SQL file
cat > /root/FIX_DATABASE_SAFE.sql << 'EOF'
USE primeacademy_db;

SET @col1_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificates' 
    AND COLUMN_NAME = 'studentDeclarationAccepted'
);

SET @sql1 = IF(@col1_exists = 0,
  'ALTER TABLE certificates ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE',
  'SELECT "studentDeclarationAccepted column already exists" AS message'
);
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @col2_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificates' 
    AND COLUMN_NAME = 'studentDeclarationDate'
);

SET @sql2 = IF(@col2_exists = 0,
  'ALTER TABLE certificates ADD COLUMN studentDeclarationDate DATE NULL',
  'SELECT "studentDeclarationDate column already exists" AS message'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

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

SELECT 'Verification:' AS info;
SHOW COLUMNS FROM certificates WHERE Field LIKE '%declaration%';
SELECT COUNT(*) AS table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'student_orientations';
EOF

# Execute it
mysql -u primeacademy_user -p primeacademy_db < /root/FIX_DATABASE_SAFE.sql
```

---

## After Executing SQL

```bash
# Restart backend
pm2 restart primeacademy-backend

# Check status
pm2 status

# Test backend
curl http://localhost:3000/api/health
```

---

**I recommend Option 3 (paste SQL directly) - it's the fastest!** ✅


