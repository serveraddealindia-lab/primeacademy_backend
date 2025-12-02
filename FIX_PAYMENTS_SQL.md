# Fix Payments Not Working in Live - SQL Script

**Problem:** Payments working locally but not in live  
**Cause:** Missing `receiptUrl` column or other payment-related columns in database

---

## Step 1: Check Current Payment Table Structure

Connect to your VPS MySQL and check:

```bash
mysql -u primeacademy_user -p primeacademy_db
```

```sql
-- Check if receiptUrl column exists
SHOW COLUMNS FROM payment_transactions LIKE 'receiptUrl';

-- Check all columns
DESCRIBE payment_transactions;

-- Check status ENUM values
SHOW COLUMNS FROM payment_transactions WHERE Field = 'status';
```

---

## Step 2: Fix Missing Columns

If `receiptUrl` or other columns are missing, run this SQL:

```sql
USE primeacademy_db;

-- 1. Add receiptUrl column (if missing)
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_transactions' 
    AND COLUMN_NAME = 'receiptUrl'
);

SET @sql1 = IF(@col_exists = 0,
  'ALTER TABLE payment_transactions ADD COLUMN receiptUrl VARCHAR(255) NULL',
  'SELECT "receiptUrl column already exists" AS message'
);
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- 2. Add paidAmount column (if missing)
SET @col2_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_transactions' 
    AND COLUMN_NAME = 'paidAmount'
);

SET @sql2 = IF(@col2_exists = 0,
  'ALTER TABLE payment_transactions ADD COLUMN paidAmount DECIMAL(10,2) NOT NULL DEFAULT 0',
  'SELECT "paidAmount column already exists" AS message'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3. Add enrollmentId column (if missing)
SET @col3_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_transactions' 
    AND COLUMN_NAME = 'enrollmentId'
);

SET @sql3 = IF(@col3_exists = 0,
  'ALTER TABLE payment_transactions ADD COLUMN enrollmentId INT NULL, ADD FOREIGN KEY (enrollmentId) REFERENCES enrollments(id) ON UPDATE CASCADE ON DELETE SET NULL',
  'SELECT "enrollmentId column already exists" AS message'
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- 4. Add paymentMethod column (if missing)
SET @col4_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_transactions' 
    AND COLUMN_NAME = 'paymentMethod'
);

SET @sql4 = IF(@col4_exists = 0,
  'ALTER TABLE payment_transactions ADD COLUMN paymentMethod VARCHAR(255) NULL',
  'SELECT "paymentMethod column already exists" AS message'
);
PREPARE stmt4 FROM @sql4;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

-- 5. Add transactionId column (if missing)
SET @col5_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_transactions' 
    AND COLUMN_NAME = 'transactionId'
);

SET @sql5 = IF(@col5_exists = 0,
  'ALTER TABLE payment_transactions ADD COLUMN transactionId VARCHAR(255) NULL',
  'SELECT "transactionId column already exists" AS message'
);
PREPARE stmt5 FROM @sql5;
EXECUTE stmt5;
DEALLOCATE PREPARE stmt5;

-- 6. Add notes column (if missing)
SET @col6_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_transactions' 
    AND COLUMN_NAME = 'notes'
);

SET @sql6 = IF(@col6_exists = 0,
  'ALTER TABLE payment_transactions ADD COLUMN notes TEXT NULL',
  'SELECT "notes column already exists" AS message'
);
PREPARE stmt6 FROM @sql6;
EXECUTE stmt6;
DEALLOCATE PREPARE stmt6;

-- 7. Update status ENUM to include all values
ALTER TABLE payment_transactions 
MODIFY COLUMN status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending';

-- 8. Verify
SELECT 'Verification:' AS info;
SHOW COLUMNS FROM payment_transactions;

EXIT;
```

---

## Step 3: Create Receipts Directory

The backend needs a `receipts` directory to store PDF receipts:

```bash
# On VPS
cd /var/www/primeacademy/backend
mkdir -p receipts
chmod 755 receipts

# Verify it exists
ls -la receipts
```

---

## Step 4: Restart Backend

```bash
pm2 restart primeacademy-backend

# Check logs
pm2 logs primeacademy-backend --lines 50
```

---

## Quick All-in-One SQL Script

Save this as `/tmp/fix_payments.sql` and execute:

```sql
USE primeacademy_db;

-- Add receiptUrl
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS receiptUrl VARCHAR(255) NULL;

-- Add paidAmount
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS paidAmount DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add enrollmentId
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS enrollmentId INT NULL;
ALTER TABLE payment_transactions ADD FOREIGN KEY (enrollmentId) REFERENCES enrollments(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Add paymentMethod
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS paymentMethod VARCHAR(255) NULL;

-- Add transactionId
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS transactionId VARCHAR(255) NULL;

-- Add notes
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS notes TEXT NULL;

-- Update status ENUM
ALTER TABLE payment_transactions 
MODIFY COLUMN status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending';

-- Verify
SHOW COLUMNS FROM payment_transactions;
```

**Note:** If your MySQL version doesn't support `IF NOT EXISTS` in `ALTER TABLE`, use the dynamic SQL version above.

---

## Alternative: Simple SQL (May Show Errors if Columns Exist)

```sql
USE primeacademy_db;

-- Add columns (will error if already exist, that's OK)
ALTER TABLE payment_transactions ADD COLUMN receiptUrl VARCHAR(255) NULL;
ALTER TABLE payment_transactions ADD COLUMN paidAmount DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE payment_transactions ADD COLUMN enrollmentId INT NULL;
ALTER TABLE payment_transactions ADD COLUMN paymentMethod VARCHAR(255) NULL;
ALTER TABLE payment_transactions ADD COLUMN transactionId VARCHAR(255) NULL;
ALTER TABLE payment_transactions ADD COLUMN notes TEXT NULL;

-- Add foreign key for enrollmentId (if not exists)
ALTER TABLE payment_transactions 
ADD FOREIGN KEY (enrollmentId) REFERENCES enrollments(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Update status ENUM
ALTER TABLE payment_transactions 
MODIFY COLUMN status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending';
```

---

## Verification

After running SQL, verify:

```sql
-- Check all columns exist
DESCRIBE payment_transactions;

-- Should show:
-- receiptUrl
-- paidAmount
-- enrollmentId
-- paymentMethod
-- transactionId
-- notes
-- status (with all ENUM values)
```

---

**After completing these steps, payments should work in live!** ✅


