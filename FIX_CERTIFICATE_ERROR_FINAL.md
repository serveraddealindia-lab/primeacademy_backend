# Fix Certificate Error - Final Solution

**Status from diagnostics:**
- ✅ Certificates directory exists with PDFs
- ✅ pdfmake installed
- ✅ Database columns exist
- ✅ Backend running
- ❌ Still getting certificate creation error

**Need to:** Check actual error in logs and fix

---

## Step 1: Check Exact Error in Logs

```bash
# View recent certificate creation errors
pm2 logs primeacademy-backend --lines 100 | grep -i -A 15 "certificate\|error\|exception\|failed"

# Or watch logs in real-time
pm2 logs primeacademy-backend --lines 0
```

**Then try creating a certificate in browser and watch for the error.**

---

## Step 2: Common Issues Based on Setup

Since everything is set up, the error is likely:

### Issue 1: Database Save Error After PDF Creation

The PDF is created (we see files in directory), but saving to database fails.

**Check:**
```bash
# Check if certificate record was created
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SELECT id, certificateNumber, pdfUrl FROM certificates ORDER BY id DESC LIMIT 5;"
```

**If records exist but error still shows:**
- The error might be in the response formatting
- Check logs for specific error message

### Issue 2: Path Mismatch

PDF saved to one location but URL points to another.

**Check:**
```bash
cd /var/www/primeacademy_backend

# Check what path is in database
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SELECT pdfUrl FROM certificates ORDER BY id DESC LIMIT 1;"

# Check if file exists at that path
ls -la certificates/
```

### Issue 3: Missing userId in req.user

The code uses `req.user.userId` - check if this exists.

**Check logs for:**
- "Cannot read property 'userId'"
- "req.user is undefined"

---

## Step 3: Fix SQL Syntax Error

The SQL script had an `EXIT` error. Use this corrected version:

```bash
mysql -u primeacademy_user -p'Prime@89' primeacademy_db << 'EOF'
SET @col1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationAccepted');
SET @sql1 = IF(@col1_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationAccepted BOOLEAN DEFAULT FALSE', 'SELECT "exists"');
PREPARE stmt1 FROM @sql1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;
SET @col2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'studentDeclarationDate');
SET @sql2 = IF(@col2_exists = 0, 'ALTER TABLE certificates ADD COLUMN studentDeclarationDate DATE NULL', 'SELECT "exists"');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
SELECT 'Database check complete' AS status;
EOF
```

(Note: Removed `EXIT;` - it's not needed in heredoc)

---

## Step 4: Test Certificate Creation

```bash
# Watch logs
pm2 logs primeacademy-backend --lines 0

# In browser, try creating a certificate
# Watch for the exact error message
```

---

## Step 5: Check Backend Code for Issues

```bash
cd /var/www/primeacademy_backend

# Check if code is up to date
git status

# Check certificate controller for issues
grep -n "req.user.userId\|issuedBy" src/controllers/certificate.controller.ts
```

---

## Step 6: Verify All Requirements

```bash
cd /var/www/primeacademy_backend

echo "=== Complete Check ==="
echo "1. Certificates directory:"
ls -la certificates | head -5

echo "2. pdfmake:"
npm list pdfmake

echo "3. Database columns:"
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SHOW COLUMNS FROM certificates WHERE Field LIKE '%declaration%';"

echo "4. Recent certificates:"
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SELECT id, certificateNumber, pdfUrl, createdAt FROM certificates ORDER BY id DESC LIMIT 3;"

echo "5. Backend status:"
pm2 status | grep primeacademy-backend

echo "6. Recent errors:"
pm2 logs primeacademy-backend --lines 50 | grep -i "error\|exception" | tail -10
```

---

## Most Likely Issue: Check Actual Error Message

Since everything is set up correctly, the error is likely:
1. **Database constraint violation** - Check logs for foreign key or unique constraint errors
2. **Missing userId** - Check if `req.user.userId` exists
3. **Response formatting error** - Error happens after database save during response

**Run this to see the exact error:**
```bash
pm2 logs primeacademy-backend --lines 100 | grep -i -B 5 -A 10 "certificate\|500\|error" | tail -30
```

---

**Share the exact error message from the logs and I can provide a specific fix!** 🔍


