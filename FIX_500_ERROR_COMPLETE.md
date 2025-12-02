# Complete Fix for 500 Error and Nginx Conflicts

## 🔴 Current Status
- ✅ Nginx is running
- ⚠️ Warning: Conflicting server name "api.p..."
- ❌ Frontend returns 500 Internal Server Error

---

## 🔍 Step 1: Check Actual Error in Nginx Logs

```bash
# Check the most recent errors
sudo tail -50 /var/log/nginx/error.log

# Look for specific error messages
# Common errors:
# - "Permission denied"
# - "No such file or directory"
# - "Primary script unknown"
# - "upstream connection failed"
```

**This will tell us the exact cause of the 500 error.**

---

## 🔧 Step 2: Fix Conflicting Server Names

```bash
# Find all server_name entries
sudo grep -r "server_name.*api.prashant" /etc/nginx/sites-available/
sudo grep -r "server_name.*api.prashant" /etc/nginx/sites-enabled/

# List all enabled configs
ls -la /etc/nginx/sites-enabled/

# Check for duplicates
sudo nginx -T 2>&1 | grep -A 5 "server_name.*api.prashant"
```

**Fix duplicate configs:**
```bash
# If you find duplicate, disable one
# Example:
sudo rm /etc/nginx/sites-enabled/duplicate-config-file

# Or comment out the duplicate server_name in the config file
```

---

## ✅ Step 3: Verify Frontend Files Exist

```bash
# Check if dist folder exists and has files
ls -la /var/www/primeacademy_frontend/dist/

# Check if index.html exists
ls -la /var/www/primeacademy_frontend/dist/index.html

# If missing or empty, rebuild
cd /var/www/primeacademy_frontend
if [ ! -f "dist/index.html" ]; then
    echo "Rebuilding frontend..."
    npm run build
fi
```

---

## 🔐 Step 4: Fix File Permissions

```bash
# Fix ownership (nginx runs as www-data)
sudo chown -R www-data:www-data /var/www/primeacademy_frontend/dist

# Fix permissions
sudo chmod -R 755 /var/www/primeacademy_frontend/dist

# Verify
ls -la /var/www/primeacademy_frontend/dist/ | head -5
```

---

## 📝 Step 5: Check and Fix Nginx Configuration

```bash
# Find config for crm.prashantthakar.com
sudo grep -r "crm.prashantthakar.com" /etc/nginx/sites-available/
sudo grep -r "crm.prashantthakar.com" /etc/nginx/sites-enabled/

# View the config
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com
# OR
sudo cat /etc/nginx/sites-available/default
```

**Make sure the config looks like this:**
```nginx
server {
    listen 80;
    server_name crm.prashantthakar.com;

    root /var/www/primeacademy_frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Logging
    access_log /var/log/nginx/crm_access.log;
    error_log /var/log/nginx/crm_error.log;
}
```

**If config is wrong, fix it:**
```bash
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
# OR
sudo nano /etc/nginx/sites-available/default
```

---

## 🚀 Step 6: Complete Fix Sequence

Run this complete sequence:

```bash
#!/bin/bash
echo "=== Step 1: Check Error Logs ==="
sudo tail -30 /var/log/nginx/error.log

echo ""
echo "=== Step 2: Check dist folder ==="
ls -la /var/www/primeacademy_frontend/dist/ | head -5

echo ""
echo "=== Step 3: Fix Permissions ==="
sudo chown -R www-data:www-data /var/www/primeacademy_frontend/dist
sudo chmod -R 755 /var/www/primeacademy_frontend/dist

echo ""
echo "=== Step 4: Rebuild if needed ==="
cd /var/www/primeacademy_frontend
if [ ! -f "dist/index.html" ]; then
    echo "Rebuilding frontend..."
    npm run build
fi

echo ""
echo "=== Step 5: Check for conflicting server names ==="
sudo grep -r "server_name.*api.prashant" /etc/nginx/sites-enabled/

echo ""
echo "=== Step 6: Test nginx config ==="
sudo nginx -t

echo ""
echo "=== Step 7: Restart nginx ==="
sudo systemctl restart nginx

echo ""
echo "=== Step 8: Check status ==="
sudo systemctl status nginx | head -10

echo ""
echo "=== Step 9: Test frontend ==="
curl -I https://crm.prashantthakar.com

echo ""
echo "=== Step 10: Check error logs again ==="
sudo tail -10 /var/log/nginx/error.log
```

---

## 🎯 Quick Fix (Most Common Issues)

Run these commands:

```bash
# 1. Check what the actual error is
sudo tail -30 /var/log/nginx/error.log

# 2. Fix permissions
sudo chown -R www-data:www-data /var/www/primeacademy_frontend/dist
sudo chmod -R 755 /var/www/primeacademy_frontend/dist

# 3. Verify dist has files
cd /var/www/primeacademy_frontend
ls -la dist/ | head -5

# 4. If dist is empty, rebuild
if [ ! -f "dist/index.html" ]; then
    npm run build
fi

# 5. Find and fix conflicting server names
echo "Enabled configs:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "Server names:"
sudo grep -h "server_name" /etc/nginx/sites-enabled/*

# 6. Test and restart
sudo nginx -t
sudo systemctl restart nginx

# 7. Test
curl -I https://crm.prashantthakar.com
```

---

## 🐛 Specific Error Solutions

### If error log shows "Permission denied":
```bash
sudo chown -R www-data:www-data /var/www/primeacademy_frontend
sudo chmod -R 755 /var/www/primeacademy_frontend
```

### If error log shows "No such file or directory":
```bash
# Check if dist exists
ls -la /var/www/primeacademy_frontend/dist/

# Rebuild if missing
cd /var/www/primeacademy_frontend
npm run build
```

### If error log shows "Primary script unknown":
```bash
# This means nginx is trying to run PHP
# Check nginx config - should NOT have PHP configuration for frontend
sudo grep -r "php" /etc/nginx/sites-available/crm.prashantthakar.com
# Remove any PHP-related location blocks
```

### If error log shows "upstream connection failed":
```bash
# This means nginx is trying to proxy to backend
# For frontend, it should serve static files, not proxy
# Check nginx config - should have "root" not "proxy_pass"
```

---

## ✅ Verification Checklist

After fixing, verify:

```bash
# 1. Nginx is running
sudo systemctl status nginx | grep Active

# 2. No new errors in logs
sudo tail -20 /var/log/nginx/error.log | grep -i error

# 3. dist folder has files
ls -la /var/www/primeacademy_frontend/dist/ | wc -l
# Should show more than 3 files

# 4. index.html exists
test -f /var/www/primeacademy_frontend/dist/index.html && echo "✅ index.html exists" || echo "❌ index.html missing"

# 5. Permissions are correct
ls -la /var/www/primeacademy_frontend/dist/ | head -3
# Should show www-data ownership

# 6. Frontend returns 200
curl -I https://crm.prashantthakar.com | head -1
# Should show: HTTP/1.1 200 OK
```

---

## 📞 Diagnostic Command

Run this to see everything at once:

```bash
echo "=== Nginx Error Log ==="
sudo tail -20 /var/log/nginx/error.log

echo ""
echo "=== Dist Folder ==="
ls -la /var/www/primeacademy_frontend/dist/ | head -5

echo ""
echo "=== File Permissions ==="
stat /var/www/primeacademy_frontend/dist/index.html 2>/dev/null || echo "index.html not found"

echo ""
echo "=== Nginx Config Test ==="
sudo nginx -t

echo ""
echo "=== Enabled Configs ==="
ls -la /etc/nginx/sites-enabled/

echo ""
echo "=== Server Names ==="
sudo grep -h "server_name" /etc/nginx/sites-enabled/*

echo ""
echo "=== Frontend Test ==="
curl -I https://crm.prashantthakar.com 2>&1 | head -5
```

**Share the output of this command to get specific help!**




