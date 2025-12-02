# Fix Old Code When Server Returns 200 OK

## 🔴 Problem
- Server returns `200 OK` ✅
- But still showing old code ❌
- Last-Modified: `Fri, 28 Nov 2025 15:49:42 GMT` (old timestamp)

---

## ✅ Step-by-Step Fix

### Step 1: Navigate to Frontend Directory

```bash
# You're currently in home directory, need to go to frontend
cd /var/www/primeacademy_frontend

# Verify you're in the right place
pwd
ls -la
```

### Step 2: Check if dist Folder Exists

```bash
# Check if dist exists
ls -la dist/

# If you get "No such file or directory", dist doesn't exist
# Need to build it
```

### Step 3: Force Complete Rebuild

```bash
cd /var/www/primeacademy_frontend

# Remove everything
rm -rf dist node_modules .vite

# Clear npm cache
npm cache clean --force

# Fresh install
npm install

# Build
npm run build

# Verify build created files
ls -la dist/
ls -la dist/assets/ | head -5
```

### Step 4: Check Build Timestamp

```bash
# Check when files were created
ls -lth dist/assets/ | head -3

# Check index.html timestamp
stat dist/index.html

# Should show CURRENT date/time (not 15:49:42)
```

### Step 5: Verify Nginx is Serving Correct Directory

```bash
# Check what nginx is actually serving
sudo nginx -T 2>&1 | grep -A 15 "server_name crm.prashantthakar.com" | grep root

# Should show:
# root /var/www/primeacademy_frontend/dist;
```

### Step 6: Fix Nginx Config if Wrong

```bash
# Find config file
sudo grep -r "crm.prashantthakar.com" /etc/nginx/sites-available/

# Edit the config
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
# OR
sudo nano /etc/nginx/sites-available/default
```

**Make sure it has:**
```nginx
server {
    listen 80;
    server_name crm.prashantthakar.com;

    root /var/www/primeacademy_frontend/dist;  # ← Must be /dist
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Disable HTML caching
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
}
```

### Step 7: Clear All Caches and Restart

```bash
# Clear nginx cache
sudo rm -rf /var/cache/nginx/*

# Restart nginx (not reload - restart clears more)
sudo systemctl restart nginx

# Verify
sudo systemctl status nginx
```

### Step 8: Verify New Code is Served

```bash
# Check server response timestamp
curl -I https://crm.prashantthakar.com | grep Last-Modified

# Should show CURRENT timestamp, not 15:49:42

# Compare server vs local
echo "Server:"
curl -s https://crm.prashantthakar.com | head -20

echo ""
echo "Local:"
head -20 /var/www/primeacademy_frontend/dist/index.html
```

---

## 🚀 Complete Fix Sequence

Run this complete sequence:

```bash
#!/bin/bash
set -e

echo "=== STEP 1: Navigate to Frontend ==="
cd /var/www/primeacademy_frontend
pwd

echo ""
echo "=== STEP 2: Remove Old Build ==="
rm -rf dist node_modules .vite

echo ""
echo "=== STEP 3: Fresh Install ==="
npm cache clean --force
npm install

echo ""
echo "=== STEP 4: Build ==="
npm run build

echo ""
echo "=== STEP 5: Verify Build ==="
ls -la dist/ | head -10
ls -lth dist/assets/ | head -3
stat dist/index.html

echo ""
echo "=== STEP 6: Fix Permissions ==="
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist

echo ""
echo "=== STEP 7: Check Nginx Config ==="
NGINX_ROOT=$(sudo nginx -T 2>&1 | grep -A 15 "server_name crm.prashantthakar.com" | grep "root" | awk '{print $2}' | tr -d ';')
echo "Nginx root: $NGINX_ROOT"
echo "Should be: /var/www/primeacademy_frontend/dist"

if [ "$NGINX_ROOT" != "/var/www/primeacademy_frontend/dist" ]; then
    echo "⚠️  FIXING: Nginx root is wrong!"
    echo "Edit nginx config to point to: /var/www/primeacademy_frontend/dist"
fi

echo ""
echo "=== STEP 8: Clear Cache and Restart ==="
sudo rm -rf /var/cache/nginx/*
sudo systemctl restart nginx

echo ""
echo "=== STEP 9: Test ==="
echo "Last-Modified header:"
curl -I https://crm.prashantthakar.com | grep Last-Modified

echo ""
echo "✅ Done! Test in browser with Ctrl+F5"
```

---

## 🎯 Quick Fix (Run This)

```bash
cd /var/www/primeacademy_frontend && \
rm -rf dist node_modules .vite && \
npm cache clean --force && \
npm install && \
npm run build && \
ls -lth dist/assets/ | head -3 && \
sudo chown -R www-data:www-data dist && \
sudo chmod -R 755 dist && \
sudo rm -rf /var/cache/nginx/* && \
sudo systemctl restart nginx && \
curl -I https://crm.prashantthakar.com | grep Last-Modified
```

**The Last-Modified should show CURRENT time, not 15:49:42!**

---

## 🔍 Verify It's Fixed

After running the fix:

```bash
# 1. Check build timestamp
cd /var/www/primeacademy_frontend
ls -lth dist/assets/ | head -3
# Should show TODAY's current time

# 2. Check server timestamp
curl -I https://crm.prashantthakar.com | grep Last-Modified
# Should match the build time above

# 3. Compare content
echo "Server title:"
curl -s https://crm.prashantthakar.com | grep -o '<title>.*</title>'
echo ""
echo "Local title:"
grep -o '<title>.*</title>' dist/index.html
# Should match!

# 4. Test in browser
# Visit: https://crm.prashantthakar.com
# Hard refresh: Ctrl+F5
# Should see new code
```

---

## 🐛 If Still Showing Old Code

### Check 1: Multiple Build Locations
```bash
# Check if there are multiple dist folders
find /var/www -name "dist" -type d

# Make sure nginx is serving the right one
sudo nginx -T 2>&1 | grep -A 10 "crm.prashantthakar.com" | grep root
```

### Check 2: Nginx Serving Cached Version
```bash
# Check nginx cache location
sudo ls -la /var/cache/nginx/

# Clear everything
sudo rm -rf /var/cache/nginx/*
sudo systemctl restart nginx
```

### Check 3: CDN or Proxy Cache
If you're using a CDN or proxy:
- Clear CDN cache
- Check proxy settings
- Bypass cache for testing

### Check 4: Browser Cache (Even in Incognito)
```bash
# Test with curl (no browser cache)
curl -s https://crm.prashantthakar.com | head -30

# Compare with local file
head -30 /var/www/primeacademy_frontend/dist/index.html

# If they match, it's browser cache
# If they don't match, nginx is serving wrong file
```

---

## ✅ Final Verification

```bash
# Complete verification script
cd /var/www/primeacademy_frontend

echo "=== Build Files ==="
ls -lth dist/assets/ | head -3

echo ""
echo "=== Server Response ==="
curl -I https://crm.prashantthakar.com | grep -E "Last-Modified|Content-Length"

echo ""
echo "=== Content Comparison ==="
echo "Server hash:"
curl -s https://crm.prashantthakar.com | md5sum
echo "Local hash:"
md5sum dist/index.html

echo ""
echo "If hashes match → Browser cache issue"
echo "If hashes don't match → Nginx serving wrong file"
```

---

## 📝 Summary

The issue is that:
1. You're in wrong directory (home, not frontend)
2. dist folder might not exist or is old
3. Need to rebuild and clear all caches

**Run the quick fix above, then test with `curl -I` to verify Last-Modified is current!**




