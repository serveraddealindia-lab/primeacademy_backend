# Quick Fix: Connection Issue After SQL Upload

**Problem:** Site shows "Unable to connect to server" after uploading SQL file  
**Solution:** Execute SQL file and restart backend

---

## ⚡ Quick Steps (5 minutes)

### Step 1: Connect to VPS via SSH
```bash
ssh user@your-vps-ip
```

### Step 2: Find and Execute SQL File
```bash
# Find where you uploaded the SQL file
find ~ -name "FIX_DATABASE_SAFE.sql" 2>/dev/null

# Execute it (replace path with actual path from above)
mysql -u primeacademy_user -p primeacademy_db < /path/to/FIX_DATABASE_SAFE.sql

# Enter your MySQL password when prompted
```

**If you don't know where the file is:**
```bash
# Check common upload locations
ls -la ~/FIX_DATABASE_SAFE.sql
ls -la /tmp/FIX_DATABASE_SAFE.sql
ls -la /var/www/primeacademy/FIX_DATABASE_SAFE.sql

# Or upload it again to a known location
# Then execute:
mysql -u primeacademy_user -p primeacademy_db < ~/FIX_DATABASE_SAFE.sql
```

### Step 3: Verify SQL Executed
```bash
# Check if table was created
mysql -u primeacademy_user -p primeacademy_db -e "SHOW TABLES LIKE 'student_orientations';"

# Check if columns were added
mysql -u primeacademy_user -p primeacademy_db -e "SHOW COLUMNS FROM certificates LIKE '%declaration%';"
```

### Step 4: Restart Backend
```bash
# Check backend status
pm2 status

# Restart backend
pm2 restart primeacademy-backend

# Check if it's running
pm2 status
```

### Step 5: Test Connection
```bash
# Test backend locally
curl http://localhost:3000/api/health

# Should return: {"status":"ok"}
```

### Step 6: Test in Browser
Open: `https://crm.prashantthakar.com`

---

## 🔧 If Backend Won't Start

### Check Logs:
```bash
pm2 logs primeacademy-backend --lines 50
```

### Common Fixes:

**1. Backend crashed due to missing tables:**
```bash
# Re-run SQL
mysql -u primeacademy_user -p primeacademy_db < FIX_DATABASE_SAFE.sql

# Restart
pm2 restart primeacademy-backend
```

**2. Database connection error:**
```bash
# Test database connection
mysql -u primeacademy_user -p primeacademy_db -e "SELECT 1;"

# If fails, check .env file
cd /var/www/primeacademy/backend
cat .env | grep DB_
```

**3. Backend not found:**
```bash
# Navigate to backend
cd /var/www/primeacademy/backend

# Start backend
pm2 start dist/index.js --name primeacademy-backend
pm2 save
```

---

## 📋 All-in-One Command

If you know the SQL file path, run this:

```bash
# Execute SQL and restart backend
mysql -u primeacademy_user -p primeacademy_db < /path/to/FIX_DATABASE_SAFE.sql && \
pm2 restart primeacademy-backend && \
sleep 3 && \
curl http://localhost:3000/api/health
```

---

## ✅ Verification Checklist

- [ ] SQL file executed successfully
- [ ] `student_orientations` table exists
- [ ] Declaration columns exist in `certificates` table
- [ ] Backend is running (`pm2 status` shows "online")
- [ ] Backend responds to health check
- [ ] Site loads in browser

---

**After these steps, your site should be connected!** 🎉


