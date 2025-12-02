# Fix Backend Not Responding on Port 3000

**Problem:** PM2 shows backend as "online" but `curl localhost:3000` fails  
**Cause:** Backend is crashing or not binding to port 3000

---

## Step 1: Check Backend Logs

```bash
# View recent logs (most important!)
pm2 logs primeacademy-backend --lines 100

# Or follow logs in real-time
pm2 logs primeacademy-backend
```

**Look for:**
- ❌ "Error: Cannot find module"
- ❌ "Database connection failed"
- ❌ "EADDRINUSE: address already in use"
- ❌ "Table 'student_orientations' doesn't exist"
- ❌ "Unknown column 'studentDeclarationAccepted'"
- ✅ "Server is running on port 3000" (this should appear if working)

---

## Step 2: Check if Port 3000 is in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Or
netstat -tlnp | grep 3000

# If something else is using it, kill it:
# kill -9 <PID>
```

---

## Step 3: Check if Backend File Exists

```bash
# Check if compiled backend exists
ls -la /var/www/primeacademy/backend/dist/index.js

# If missing, build it:
cd /var/www/primeacademy/backend
npm run build
```

---

## Step 4: Check Backend Configuration

```bash
cd /var/www/primeacademy/backend

# Check .env file exists
ls -la .env

# Check database credentials
cat .env | grep DB_

# Check PORT setting
cat .env | grep PORT
```

---

## Step 5: Common Fixes

### Fix 1: Database Connection Error

If logs show database errors, the SQL script might not have executed:

```bash
# Check if tables/columns exist
mysql -u primeacademy_user -p primeacademy_db -e "SHOW TABLES LIKE 'student_orientations';"
mysql -u primeacademy_user -p primeacademy_db -e "SHOW COLUMNS FROM certificates LIKE '%declaration%';"

# If missing, execute SQL again (see previous steps)
```

### Fix 2: Missing Dependencies

```bash
cd /var/www/primeacademy/backend

# Install dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart primeacademy-backend
```

### Fix 3: Backend Crashes Immediately

```bash
# Stop backend
pm2 stop primeacademy-backend

# Try running manually to see errors
cd /var/www/primeacademy/backend
node dist/index.js

# This will show errors directly in terminal
# Press Ctrl+C to stop
```

### Fix 4: Wrong Port or Configuration

```bash
# Check what port backend is trying to use
cd /var/www/primeacademy/backend
grep -r "PORT" .env dist/

# Check if backend is listening on different port
netstat -tlnp | grep node
```

### Fix 5: Restart Backend Properly

```bash
# Stop all backend processes
pm2 stop all

# Delete and restart
pm2 delete primeacademy-backend
cd /var/www/primeacademy/backend
pm2 start dist/index.js --name primeacademy-backend
pm2 save

# Check status
pm2 status
pm2 logs primeacademy-backend --lines 50
```

---

## Step 6: Verify Backend is Working

```bash
# Wait a few seconds for startup
sleep 5

# Test health endpoint
curl http://localhost:3000/api/health

# Should return: {"status":"ok"}
```

---

## Quick Diagnostic Commands

Run these to quickly diagnose:

```bash
# 1. Check logs
pm2 logs primeacademy-backend --lines 50 | tail -20

# 2. Check if file exists
ls -la /var/www/primeacademy/backend/dist/index.js

# 3. Check port
lsof -i :3000

# 4. Check database connection
cd /var/www/primeacademy/backend
mysql -u $(grep DB_USER .env | cut -d'=' -f2) -p$(grep DB_PASSWORD .env | cut -d'=' -f2) $(grep DB_NAME .env | cut -d'=' -f2) -e "SELECT 1;" 2>&1

# 5. Try manual start
cd /var/www/primeacademy/backend
node dist/index.js
```

---

## Most Common Issue: Database Tables Missing

If logs show "Table 'student_orientations' doesn't exist" or "Unknown column", you need to execute the SQL script:

```bash
# Connect to MySQL (use password from .env)
cd /var/www/primeacademy/backend
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
mysql -u primeacademy_user -p"$DB_PASS" primeacademy_db < /tmp/fix_db.sql

# Or use root
mysql -u root -p primeacademy_db < /tmp/fix_db.sql
```

---

**The most important step is checking the logs! Run `pm2 logs primeacademy-backend --lines 100` to see what's actually wrong.** 🔍


