# Fix MySQL Access and Backend Connection

**Issues:**
1. MySQL access denied for `primeacademy_user`
2. Backend not running on port 3000

---

## Step 1: Find Correct MySQL Credentials

The MySQL password is stored in your backend `.env` file. Let's check it:

```bash
# Navigate to backend directory
cd /var/www/primeacademy/backend

# Check .env file for database credentials
cat .env | grep DB_

# Or view the whole .env file
cat .env
```

Look for these lines:
```
DB_HOST=localhost
DB_USER=primeacademy_user
DB_PASSWORD=your_actual_password_here
DB_NAME=primeacademy_db
```

**Copy the password from `DB_PASSWORD`** - that's what you need to use!

---

## Step 2: Connect to MySQL with Correct Password

```bash
# Use the password from .env file
mysql -u primeacademy_user -p primeacademy_db

# When prompted, paste the password from DB_PASSWORD in .env
```

---

## Step 3: Alternative - Use Root MySQL User

If you can't find the password or it still doesn't work, try using root:

```bash
# Connect as root (you're already logged in as root on VPS)
mysql -u root -p

# Or if root has no password:
mysql -u root
```

Then switch to the database:
```sql
USE primeacademy_db;
```

---

## Step 4: Execute SQL Script

Once connected to MySQL, paste this SQL:

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

## Step 5: Fix Backend Connection

After SQL is executed, fix the backend:

```bash
# Check backend status
pm2 status

# Check backend logs for errors
pm2 logs primeacademy-backend --lines 50

# If backend is stopped, start it
cd /var/www/primeacademy/backend
pm2 start dist/index.js --name primeacademy-backend
pm2 save

# If backend is running but not responding, restart it
pm2 restart primeacademy-backend

# Wait a few seconds, then test
sleep 3
curl http://localhost:3000/api/health
```

---

## Step 6: Check Backend Logs for Database Errors

```bash
# View recent logs
pm2 logs primeacademy-backend --lines 100

# Look for:
# - "Database connection established successfully" ✅
# - "Table 'student_orientations' doesn't exist" ❌ (SQL not executed)
# - "Unknown column 'studentDeclarationAccepted'" ❌ (SQL not executed)
# - "Access denied" ❌ (Wrong database password in .env)
```

---

## Quick All-in-One Fix

Run these commands in order:

```bash
# 1. Get MySQL password from .env
cd /var/www/primeacademy/backend
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
echo "Database password found: ${DB_PASS:0:3}..." # Show first 3 chars only

# 2. Create SQL file
cat > /tmp/fix_db.sql << 'EOF'
USE primeacademy_db;
SET @col1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationAccepted');
SET @sql1 = IF(@col1_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE', 'SELECT "exists" AS msg');
PREPARE stmt1 FROM @sql1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;
SET @col2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationDate');
SET @sql2 = IF(@col2_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationDate DATE NULL', 'SELECT "exists" AS msg');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
CREATE TABLE IF NOT EXISTS student_orientations (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, studentId INT NOT NULL, language ENUM('english', 'gujarati') NOT NULL, accepted BOOLEAN NOT NULL DEFAULT FALSE, acceptedAt DATE NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY unique_student_language (studentId, language), FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF

# 3. Execute SQL (will prompt for password - use the one from .env)
mysql -u primeacademy_user -p primeacademy_db < /tmp/fix_db.sql

# 4. Restart backend
pm2 restart primeacademy-backend

# 5. Test
sleep 3
curl http://localhost:3000/api/health
```

---

## Troubleshooting

### If MySQL password still doesn't work:

**Option 1: Reset MySQL password**
```bash
# Connect as root
mysql -u root -p

# Then in MySQL:
ALTER USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
EXIT;

# Update .env file
cd /var/www/primeacademy/backend
nano .env
# Change DB_PASSWORD to new_password
```

**Option 2: Use root MySQL user**
```bash
# Connect as root
mysql -u root -p

# Switch to database
USE primeacademy_db;

# Then paste the SQL script
```

### If backend still won't start:

```bash
# Check for errors
pm2 logs primeacademy-backend --lines 100

# Check if port is in use
lsof -i :3000

# Check if TypeScript is built
cd /var/www/primeacademy/backend
ls -la dist/index.js

# If missing, build it
npm run build

# Start backend
pm2 start dist/index.js --name primeacademy-backend
pm2 save
```

---

**After completing these steps, both MySQL access and backend should work!** ✅


