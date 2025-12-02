# 🔧 Fix: SQL Updates + Frontend Design Not Showing

## 🎯 Two Issues to Fix

1. **New SQL not uploaded** → Backend database needs updates
2. **New design not showing in live** → Frontend not deployed properly

---

## 🔧 Part 1: Upload New SQL to Database

### Step 1: Check What SQL Files Need to Be Run

```bash
cd /var/www/primeacademy_backend
ls -la *.sql
```

**Look for SQL files that need to be executed.**

### Step 2: Connect to MySQL

```bash
mysql -u root -p
```

**Enter your MySQL root password when prompted.**

### Step 3: Select Database

```sql
USE primeacademy_db;
-- Or whatever your database name is
```

**Check database name in `.env` file:**
```bash
cd /var/www/primeacademy_backend
cat .env | grep DB_NAME
```

### Step 4: Run SQL File

**Option A: From MySQL Command Line**

```sql
source /var/www/primeacademy_backend/your_sql_file.sql;
```

**Option B: From Terminal**

```bash
mysql -u root -p primeacademy_db < /var/www/primeacademy_backend/your_sql_file.sql
```

**Replace `your_sql_file.sql` with actual SQL file name.**

### Step 5: Verify SQL Executed

```sql
-- Check if tables/columns were created/updated
SHOW TABLES;
DESCRIBE table_name;
```

---

## 🚀 Part 2: Deploy New Frontend Design

### Step 1: Pull Latest Frontend Code

```bash
cd /var/www/primeacademy_frontend
git pull origin main
```

**Check if new code was pulled:**
```bash
git log -1 --oneline
```

### Step 2: Remove Old Build

```bash
rm -rf dist node_modules .vite
```

**This ensures a clean rebuild.**

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Build New Frontend

```bash
npm run build
```

**Wait for build to complete (should show "✓ built in X.XXs").**

### Step 5: Fix Permissions

```bash
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist
```

### Step 6: Verify Build Files

```bash
ls -lth dist/assets/ | head -5
```

**Should show recent files (just now).**

### Step 7: Restart Nginx

```bash
sudo systemctl restart nginx
```

---

## 🔧 Part 3: Ensure Cache Headers Are Working

### Step 1: Check Cache Headers in Config

```bash
sudo grep -A 5 "location /" /etc/nginx/sites-available/crm.prashantthakar.com | grep "add_header"
```

**Should show 3 lines with `always` keyword.**

### Step 2: If Missing, Add Cache Headers

```bash
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

**Find `location /` block and add:**
```nginx
location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;
    try_files $uri $uri/ /index.html;
}
```

**Save and restart:**
```bash
sudo nginx -t && sudo systemctl restart nginx
```

### Step 3: Verify Headers

```bash
curl -I https://crm.prashantthakar.com | grep -i cache
```

**Should show cache headers.**

---

## 🚀 Complete Deployment Sequence

### Backend SQL Update

```bash
# 1. Navigate to backend
cd /var/www/primeacademy_backend

# 2. Check SQL files
ls -la *.sql

# 3. Run SQL (replace with actual file name)
mysql -u root -p primeacademy_db < your_sql_file.sql

# 4. Or connect to MySQL and run:
# mysql -u root -p
# USE primeacademy_db;
# source /var/www/primeacademy_backend/your_sql_file.sql;
```

### Frontend Deployment

```bash
# 1. Navigate to frontend
cd /var/www/primeacademy_frontend

# 2. Pull latest code
git pull origin main

# 3. Clean rebuild
rm -rf dist node_modules .vite
npm install
npm run build

# 4. Fix permissions
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist

# 5. Restart Nginx
sudo systemctl restart nginx

# 6. Verify
ls -lth dist/assets/ | head -3
curl -I https://crm.prashantthakar.com | grep Cache-Control
```

---

## 🔍 Verification Checklist

### SQL Update
- [ ] SQL file exists in backend directory ✅
- [ ] Connected to MySQL ✅
- [ ] Database selected ✅
- [ ] SQL executed successfully ✅
- [ ] Tables/columns updated ✅

### Frontend Deployment
- [ ] Latest code pulled from GitHub ✅
- [ ] Old build removed ✅
- [ ] New build completed ✅
- [ ] Permissions fixed ✅
- [ ] Nginx restarted ✅
- [ ] Build files are recent ✅
- [ ] Cache headers configured ✅
- [ ] Cache headers in HTTP response ✅

### Browser Test
- [ ] Browser cache cleared ✅
- [ ] Tested in incognito/private window ✅
- [ ] New design visible ✅
- [ ] New features working ✅

---

## 🔥 Quick Fix Commands (Copy-Paste)

### SQL Update
```bash
cd /var/www/primeacademy_backend && \
mysql -u root -p primeacademy_db < your_sql_file.sql
# Enter password when prompted
```

### Frontend Deployment
```bash
cd /var/www/primeacademy_frontend && \
git pull origin main && \
rm -rf dist node_modules .vite && \
npm install && \
npm run build && \
sudo chown -R www-data:www-data dist && \
sudo chmod -R 755 dist && \
sudo systemctl restart nginx && \
ls -lth dist/assets/ | head -3
```

---

## 🔍 Troubleshooting

### SQL Not Executing

```bash
# Check MySQL is running
sudo systemctl status mysql

# Check database exists
mysql -u root -p -e "SHOW DATABASES;"

# Check SQL file syntax
mysql -u root -p primeacademy_db < your_sql_file.sql 2>&1 | head -20
```

### Frontend Design Still Old

```bash
# Check build timestamp
ls -lth /var/www/primeacademy_frontend/dist/assets/ | head -3

# Check what Nginx is serving
curl -I https://crm.prashantthakar.com | grep Last-Modified

# Check cache headers
curl -I https://crm.prashantthakar.com | grep Cache-Control

# Force rebuild
cd /var/www/primeacademy_frontend
rm -rf dist node_modules .vite
npm cache clean --force
npm install
npm run build
sudo chown -R www-data:www-data dist
sudo systemctl restart nginx
```

### Browser Still Shows Old Design

1. **Clear browser cache completely:**
   - Chrome/Edge: `Ctrl+Shift+Delete` → Select "Cached images and files" → Clear
   - Or use Incognito/Private window

2. **Hard refresh:**
   - `Ctrl+F5` or `Ctrl+Shift+R`

3. **Check DevTools:**
   - Open DevTools (F12) → Network tab → Reload
   - Check if new JS/CSS files are loaded
   - Check file timestamps

---

## 📋 Summary

**Two issues to fix:**

1. **SQL Update:**
   - Connect to MySQL
   - Run SQL file: `mysql -u root -p database_name < sql_file.sql`
   - Verify tables/columns updated

2. **Frontend Deployment:**
   - Pull latest code
   - Clean rebuild: `rm -rf dist node_modules .vite && npm install && npm run build`
   - Fix permissions
   - Restart Nginx
   - Verify cache headers
   - Clear browser cache

**After this, both SQL and new design should be live!** ✅




