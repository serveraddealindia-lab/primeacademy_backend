# Fix 500 Internal Server Error and Nginx Conflicts

## 🔴 Problems Found
1. **500 Internal Server Error** - Frontend returns 500 error
2. **Conflicting server name** - Nginx warning about duplicate server names

---

## ✅ Step-by-Step Fix

### Step 1: Check Nginx Error Logs

```bash
# Check recent nginx errors
sudo tail -50 /var/log/nginx/error.log

# Look for specific error messages that explain the 500 error
```

**Common errors you might see:**
- `Permission denied` - File permission issue
- `No such file or directory` - Wrong path
- `Primary script unknown` - PHP issue (if using PHP)
- `upstream connection failed` - Backend connection issue

### Step 2: Fix Conflicting Server Names

```bash
# Find all nginx config files
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# Check for duplicate server_name
sudo grep -r "server_name.*prashantthakar.com" /etc/nginx/sites-available/
sudo grep -r "server_name.*prashantthakar.com" /etc/nginx/sites-enabled/
```

**Fix:**
- Remove duplicate server_name entries
- Or disable one of the conflicting configs

### Step 3: Check Nginx Configuration

```bash
# Test nginx configuration
sudo nginx -t

# This will show syntax errors and warnings
```

### Step 4: Check File Permissions

```bash
# Check permissions on frontend directory
ls -la /var/www/primeacademy_frontend/

# Check permissions on dist folder
ls -la /var/www/primeacademy_frontend/dist/

# Fix permissions if needed
sudo chown -R www-data:www-data /var/www/primeacademy_frontend/dist
sudo chmod -R 755 /var/www/primeacademy_frontend/dist
```

### Step 5: Verify Nginx Config Points to Correct Directory

```bash
# Find config for crm.prashantthakar.com
sudo grep -r "crm.prashantthakar.com" /etc/nginx/sites-available/

# Check the root directive
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com
# OR
sudo cat /etc/nginx/sites-available/default
```

**Make sure it has correct configuration:**
```nginx
server {
    listen 80;
    server_name crm.prashantthakar.com;

    root /var/www/primeacademy_frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Error pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

### Step 6: Verify dist Folder Exists and Has Files

```bash
# Check if dist folder exists
ls -la /var/www/primeacademy_frontend/dist/

# Check if index.html exists
ls -la /var/www/primeacademy_frontend/dist/index.html

# If missing, rebuild
cd /var/www/primeacademy_frontend
npm run build
```

### Step 7: Fix Conflicting Server Names

```bash
# List all enabled sites
ls -la /etc/nginx/sites-enabled/

# Check for duplicates
sudo grep -h "server_name" /etc/nginx/sites-enabled/* | sort | uniq -d

# Disable duplicate configs
# sudo rm /etc/nginx/sites-enabled/duplicate-config-file
```

---

## 🔧 Complete Fix Sequence

Run these commands in order:

```bash
# 1. Check nginx error logs
echo "=== Nginx Error Logs ==="
sudo tail -30 /var/log/nginx/error.log

# 2. Check for conflicting server names
echo ""
echo "=== Conflicting Server Names ==="
sudo grep -r "server_name.*prashantthakar.com" /etc/nginx/sites-available/
sudo grep -r "server_name.*prashantthakar.com" /etc/nginx/sites-enabled/

# 3. Check file permissions
echo ""
echo "=== File Permissions ==="
ls -la /var/www/primeacademy_frontend/dist/

# 4. Fix permissions
echo ""
echo "=== Fixing Permissions ==="
sudo chown -R www-data:www-data /var/www/primeacademy_frontend/dist
sudo chmod -R 755 /var/www/primeacademy_frontend/dist

# 5. Verify dist folder has files
echo ""
echo "=== Checking dist folder ==="
ls -la /var/www/primeacademy_frontend/dist/ | head -10

# 6. Test nginx config
echo ""
echo "=== Testing Nginx Config ==="
sudo nginx -t

# 7. Restart nginx
echo ""
echo "=== Restarting Nginx ==="
sudo systemctl restart nginx

# 8. Check status
echo ""
echo "=== Nginx Status ==="
sudo systemctl status nginx | head -10

# 9. Test frontend
echo ""
echo "=== Testing Frontend ==="
curl -I https://crm.prashantthakar.com
```

---

## 🐛 Common Issues and Solutions

### Issue 1: Permission Denied
**Error in logs:** `Permission denied`
**Solution:**
```bash
sudo chown -R www-data:www-data /var/www/primeacademy_frontend/dist
sudo chmod -R 755 /var/www/primeacademy_frontend/dist
```

### Issue 2: No Such File or Directory
**Error in logs:** `No such file or directory`
**Solution:**
```bash
# Check if dist folder exists
ls -la /var/www/primeacademy_frontend/dist/

# If missing, rebuild
cd /var/www/primeacademy_frontend
npm run build
```

### Issue 3: Conflicting Server Names
**Warning:** `conflicting server name "api.prashant-..."`
**Solution:**
```bash
# Find duplicate configs
sudo grep -r "server_name.*api.prashant" /etc/nginx/sites-available/
sudo grep -r "server_name.*api.prashant" /etc/nginx/sites-enabled/

# Disable one of them
# Check which files have the conflict
sudo nginx -T | grep -B 5 -A 10 "api.prashant"

# Remove duplicate from sites-enabled
# sudo rm /etc/nginx/sites-enabled/duplicate-file
```

### Issue 4: Wrong Root Directory
**Solution:**
```bash
# Find config file
sudo grep -r "crm.prashantthakar.com" /etc/nginx/sites-available/

# Edit config
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com

# Make sure root is:
# root /var/www/primeacademy_frontend/dist;

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

### Issue 5: Missing index.html
**Solution:**
```bash
# Check if index.html exists
ls -la /var/www/primeacademy_frontend/dist/index.html

# If missing, rebuild
cd /var/www/primeacademy_frontend
npm run build

# Verify
ls -la dist/index.html
```

---

## 🎯 Quick Fix (Most Common Solution)

Run this complete fix:

```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/primeacademy_frontend/dist
sudo chmod -R 755 /var/www/primeacademy_frontend/dist

# Verify dist has files
cd /var/www/primeacademy_frontend
ls -la dist/ | head -5

# If dist is empty or missing, rebuild
if [ ! -f "dist/index.html" ]; then
    echo "Rebuilding frontend..."
    npm run build
fi

# Check nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Check error logs
sudo tail -20 /var/log/nginx/error.log

# Test
curl -I https://crm.prashantthakar.com
```

---

## ✅ Verification

After fixing, verify:

```bash
# 1. Check nginx status
sudo systemctl status nginx

# 2. Check error logs (should be empty or no new errors)
sudo tail -20 /var/log/nginx/error.log

# 3. Test frontend
curl -I https://crm.prashantthakar.com
# Should return: HTTP/1.1 200 OK (not 500)

# 4. Test in browser
# Visit: https://crm.prashantthakar.com
# Should load frontend (not 500 error)
```

---

## 📝 Check Nginx Config Files

To find and fix conflicting server names:

```bash
# List all config files
echo "=== Available configs ==="
ls -la /etc/nginx/sites-available/

echo ""
echo "=== Enabled configs ==="
ls -la /etc/nginx/sites-enabled/

echo ""
echo "=== Server names in configs ==="
sudo grep -h "server_name" /etc/nginx/sites-enabled/*

echo ""
echo "=== Find duplicates ==="
sudo grep -h "server_name" /etc/nginx/sites-enabled/* | sort | uniq -d
```

If you find duplicates, disable one:
```bash
# Example: if you have duplicate
sudo rm /etc/nginx/sites-enabled/duplicate-config
sudo nginx -t
sudo systemctl restart nginx
```




