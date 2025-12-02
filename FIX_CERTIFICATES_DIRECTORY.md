# Fix Certificates Directory Issue

**Problem from logs:**
- Backend at: `/var/www/primeacademy_backend`
- Certificates serving from: `/var/www/certificates`
- Warning: `No PDF files found in certificates directory`
- Certificate creation failing with 500 error

---

## Step 1: Create Certificates Directory in Correct Location

```bash
# Backend is at /var/www/primeacademy_backend
cd /var/www/primeacademy_backend

# Create certificates directory
mkdir -p certificates

# Set permissions
chmod 755 certificates

# Verify
ls -la certificates
```

---

## Step 2: Check Backend Configuration

The logs show certificates are being served from `/var/www/certificates` but should be in `/var/www/primeacademy_backend/certificates`. Let's check the backend code:

```bash
cd /var/www/primeacademy_backend

# Check where certificates directory is configured
grep -r "certificates" src/index.ts | grep -i path
grep -r "certificatesDir" src/controllers/certificate.controller.ts
```

---

## Step 3: Create Directory in Both Locations (Temporary Fix)

```bash
# Create in backend directory (where files are saved)
mkdir -p /var/www/primeacademy_backend/certificates
chmod 755 /var/www/primeacademy_backend/certificates

# Create in serving location (if different)
mkdir -p /var/www/certificates
chmod 755 /var/www/certificates

# Create symlink if needed
ln -sf /var/www/primeacademy_backend/certificates /var/www/certificates
```

---

## Step 4: Verify Directories

```bash
# Check both locations
ls -la /var/www/primeacademy_backend/certificates
ls -la /var/www/certificates

# Check permissions
stat /var/www/primeacademy_backend/certificates
```

---

## Step 5: Restart Backend

```bash
pm2 restart primeacademy-backend

# Check logs
pm2 logs primeacademy-backend --lines 30
```

---

## Step 6: Test Certificate Creation

Try creating a certificate again and check:

```bash
# Watch logs in real-time
pm2 logs primeacademy-backend --lines 0

# In another terminal, try creating certificate via browser
# Then check if file was created:
ls -la /var/www/primeacademy_backend/certificates/
ls -la /var/www/certificates/
```

---

## Complete Fix Script

Run this complete script:

```bash
# 1. Create certificates directory in backend
cd /var/www/primeacademy_backend
mkdir -p certificates receipts
chmod 755 certificates receipts

# 2. Create in serving location (if different)
mkdir -p /var/www/certificates
chmod 755 /var/www/certificates

# 3. Create symlink to ensure both point to same location
ln -sf /var/www/primeacademy_backend/certificates /var/www/certificates 2>/dev/null || echo "Symlink may already exist"

# 4. Verify
echo "Backend certificates directory:"
ls -la /var/www/primeacademy_backend/certificates

echo "Serving certificates directory:"
ls -la /var/www/certificates

# 5. Restart backend
pm2 restart primeacademy-backend

# 6. Check logs
sleep 3
pm2 logs primeacademy-backend --lines 20 | grep -i certificate
```

---

## If Still Failing - Check Backend Code

The issue might be in the backend code path configuration. Check:

```bash
cd /var/www/primeacademy_backend

# Check certificate controller
grep -n "certificatesDir\|certificates" src/controllers/certificate.controller.ts | head -5

# Check index.ts for static serving
grep -n "certificates" src/index.ts | grep -i static
```

---

## Alternative: Fix Path in Backend Code

If the paths are hardcoded incorrectly, you may need to update the backend code. But first, try creating the directories as shown above.

---

**After creating the directories and restarting, certificates should work!** ✅


