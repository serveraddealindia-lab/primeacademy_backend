# Fix Certificates and Payments - Step by Step

**MySQL password is working!** Now let's fix certificates and payments.

---

## Step 1: Create SQL Fix File

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

SELECT '✅ All database fixes complete!' AS status;
ENDOFFILE
```

---

## Step 2: Execute SQL Script

```bash
mysql -u primeacademy_user -p'Prime@89' primeacademy_db < /tmp/fix_all.sql
```

**Should see:** `✅ All database fixes complete!`

---

## Step 3: Find Backend Directory

```bash
# Find backend directory
find / -type d -name "backend" 2>/dev/null | grep -i prime

# Or search for package.json
find / -name "package.json" 2>/dev/null | grep -i prime | head -1

# Note the path (e.g., /home/user/primeacademy/backend or /opt/primeacademy/backend)
```

---

## Step 4: Create Required Directories

```bash
# Navigate to backend (use actual path from Step 3)
cd /path/to/backend

# Create directories for certificates and receipts
mkdir -p certificates receipts

# Set permissions
chmod 755 certificates receipts

# Verify
ls -la certificates receipts
```

---

## Step 5: Install pdfmake Dependency

```bash
# Make sure you're in backend directory
cd /path/to/backend

# Install pdfmake
npm install pdfmake

# Verify installation
npm list pdfmake
```

---

## Step 6: Rebuild Backend (if needed)

```bash
# Check if build script exists
cat package.json | grep -A 5 "scripts"

# If build script exists, run it
npm run build

# If no build script, that's OK - TypeScript might compile on the fly
```

---

## Step 7: Restart Backend

```bash
# Restart with PM2
pm2 restart primeacademy-backend

# Check status
pm2 status

# Check logs for errors
pm2 logs primeacademy-backend --lines 50
```

---

## Step 8: Verify Everything Works

```bash
# Test backend health
curl http://localhost:3000/api/health

# Should return: {"status":"ok"}

# Check logs for any errors
pm2 logs primeacademy-backend --lines 20 | grep -i error
```

---

## Complete All-in-One Script

Run this complete script (replace `/path/to/backend` with actual path):

```bash
# 1. Create SQL file
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
SELECT '✅ All database fixes complete!' AS status;
ENDOFFILE

# 2. Execute SQL
echo "Executing SQL fixes..."
mysql -u primeacademy_user -p'Prime@89' primeacademy_db < /tmp/fix_all.sql

# 3. Find backend directory
BACKEND_DIR=$(find / -type d -name "backend" 2>/dev/null | grep -i prime | head -1)
if [ -z "$BACKEND_DIR" ]; then
  BACKEND_DIR=$(find / -name "package.json" 2>/dev/null | grep -i prime | head -1 | xargs dirname)
fi
echo "Backend directory: $BACKEND_DIR"

# 4. Create directories
cd "$BACKEND_DIR"
mkdir -p certificates receipts
chmod 755 certificates receipts
echo "✅ Directories created"

# 5. Install pdfmake
echo "Installing pdfmake..."
npm install pdfmake
echo "✅ pdfmake installed"

# 6. Restart backend
echo "Restarting backend..."
pm2 restart primeacademy-backend
sleep 3

# 7. Check status
echo "Checking status..."
pm2 status
pm2 logs primeacademy-backend --lines 20

echo "✅ All fixes complete! Test certificates and payments now."
```

---

## Verification

After running the script, verify:

```bash
# Check database columns were added
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SHOW COLUMNS FROM certificates WHERE Field LIKE '%declaration%';"
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SHOW COLUMNS FROM payment_transactions WHERE Field IN ('receiptUrl', 'paidAmount');"

# Check directories exist
ls -la /path/to/backend/certificates
ls -la /path/to/backend/receipts

# Check backend is running
pm2 status
curl http://localhost:3000/api/health
```

---

**After completing these steps, certificates and payments should work!** ✅


