# Diagnose Certificate Creation Error

**Problem:** Internal server error while creating certificate even after SQL update  
**Need to check:** Multiple possible causes

---

## Step 1: Check Backend Logs for Exact Error

```bash
# View recent certificate errors
pm2 logs primeacademy-backend --lines 100 | grep -i -A 5 -B 5 "certificate\|error\|exception"

# Or view all recent logs
pm2 logs primeacademy-backend --lines 100
```

**Look for specific error messages like:**
- "Cannot find module 'pdfmake'"
- "ENOENT: no such file or directory"
- "Permission denied"
- "Unknown column"
- "Table doesn't exist"

---

## Step 2: Verify Database Columns Exist

```bash
mysql -u primeacademy_user -p'Prime@89' primeacademy_db << 'EOF'
-- Check certificates table columns
SHOW COLUMNS FROM certificates WHERE Field LIKE '%declaration%';

-- Check all certificates columns
DESCRIBE certificates;

-- Check if table exists
SHOW TABLES LIKE 'certificates';
EXIT;
EOF
```

**Should see:**
- `studentDeclarationAccepted`
- `studentDeclarationDate`

---

## Step 3: Verify Certificates Directory Exists and Has Permissions

```bash
cd /var/www/primeacademy_backend

# Check if directory exists
ls -la certificates

# If missing, create it
mkdir -p certificates
chmod 755 certificates

# Check permissions
stat certificates

# Test write access
touch certificates/test.txt && rm certificates/test.txt && echo "✅ Write access works" || echo "❌ No write access"
```

---

## Step 4: Check if pdfmake is Installed

```bash
cd /var/www/primeacademy_backend

# Check if pdfmake is installed
npm list pdfmake

# If not installed or error, install it
npm install pdfmake

# Verify installation
npm list pdfmake
```

---

## Step 5: Check Backend Code Paths

```bash
cd /var/www/primeacademy_backend

# Check certificate controller for path issues
grep -n "certificatesDir\|certificates" src/controllers/certificate.controller.ts | head -10

# Check index.ts for static serving path
grep -n "certificates" src/index.ts | grep -i static
```

---

## Step 6: Test Certificate Creation Manually

```bash
# Check if backend is running
pm2 status

# Test health endpoint
curl http://localhost:3000/api/health

# Try to see what error occurs (check logs in real-time)
pm2 logs primeacademy-backend --lines 0
```

Then try creating a certificate in the browser and watch the logs.

---

## Common Issues and Fixes

### Issue 1: Missing pdfmake

**Error:** `Cannot find module 'pdfmake'`

**Fix:**
```bash
cd /var/www/primeacademy_backend
npm install pdfmake
npm run build  # If build script exists
pm2 restart primeacademy-backend
```

### Issue 2: Certificates Directory Missing

**Error:** `ENOENT: no such file or directory`

**Fix:**
```bash
cd /var/www/primeacademy_backend
mkdir -p certificates
chmod 755 certificates
pm2 restart primeacademy-backend
```

### Issue 3: Permission Denied

**Error:** `Permission denied` or `EACCES`

**Fix:**
```bash
cd /var/www/primeacademy_backend
chmod 755 certificates
chown -R $(whoami) certificates
pm2 restart primeacademy-backend
```

### Issue 4: Missing Database Columns

**Error:** `Unknown column 'studentDeclarationAccepted'`

**Fix:**
```bash
# Run SQL fix again
mysql -u primeacademy_user -p'Prime@89' primeacademy_db < /tmp/fix_all.sql
```

### Issue 5: Path Mismatch

**Error:** Files saved in one location but served from another

**Fix:**
```bash
# Check where files are saved vs served
cd /var/www/primeacademy_backend
grep -r "certificatesDir\|certificates" src/controllers/certificate.controller.ts
grep -r "certificates" src/index.ts | grep static

# Create symlink if paths differ
ln -sf /var/www/primeacademy_backend/certificates /var/www/certificates
```

### Issue 6: TypeScript Not Compiled

**Error:** Code changes not reflected

**Fix:**
```bash
cd /var/www/primeacademy_backend
npm run build
pm2 restart primeacademy-backend
```

---

## Complete Diagnostic Script

Run this to check everything:

```bash
cd /var/www/primeacademy_backend

echo "=== 1. Checking certificates directory ==="
ls -la certificates 2>/dev/null || echo "❌ Directory missing"
test -w certificates && echo "✅ Writeable" || echo "❌ Not writeable"

echo "=== 2. Checking pdfmake ==="
npm list pdfmake 2>/dev/null && echo "✅ Installed" || echo "❌ Not installed"

echo "=== 3. Checking database columns ==="
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SHOW COLUMNS FROM certificates WHERE Field LIKE '%declaration%';" 2>/dev/null && echo "✅ Columns exist" || echo "❌ Columns missing"

echo "=== 4. Checking backend status ==="
pm2 status | grep primeacademy-backend

echo "=== 5. Recent errors ==="
pm2 logs primeacademy-backend --lines 50 | grep -i "error\|exception\|certificate" | tail -10
```

---

## Complete Fix Script

Run this to fix all common issues:

```bash
cd /var/www/primeacademy_backend

# 1. Create directories
mkdir -p certificates receipts
chmod 755 certificates receipts

# 2. Install pdfmake
npm install pdfmake

# 3. Verify database columns
mysql -u primeacademy_user -p'Prime@89' primeacademy_db << 'EOF'
SET @col1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationAccepted');
SET @sql1 = IF(@col1_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE', 'SELECT "exists"');
PREPARE stmt1 FROM @sql1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;
SET @col2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationDate');
SET @sql2 = IF(@col2_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationDate DATE NULL', 'SELECT "exists"');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
SELECT 'Database check complete' AS status;
EXIT;
EOF

# 4. Rebuild if needed
npm run build 2>/dev/null || echo "No build script"

# 5. Restart backend
pm2 restart primeacademy-backend

# 6. Check logs
sleep 3
echo "=== Recent logs ==="
pm2 logs primeacademy-backend --lines 30 | tail -20
```

---

## Most Important: Check Actual Error in Logs

The most important step is to see the actual error:

```bash
# Watch logs in real-time
pm2 logs primeacademy-backend --lines 0

# Then try creating a certificate in browser
# The error will show in the logs
```

**Share the exact error message from the logs and I can provide a specific fix!**

---

**Run the diagnostic script first to identify the exact issue!** 🔍


