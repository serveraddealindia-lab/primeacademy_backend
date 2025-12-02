# Fix Certificate Creation and Download Issues

**Problem:** Internal server error while creating certificate and downloading  
**Causes:** 
1. Missing `studentDeclarationAccepted` and `studentDeclarationDate` columns
2. Missing `certificates` directory for PDF storage
3. PDF generation library issues

---

## Step 1: Check Current Certificate Table Structure

```bash
mysql -u primeacademy_user -p primeacademy_db
```

```sql
-- Check if declaration columns exist
SHOW COLUMNS FROM certificates LIKE '%declaration%';

-- Check all columns
DESCRIBE certificates;
```

---

## Step 2: Add Missing Declaration Columns

If columns are missing, run this SQL:

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

-- Verify
SELECT 'Verification:' AS info;
SHOW COLUMNS FROM certificates WHERE Field LIKE '%declaration%';

EXIT;
```

---

## Step 3: Create Certificates Directory

The backend needs a `certificates` directory to store PDF files:

```bash
# On VPS
cd /var/www/primeacademy/backend
mkdir -p certificates
chmod 755 certificates

# Verify it exists
ls -la certificates
```

---

## Step 4: Check Backend Logs

Check what specific error is occurring:

```bash
# View recent certificate-related errors
pm2 logs primeacademy-backend --lines 100 | grep -i certificate

# Or view all recent logs
pm2 logs primeacademy-backend --lines 100
```

**Common errors to look for:**
- "Unknown column 'studentDeclarationAccepted'"
- "Cannot find module 'pdfmake'"
- "ENOENT: no such file or directory" (certificates directory missing)
- "Permission denied" (certificates directory not writable)

---

## Step 5: Install/Verify pdfmake Dependency

```bash
cd /var/www/primeacademy/backend

# Check if pdfmake is installed
npm list pdfmake

# If not installed, install it
npm install pdfmake

# Rebuild
npm run build

# Restart backend
pm2 restart primeacademy-backend
```

---

## Step 6: Verify File Permissions

```bash
# Check certificates directory permissions
ls -la /var/www/primeacademy/backend/certificates

# Set correct permissions
chmod 755 /var/www/primeacademy/backend/certificates

# Make sure backend user can write
chown -R $(whoami) /var/www/primeacademy/backend/certificates
```

---

## Complete SQL Fix Script

Save this as `/tmp/fix_certificates.sql`:

```sql
USE primeacademy_db;

-- Add studentDeclarationAccepted column
SET @col1_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificates' 
    AND COLUMN_NAME = 'studentDeclarationAccepted'
);

SET @sql1 = IF(@col1_exists = 0,
  'ALTER TABLE certificates ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE',
  'SELECT "exists" AS msg'
);
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- Add studentDeclarationDate column
SET @col2_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certificates' 
    AND COLUMN_NAME = 'studentDeclarationDate'
);

SET @sql2 = IF(@col2_exists = 0,
  'ALTER TABLE certificates ADD COLUMN studentDeclarationDate DATE NULL',
  'SELECT "exists" AS msg'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Verify
SHOW COLUMNS FROM certificates WHERE Field LIKE '%declaration%';
```

Execute:
```bash
mysql -u primeacademy_user -p primeacademy_db < /tmp/fix_certificates.sql
```

---

## Quick All-in-One Fix

Run these commands on your VPS:

```bash
# 1. Create SQL file
cat > /tmp/fix_certificates.sql << 'EOF'
USE primeacademy_db;
SET @col1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationAccepted');
SET @sql1 = IF(@col1_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE', 'SELECT "exists"');
PREPARE stmt1 FROM @sql1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;
SET @col2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationDate');
SET @sql2 = IF(@col2_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationDate DATE NULL', 'SELECT "exists"');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
EOF

# 2. Execute SQL (use password from .env)
cd /var/www/primeacademy/backend
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
mysql -u primeacademy_user -p"$DB_PASS" primeacademy_db < /tmp/fix_certificates.sql

# 3. Create certificates directory
mkdir -p certificates
chmod 755 certificates

# 4. Verify pdfmake is installed
npm list pdfmake || npm install pdfmake

# 5. Rebuild and restart
npm run build
pm2 restart primeacademy-backend

# 6. Check logs
pm2 logs primeacademy-backend --lines 50
```

---

## Troubleshooting

### Error: "Unknown column 'studentDeclarationAccepted'"
- **Solution:** Run the SQL script above to add the column

### Error: "Cannot find module 'pdfmake'"
- **Solution:** `cd /var/www/primeacademy/backend && npm install pdfmake && npm run build && pm2 restart primeacademy-backend`

### Error: "ENOENT: no such file or directory"
- **Solution:** `mkdir -p /var/www/primeacademy/backend/certificates && chmod 755 /var/www/primeacademy/backend/certificates`

### Error: "Permission denied"
- **Solution:** `chmod 755 /var/www/primeacademy/backend/certificates && chown -R $(whoami) /var/www/primeacademy/backend/certificates`

### PDF Generation Fails Silently
- **Check logs:** `pm2 logs primeacademy-backend --lines 100 | grep -i pdf`
- **Check directory:** `ls -la /var/www/primeacademy/backend/certificates`
- **Test manually:** Try creating a certificate and watch logs in real-time

---

**After completing these steps, certificate creation and download should work!** ✅


