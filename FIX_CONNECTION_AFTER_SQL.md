# Fix Connection Issue After SQL Upload

**Problem:** "Unable to connect to server" after uploading SQL file  
**Cause:** SQL file was uploaded but not executed, OR backend crashed after SQL execution

---

## Step 1: Connect to Your VPS

```bash
ssh user@your-vps-ip
# Or
ssh root@your-vps-ip
```

---

## Step 2: Execute the SQL Script

**Important:** Just uploading the SQL file via WinSCP is NOT enough! You need to execute it in MySQL.

### Option A: Execute SQL File Directly

```bash
# Navigate to where you uploaded the SQL file
cd /path/to/uploaded/file

# Execute the SQL script
mysql -u primeacademy_user -p primeacademy_db < FIX_DATABASE_SAFE.sql
```

**Or if you uploaded it to a different location:**

```bash
# Find the file
find ~ -name "FIX_DATABASE_SAFE.sql" 2>/dev/null

# Execute it (replace path with actual path)
mysql -u primeacademy_user -p primeacademy_db < /path/to/FIX_DATABASE_SAFE.sql
```

### Option B: Execute SQL Manually

```bash
# Connect to MySQL
mysql -u primeacademy_user -p primeacademy_db
```

Then copy-paste the SQL commands from `FIX_DATABASE_SAFE.sql`:

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

-- Create student_orientations table (if missing)
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

-- Verify
SELECT 'Verification:' AS info;
SHOW COLUMNS FROM certificates WHERE Field LIKE '%declaration%';
SELECT COUNT(*) AS table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'student_orientations';

EXIT;
```

---

## Step 3: Check Backend Status

```bash
# Check if backend is running
pm2 status

# If backend is stopped or errored, check logs
pm2 logs primeacademy-backend --lines 50
```

---

## Step 4: Restart Backend

```bash
# Restart backend
pm2 restart primeacademy-backend

# Wait a few seconds, then check status
pm2 status

# Check logs for errors
pm2 logs primeacademy-backend --lines 50
```

---

## Step 5: Test Backend Connection

```bash
# Test if backend is responding
curl http://localhost:3000/api/health

# Should return: {"status":"ok"}
```

If this fails, the backend is not running properly.

---

## Step 6: Check Backend Logs for Errors

```bash
# View recent logs
pm2 logs primeacademy-backend --lines 100

# Look for:
# - Database connection errors
# - Missing table/column errors
# - Port already in use errors
```

---

## Common Issues and Fixes

### Issue 1: Backend Not Running

**Symptoms:** `pm2 status` shows backend as stopped or errored

**Fix:**
```bash
# Start backend
cd /var/www/primeacademy/backend
pm2 start dist/index.js --name primeacademy-backend
pm2 save

# Check logs
pm2 logs primeacademy-backend --lines 50
```

### Issue 2: Database Connection Error

**Symptoms:** Logs show "Unable to connect to database" or "Access denied"

**Fix:**
```bash
# Test database connection
mysql -u primeacademy_user -p primeacademy_db -e "SELECT 1;"

# If this fails, check .env file
cd /var/www/primeacademy/backend
cat .env | grep DB_

# Update .env if needed
nano .env
```

### Issue 3: Missing Table/Column Error

**Symptoms:** Logs show "Table 'student_orientations' doesn't exist" or "Unknown column"

**Fix:**
```bash
# Re-run the SQL script
mysql -u primeacademy_user -p primeacademy_db < FIX_DATABASE_SAFE.sql

# Or manually check and fix
mysql -u primeacademy_user -p primeacademy_db
```

```sql
-- Check if table exists
SHOW TABLES LIKE 'student_orientations';

-- Check if columns exist
SHOW COLUMNS FROM certificates LIKE '%declaration%';

-- If missing, add them manually (see Step 2)
```

### Issue 4: Port Already in Use

**Symptoms:** Logs show "EADDRINUSE: address already in use :::3000"

**Fix:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Restart backend
pm2 restart primeacademy-backend
```

### Issue 5: Nginx Not Proxying Correctly

**Symptoms:** Backend works on localhost:3000 but not via domain

**Fix:**
```bash
# Check Nginx configuration
sudo nano /etc/nginx/sites-available/primeacademy

# Make sure this exists:
# location /api {
#     proxy_pass http://localhost:3000;
#     ...
# }

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Quick Diagnostic Commands

Run these to quickly diagnose the issue:

```bash
# 1. Check backend status
pm2 status

# 2. Check backend logs
pm2 logs primeacademy-backend --lines 20

# 3. Test backend locally
curl http://localhost:3000/api/health

# 4. Test database connection
mysql -u primeacademy_user -p primeacademy_db -e "SELECT 1;"

# 5. Check if SQL was executed
mysql -u primeacademy_user -p primeacademy_db -e "SHOW TABLES LIKE 'student_orientations';"
mysql -u primeacademy_user -p primeacademy_db -e "SHOW COLUMNS FROM certificates LIKE '%declaration%';"

# 6. Check Nginx status
sudo systemctl status nginx

# 7. Check if port 3000 is listening
netstat -tlnp | grep 3000
```

---

## Complete Fix Workflow

```bash
# 1. Connect to VPS
ssh user@your-vps-ip

# 2. Navigate to backend
cd /var/www/primeacademy/backend

# 3. Execute SQL (if not done)
mysql -u primeacademy_user -p primeacademy_db < /path/to/FIX_DATABASE_SAFE.sql

# 4. Verify SQL executed
mysql -u primeacademy_user -p primeacademy_db -e "SHOW TABLES LIKE 'student_orientations';"

# 5. Check backend status
pm2 status

# 6. Restart backend
pm2 restart primeacademy-backend

# 7. Check logs
pm2 logs primeacademy-backend --lines 50

# 8. Test backend
curl http://localhost:3000/api/health

# 9. If backend works, test from browser
# Open: https://crm.prashantthakar.com
```

---

## If Still Not Working

1. **Check backend logs for specific errors:**
   ```bash
   pm2 logs primeacademy-backend --lines 100 | grep -i error
   ```

2. **Verify database credentials in .env:**
   ```bash
   cd /var/www/primeacademy/backend
   cat .env | grep DB_
   ```

3. **Check if backend code is up to date:**
   ```bash
   cd /var/www/primeacademy/backend
   git status
   git pull origin main
   npm run build
   pm2 restart primeacademy-backend
   ```

4. **Check firewall:**
   ```bash
   sudo ufw status
   # Port 3000 should be open or backend should be behind Nginx
   ```

---

**After completing these steps, your site should be connected!** ✅


