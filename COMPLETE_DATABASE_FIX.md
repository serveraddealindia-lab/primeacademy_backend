# Complete Database Fix - Certificates, Payments, Orientations

**This script fixes all database issues for:**
- ✅ Certificates (declaration columns)
- ✅ Payments (receiptUrl and other columns)
- ✅ Orientations (student_orientations table)

---

## Quick Fix - All in One

### Step 1: Execute SQL Script

On your VPS, run:

```bash
# Create the complete SQL fix file
cat > /tmp/fix_all_database.sql << 'ENDOFFILE'
USE primeacademy_db;

-- Certificates: Add declaration columns
SET @col1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationAccepted');
SET @sql1 = IF(@col1_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE', 'SELECT "exists"');
PREPARE stmt1 FROM @sql1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

SET @col2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationDate');
SET @sql2 = IF(@col2_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationDate DATE NULL', 'SELECT "exists"');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- Payments: Add missing columns
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

# Execute SQL (use password from .env)
cd /var/www/primeacademy/backend
mysql -u primeacademy_user -p primeacademy_db < /tmp/fix_all_database.sql
```

### Step 2: Create Required Directories

```bash
cd /var/www/primeacademy/backend
mkdir -p certificates receipts
chmod 755 certificates receipts
```

### Step 3: Install Dependencies

```bash
cd /var/www/primeacademy/backend
npm install pdfmake
npm run build
```

### Step 4: Restart Backend

```bash
pm2 restart primeacademy-backend
pm2 logs primeacademy-backend --lines 50
```

---

## What This Fixes

### Certificates
- ✅ Adds `studentDeclarationAccepted` column
- ✅ Adds `studentDeclarationDate` column

### Payments
- ✅ Adds `receiptUrl` column
- ✅ Adds `paidAmount` column
- ✅ Adds `enrollmentId` column
- ✅ Adds `paymentMethod` column
- ✅ Adds `transactionId` column
- ✅ Adds `notes` column
- ✅ Updates `status` ENUM to include all values

### Orientations
- ✅ Creates `student_orientations` table
- ✅ Adds proper indexes and foreign keys

---

## Verification

After running the script, verify:

```sql
-- Check certificates
SHOW COLUMNS FROM certificates WHERE Field LIKE '%declaration%';

-- Check payments
SHOW COLUMNS FROM payment_transactions WHERE Field IN ('receiptUrl', 'paidAmount');

-- Check orientations
SHOW TABLES LIKE 'student_orientations';
```

---

## Alternative: Use the Complete SQL File

If you prefer, use the `FIX_ALL_DATABASE_ISSUES.sql` file:

```bash
# Upload FIX_ALL_DATABASE_ISSUES.sql to VPS via WinSCP
# Then execute:
mysql -u primeacademy_user -p primeacademy_db < /path/to/FIX_ALL_DATABASE_ISSUES.sql
```

---

**After completing these steps, certificates, payments, and orientations should all work!** ✅


