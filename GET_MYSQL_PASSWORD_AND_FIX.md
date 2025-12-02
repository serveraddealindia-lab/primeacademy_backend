# Get MySQL Password and Fix Issues

**Problems:**
1. MySQL access denied - need correct password
2. npm build script missing - wrong directory

---

## Step 1: Get MySQL Password from .env File

```bash
# Navigate to backend directory
cd /var/www/primeacademy/backend

# Get the MySQL password from .env file
cat .env | grep DB_PASSWORD

# Or view the whole .env file
cat .env
```

**Look for a line like:**
```
DB_PASSWORD=your_actual_password_here
```

**Copy the password value** (the part after `DB_PASSWORD=`)

---

## Step 2: Execute SQL with Correct Password

Once you have the password, run:

```bash
# Make sure you're in backend directory
cd /var/www/primeacademy/backend

# Execute SQL (paste the password when prompted)
mysql -u primeacademy_user -p primeacademy_db < /tmp/fix_all.sql

# When prompted "Enter password:", paste the password from .env
```

**OR use the password directly in the command:**

```bash
# Get password from .env and use it directly
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
mysql -u primeacademy_user -p"$DB_PASS" primeacademy_db < /tmp/fix_all.sql
```

---

## Step 3: If SQL File Doesn't Exist, Create It

If `/tmp/fix_all.sql` doesn't exist, create it:

```bash
cat > /tmp/fix_all.sql << 'ENDOFFILE'
USE primeacademy_db;

-- Certificates: Add declaration columns
SET @col1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationAccepted');
SET @sql1 = IF(@col1_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE', 'SELECT "exists"');
PREPARE stmt1 FROM @sql1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

SET @col2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationDate');
SET @sql2 = IF(@col2_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationDate DATE NULL', 'SELECT "exists"');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- Payments: Add all missing columns
SET @col3_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'receiptUrl');
SET @sql3 = IF(@col3_exists = 0, 'ALTER TABLE payment_transactions ADD COLUMN receiptUrl VARCHAR(255) NULL', 'SELECT "exists"');
PREPARE stmt3 FROM @sql3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

SET @col4_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'paidAmount');
SET @sql4 = IF(@col4_exists = 0, 'ALTER TABLE payment_transactions ADD COLUMN paidAmount DECIMAL(10,2) NOT NULL DEFAULT 0', 'SELECT "exists"');
PREPARE stmt4 FROM @sql4; EXECUTE stmt4; DEALLOCATE PREPARE stmt4;

SET @col5_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'enrollmentId');
SET @sql5 = IF(@col5_exists = 0, 'ALTER TABLE payment_transactions ADD COLUMN enrollmentId INT NULL', 'SELECT "exists"');
PREPARE stmt5 FROM @sql5; EXECUTE stmt5; DEALLOCATE PREPARE stmt5;

SET @col6_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'paymentMethod');
SET @sql6 = IF(@col6_exists = 0, 'ALTER TABLE payment_transactions ADD COLUMN paymentMethod VARCHAR(255) NULL', 'SELECT "exists"');
PREPARE stmt6 FROM @sql6; EXECUTE stmt6; DEALLOCATE PREPARE stmt6;

SET @col7_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'transactionId');
SET @sql7 = IF(@col7_exists = 0, 'ALTER TABLE payment_transactions ADD COLUMN transactionId VARCHAR(255) NULL', 'SELECT "exists"');
PREPARE stmt7 FROM @sql7; EXECUTE stmt7; DEALLOCATE PREPARE stmt7;

SET @col8_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'notes');
SET @sql8 = IF(@col8_exists = 0, 'ALTER TABLE payment_transactions ADD COLUMN notes TEXT NULL', 'SELECT "exists"');
PREPARE stmt8 FROM @sql8; EXECUTE stmt8; DEALLOCATE PREPARE stmt8;

-- Update payment status ENUM
ALTER TABLE payment_transactions MODIFY COLUMN status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending';

-- Orientations: Create table
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

SELECT '✅ All fixes complete!' AS status;
ENDOFFILE
```

---

## Step 4: Fix npm Build Script Error

The "Missing script: 'build'" error means you're not in the backend directory. Make sure:

```bash
# Navigate to backend directory
cd /var/www/primeacademy/backend

# Verify you're in the right place
pwd
ls -la package.json

# Check if build script exists
cat package.json | grep -A 5 "scripts"

# If build script exists, run it
npm run build

# If build script doesn't exist, check what scripts are available
npm run
```

---

## Step 5: Complete Fix Workflow

Run these commands in order:

```bash
# 1. Navigate to backend
cd /var/www/primeacademy/backend

# 2. Get MySQL password
echo "MySQL password from .env:"
cat .env | grep DB_PASSWORD

# 3. Create SQL file (if not exists)
cat > /tmp/fix_all.sql << 'ENDOFFILE'
USE primeacademy_db;
SET @col1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationAccepted');
SET @sql1 = IF(@col1_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE', 'SELECT "exists"');
PREPARE stmt1 FROM @sql1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;
SET @col2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationDate');
SET @sql2 = IF(@col2_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationDate DATE NULL', 'SELECT "exists"');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
SET @col3_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'receiptUrl');
SET @sql3 = IF(@col3_exists = 0, 'ALTER TABLE payment_transactions ADD COLUMN receiptUrl VARCHAR(255) NULL', 'SELECT "exists"');
PREPARE stmt3 FROM @sql3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;
SET @col4_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'paidAmount');
SET @sql4 = IF(@col4_exists = 0, 'ALTER TABLE payment_transactions ADD COLUMN paidAmount DECIMAL(10,2) NOT NULL DEFAULT 0', 'SELECT "exists"');
PREPARE stmt4 FROM @sql4; EXECUTE stmt4; DEALLOCATE PREPARE stmt4;
SET @col5_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'enrollmentId');
SET @sql5 = IF(@col5_exists = 0, 'ALTER TABLE payment_transactions ADD COLUMN enrollmentId INT NULL', 'SELECT "exists"');
PREPARE stmt5 FROM @sql5; EXECUTE stmt5; DEALLOCATE PREPARE stmt5;
SET @col6_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'paymentMethod');
SET @sql6 = IF(@col6_exists = 0, 'ALTER TABLE payment_transactions ADD COLUMN paymentMethod VARCHAR(255) NULL', 'SELECT "exists"');
PREPARE stmt6 FROM @sql6; EXECUTE stmt6; DEALLOCATE PREPARE stmt6;
SET @col7_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'transactionId');
SET @sql7 = IF(@col7_exists = 0, 'ALTER TABLE payment_transactions ADD COLUMN transactionId VARCHAR(255) NULL', 'SELECT "exists"');
PREPARE stmt7 FROM @sql7; EXECUTE stmt7; DEALLOCATE PREPARE stmt7;
SET @col8_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_transactions' AND COLUMN_NAME = 'notes');
SET @sql8 = IF(@col8_exists = 0, 'ALTER TABLE payment_transactions ADD COLUMN notes TEXT NULL', 'SELECT "exists"');
PREPARE stmt8 FROM @sql8; EXECUTE stmt8; DEALLOCATE PREPARE stmt8;
ALTER TABLE payment_transactions MODIFY COLUMN status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending';
CREATE TABLE IF NOT EXISTS student_orientations (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, studentId INT NOT NULL, language ENUM('english', 'gujarati') NOT NULL, accepted BOOLEAN NOT NULL DEFAULT FALSE, acceptedAt DATE NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY unique_student_language (studentId, language), FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SELECT '✅ All fixes complete!' AS status;
ENDOFFILE

# 4. Execute SQL with password from .env
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
mysql -u primeacademy_user -p"$DB_PASS" primeacademy_db < /tmp/fix_all.sql

# 5. Create directories
mkdir -p certificates receipts
chmod 755 certificates receipts

# 6. Install pdfmake (if not installed)
npm install pdfmake

# 7. Build TypeScript (if build script exists)
npm run build 2>/dev/null || echo "Build script not found, skipping..."

# 8. Restart backend
pm2 restart primeacademy-backend

# 9. Check status
pm2 status
pm2 logs primeacademy-backend --lines 20
```

---

## Alternative: Manual Password Entry

If the automatic password extraction doesn't work:

```bash
# 1. Get password manually
cd /var/www/primeacademy/backend
cat .env | grep DB_PASSWORD

# 2. Copy the password value (the part after =)

# 3. Execute SQL manually (paste password when prompted)
mysql -u primeacademy_user -p primeacademy_db < /tmp/fix_all.sql

# When it says "Enter password:", paste the password and press Enter
```

---

**After getting the correct password and executing the SQL, everything should work!** ✅


