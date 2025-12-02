# Fix Old Frontend Code Still Showing

## 🔴 Problem
- Frontend still shows old code even after rebuild
- This is a persistent caching/serving issue

---

## 🔍 Step 1: Complete Diagnostic

Run this to see exactly what's happening:

```bash
#!/bin/bash
echo "=== 1. Check Build Files Timestamp ==="
cd /var/www/primeacademy_frontend
ls -lth dist/assets/ | head -5
echo "Files should show TODAY's date/time"

echo ""
echo "=== 2. Check index.html Content ==="
head -20 dist/index.html | grep -i "title\|script\|link"
echo "Check if this looks like new code"

echo ""
echo "=== 3. Check Nginx Root Directory ==="
sudo grep -r "root.*primeacademy_frontend" /etc/nginx/sites-available/
sudo grep -r "root.*primeacademy_frontend" /etc/nginx/sites-enabled/
echo "Should point to: /var/www/primeacademy_frontend/dist"

echo ""
echo "=== 4. Check What Nginx is Actually Serving ==="
sudo nginx -T 2>&1 | grep -A 10 "crm.prashantthakar.com" | grep -E "root|server_name"
echo "This shows the actual config being used"

echo ""
echo "=== 5. Check File Permissions ==="
ls -la /var/www/primeacademy_frontend/dist/ | head -5

echo ""
echo "=== 6. Test What Server Returns ==="
curl -s https://crm.prashantthakar.com | head -30
echo "Check if this matches dist/index.html"

echo ""
echo "=== 7. Compare Server vs Local File ==="
echo "Server response:"
curl -s https://crm.prashantthakar.com | grep -o '<title>.*</title>' | head -1
echo ""
echo "Local file:"
grep -o '<title>.*</title>' /var/www/primeacademy_frontend/dist/index.html
echo "These should match if nginx is serving correctly"
```

---

## ✅ Step 2: Force Complete Rebuild

```bash
cd /var/www/primeacademy_frontend

# Remove EVERYTHING
rm -rf dist node_modules .vite

# Clear npm cache
npm cache clean --force

# Fresh install
npm install

# Build
npm run build

# Verify new files
echo "=== New Build Files ==="
ls -lth dist/assets/ | head -5
stat dist/index.html
```

---

## 🔧 Step 3: Verify Nginx Configuration

```bash
# Find ALL configs that might serve the frontend
sudo grep -r "crm.prashantthakar.com" /etc/nginx/

# Check which configs are enabled
ls -la /etc/nginx/sites-enabled/

# View the actual config being used
sudo nginx -T 2>&1 | grep -A 20 "server_name crm.prashantthakar.com"
```

**Make sure the config has:**
```nginx
server {
    listen 80;
    server_name crm.prashantthakar.com;

    root /var/www/primeacademy_frontend/dist;  # ← Must be /dist
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Disable caching for HTML (important!)
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🚀 Step 4: Complete Fix Sequence

Run this complete sequence:

```bash
#!/bin/bash
set -e

echo "=== STEP 1: Complete Rebuild ==="
cd /var/www/primeacademy_frontend
rm -rf dist node_modules .vite
npm cache clean --force
npm install
npm run build

echo ""
echo "=== STEP 2: Verify Build ==="
ls -lth dist/assets/ | head -3
test -f dist/index.html && echo "✅ index.html exists" || echo "❌ index.html missing"

echo ""
echo "=== STEP 3: Fix Permissions ==="
sudo chown -R www-data:www-data /var/www/primeacademy_frontend/dist
sudo chmod -R 755 /var/www/primeacademy_frontend/dist

echo ""
echo "=== STEP 4: Check Nginx Config ==="
NGINX_ROOT=$(sudo nginx -T 2>&1 | grep -A 10 "server_name crm.prashantthakar.com" | grep "root" | awk '{print $2}' | tr -d ';')
echo "Nginx is serving from: $NGINX_ROOT"
echo "Should be: /var/www/primeacademy_frontend/dist"

if [ "$NGINX_ROOT" != "/var/www/primeacademy_frontend/dist" ]; then
    echo "⚠️  WARNING: Nginx root doesn't match!"
    echo "Fix nginx config to point to: /var/www/primeacademy_frontend/dist"
fi

echo ""
echo "=== STEP 5: Clear Nginx Cache ==="
sudo rm -rf /var/cache/nginx/*
sudo systemctl restart nginx

echo ""
echo "=== STEP 6: Test ==="
echo "Testing server response..."
curl -s https://crm.prashantthakar.com | head -20

echo ""
echo "=== STEP 7: Compare ==="
echo "Server title:"
curl -s https://crm.prashantthakar.com | grep -o '<title>.*</title>'
echo ""
echo "Local file title:"
grep -o '<title>.*</title>' /var/www/primeacademy_frontend/dist/index.html

echo ""
echo "✅ Done! Test in browser with Ctrl+F5"
```

---

## 🎯 Most Common Causes

### Cause 1: Nginx Serving Wrong Directory
**Fix:**
```bash
# Find config
sudo grep -r "crm.prashantthakar.com" /etc/nginx/sites-available/

# Edit config
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com

# Make sure root is:
# root /var/www/primeacademy_frontend/dist;

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

### Cause 2: Multiple Nginx Configs
**Fix:**
```bash
# List all enabled configs
ls -la /etc/nginx/sites-enabled/

# Check for duplicates
sudo grep -h "server_name.*crm.prashantthakar.com" /etc/nginx/sites-enabled/*

# Disable duplicates
# sudo rm /etc/nginx/sites-enabled/duplicate-file
```

### Cause 3: Build Didn't Actually Update
**Fix:**
```bash
cd /var/www/primeacademy_frontend

# Check build timestamp
stat dist/index.html
stat dist/assets/index-*.js | head -1

# If old, force rebuild
rm -rf dist
npm run build
```

### Cause 4: Nginx Cache
**Fix:**
```bash
# Restart nginx (not reload)
sudo systemctl restart nginx

# Clear nginx cache
sudo rm -rf /var/cache/nginx/*

# Restart again
sudo systemctl restart nginx
```

### Cause 5: Browser/CDN Cache
**Fix:**
- Use incognito mode
- Hard refresh: `Ctrl+F5` or `Ctrl+Shift+R`
- Clear browser cache completely
- Try different browser

---

## 🔍 Quick Diagnostic Commands

Run these one by one:

```bash
# 1. Check build files are new
cd /var/www/primeacademy_frontend
ls -lth dist/assets/ | head -3
# Should show TODAY's date

# 2. Check what nginx is serving
sudo nginx -T 2>&1 | grep -A 10 "crm.prashantthakar.com" | grep root

# 3. Compare server vs local
echo "Server:"
curl -s https://crm.prashantthakar.com | grep -o '<title>.*</title>'
echo ""
echo "Local:"
grep -o '<title>.*</title>' dist/index.html

# 4. Check file content hash
echo "Server index.html hash:"
curl -s https://crm.prashantthakar.com | md5sum
echo ""
echo "Local index.html hash:"
md5sum dist/index.html
# These should match!
```

---

## ✅ Complete Nuclear Option (If Nothing Works)

```bash
#!/bin/bash
echo "=== NUCLEAR OPTION: Complete Reset ==="

# 1. Stop nginx
sudo systemctl stop nginx

# 2. Complete frontend rebuild
cd /var/www/primeacademy_frontend
rm -rf dist node_modules .vite package-lock.json
npm cache clean --force
npm install
npm run build

# 3. Verify build
ls -la dist/ | head -10

# 4. Fix permissions
sudo chown -R www-data:www-data /var/www/primeacademy_frontend
sudo chmod -R 755 /var/www/primeacademy_frontend

# 5. Clear all nginx cache
sudo rm -rf /var/cache/nginx/*

# 6. Check nginx config
sudo nginx -t

# 7. Start nginx
sudo systemctl start nginx

# 8. Test
curl -I https://crm.prashantthakar.com

echo ""
echo "✅ Complete reset done!"
echo "Now test in browser with Ctrl+F5"
```

---

## 📝 Verification Checklist

After fixing, verify:

- [ ] Build files show today's timestamp: `ls -lth dist/assets/ | head -3`
- [ ] Nginx root points to dist: `sudo nginx -T | grep "root.*dist"`
- [ ] Server and local files match: Compare `curl` vs `cat dist/index.html`
- [ ] File hashes match: `md5sum` of server vs local
- [ ] No nginx cache: `sudo ls /var/cache/nginx/` should be empty or minimal
- [ ] Browser shows new code: Test with `Ctrl+F5` in incognito

---

## 🎯 Most Likely Solution

The issue is usually one of these:

1. **Nginx serving wrong directory** - Check with `sudo nginx -T | grep root`
2. **Build didn't update** - Check with `ls -lth dist/assets/`
3. **Multiple nginx configs** - Check with `ls -la /etc/nginx/sites-enabled/`

Run the diagnostic script above to find which one it is!




