# Fix Old Frontend Code Showing on VPS

## 🔴 Problem
- Frontend shows old code even after hard refresh in incognito
- This means the issue is on the server, not browser cache

---

## ✅ Step-by-Step Fix

### Step 1: Verify Build Actually Happened

```bash
cd /var/www/primeacademy_frontend

# Check if dist folder exists and has recent files
ls -la dist/

# Check modification time of files
ls -lth dist/assets/ | head -5

# Files should have current timestamp (today's date/time)
```

### Step 2: Check What's Actually in dist/

```bash
# Check index.html modification time
ls -l dist/index.html

# Check if assets are new
ls -lth dist/assets/ | head -10

# If files are old, rebuild is needed
```

### Step 3: Force Rebuild Frontend

```bash
cd /var/www/primeacademy_frontend

# Remove old build completely
rm -rf dist

# Remove node_modules to ensure clean install
rm -rf node_modules

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
npm install

# Build again
npm run build

# Verify new build
ls -lth dist/assets/ | head -5
# Files should show current timestamp
```

### Step 4: Verify Nginx is Serving Correct Directory

```bash
# Check nginx configuration
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com | grep -A 5 "server_name"

# OR if using default config
sudo cat /etc/nginx/sites-available/default | grep -A 5 "server_name"

# Look for the "root" directive - should point to dist folder
sudo grep -r "root.*primeacademy_frontend" /etc/nginx/sites-available/

# Should show something like:
# root /var/www/primeacademy_frontend/dist;
```

### Step 5: Check Nginx Root Directory

```bash
# Find which config file serves crm.prashantthakar.com
sudo grep -r "crm.prashantthakar.com" /etc/nginx/sites-available/

# Check the root path in that config
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
# OR
sudo nano /etc/nginx/sites-available/default
```

**Make sure it has:**
```nginx
server {
    listen 80;
    server_name crm.prashantthakar.com;

    root /var/www/primeacademy_frontend/dist;  # ← Check this path
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Step 6: Clear Nginx Cache and Restart

```bash
# Test nginx configuration
sudo nginx -t

# If test passes, restart nginx (not just reload)
sudo systemctl restart nginx

# Check nginx status
sudo systemctl status nginx

# Check nginx error logs
sudo tail -20 /var/log/nginx/error.log
```

### Step 7: Verify Files Are Actually New

```bash
# Check when dist files were last modified
cd /var/www/primeacademy_frontend
stat dist/index.html

# Check a specific asset file
stat dist/assets/index-*.js | head -1

# These should show today's date/time
```

### Step 8: Check File Permissions

```bash
# Check permissions on dist folder
ls -la dist/

# Make sure nginx can read files
sudo chown -R www-data:www-data /var/www/primeacademy_frontend/dist
sudo chmod -R 755 /var/www/primeacademy_frontend/dist
```

---

## 🔧 Complete Fix Sequence

Run these commands in order:

```bash
# 1. Go to frontend directory
cd /var/www/primeacademy_frontend

# 2. Check current build time
echo "Current build files:"
ls -lth dist/assets/ | head -3

# 3. Remove old build
echo "Removing old build..."
rm -rf dist

# 4. Clean install
echo "Cleaning and reinstalling..."
rm -rf node_modules
npm cache clean --force
npm install

# 5. Build fresh
echo "Building frontend..."
npm run build

# 6. Verify new build
echo "New build files:"
ls -lth dist/assets/ | head -3

# 7. Check nginx config
echo "Checking nginx config..."
sudo grep -r "root.*primeacademy_frontend" /etc/nginx/sites-available/

# 8. Restart nginx
echo "Restarting nginx..."
sudo nginx -t && sudo systemctl restart nginx

# 9. Verify nginx is running
sudo systemctl status nginx | head -5
```

---

## 🐛 Common Issues

### Issue 1: Build Files Are Old
**Solution:**
```bash
# Check if build actually ran
cd /var/www/primeacademy_frontend
npm run build

# Watch for errors during build
# If build completes but files are old, check:
# - Is there a build cache?
# - Are you in the right directory?
```

### Issue 2: Nginx Serving Wrong Directory
**Solution:**
```bash
# Find nginx config
sudo grep -r "crm.prashantthakar.com" /etc/nginx/sites-available/

# Edit the config file
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com

# Make sure root points to dist:
# root /var/www/primeacademy_frontend/dist;

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

### Issue 3: Nginx Cache
**Solution:**
```bash
# Restart nginx (not just reload)
sudo systemctl restart nginx

# Clear any proxy cache if configured
sudo rm -rf /var/cache/nginx/*

# Restart again
sudo systemctl restart nginx
```

### Issue 4: Multiple Nginx Configs
**Solution:**
```bash
# Check all enabled sites
ls -la /etc/nginx/sites-enabled/

# Check which one is active
sudo nginx -T | grep -A 10 "crm.prashantthakar.com"

# Make sure only one config serves the domain
```

### Issue 5: Build Not Completing
**Solution:**
```bash
# Run build with verbose output
cd /var/www/primeacademy_frontend
npm run build 2>&1 | tee build.log

# Check for errors
cat build.log | grep -i error

# If errors found, fix them and rebuild
```

---

## ✅ Verification Steps

After fixing, verify:

```bash
# 1. Check build files are new
cd /var/www/primeacademy_frontend
ls -lth dist/assets/ | head -3
# Should show today's date/time

# 2. Check nginx is serving correct directory
curl -I https://crm.prashantthakar.com | head -5

# 3. Check file content (should be new)
curl https://crm.prashantthakar.com | head -20
# Look for new code/features

# 4. Check browser (after server fix)
# Visit: https://crm.prashantthakar.com
# Hard refresh: Ctrl+F5
# Should see new code
```

---

## 🎯 Quick Diagnostic Script

Run this to diagnose:

```bash
#!/bin/bash
echo "=== Frontend Build Check ==="
cd /var/www/primeacademy_frontend
echo "Build files timestamp:"
ls -lth dist/assets/ 2>/dev/null | head -3 || echo "No dist/assets found"

echo ""
echo "=== Nginx Config Check ==="
echo "Nginx root directory:"
sudo grep -r "root.*primeacademy_frontend" /etc/nginx/sites-available/ 2>/dev/null

echo ""
echo "=== Nginx Status ==="
sudo systemctl status nginx | head -5

echo ""
echo "=== File Permissions ==="
ls -la dist/ | head -5
```

Save as `check-frontend.sh`, make executable: `chmod +x check-frontend.sh`, run: `./check-frontend.sh`

---

## 📝 Most Likely Solution

The most common issue is that nginx is serving from the wrong directory or the build didn't actually update. Run this:

```bash
cd /var/www/primeacademy_frontend

# Force complete rebuild
rm -rf dist node_modules
npm install
npm run build

# Verify new files
ls -lth dist/assets/ | head -3

# Check nginx config
sudo grep -r "root.*primeacademy_frontend" /etc/nginx/sites-available/

# Restart nginx (not reload)
sudo systemctl restart nginx

# Test
curl -I https://crm.prashantthakar.com
```

Then test in browser with hard refresh (Ctrl+F5).




