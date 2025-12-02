# Fix Missing Cache-Control Headers

## 🔴 Problem
- Nginx config test passed ✅
- Nginx restarted ✅
- But `Cache-Control` header is NOT being sent ❌
- **Cache-busting headers not in config!**

---

## ✅ Step 1: Check Current Nginx Config

```bash
# View current config
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com

# Or check what's actually being used
sudo nginx -T 2>&1 | grep -A 20 "server_name crm.prashantthakar.com"
```

---

## 🔧 Step 2: Add Cache Headers Properly

```bash
# Edit config
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

**Find the server block and add this BEFORE `location /`:**

```nginx
server {
    listen 80;
    server_name crm.prashantthakar.com;

    root /var/www/primeacademy_frontend/dist;
    index index.html;

    # ADD THIS - Cache-busting for HTML, JS, CSS
    location ~* \.(html|js|css)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }

    # Existing location / block
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Important:** Make sure the location block is INSIDE the server block!

---

## 🚀 Step 3: Test and Restart

```bash
# Test config
sudo nginx -t

# If test passes, restart
sudo systemctl restart nginx

# Verify headers are being sent
curl -I https://crm.prashantthakar.com | grep -i cache
```

**Should now show:**
```
Cache-Control: no-cache, no-store, must-revalidate, max-age=0
Pragma: no-cache
Expires: 0
```

---

## 🔍 Step 4: Verify All Headers

```bash
# Check all response headers
curl -I https://crm.prashantthakar.com

# Should see Cache-Control, Pragma, Expires headers

# Check JS file headers
JS_FILE=$(curl -s https://crm.prashantthakar.com | grep -o 'assets/index-[^"]*\.js' | head -1)
if [ ! -z "$JS_FILE" ]; then
    curl -I "https://crm.prashantthakar.com/$JS_FILE" | grep -i cache
fi
```

---

## 🎯 Complete Fix Script

Run this to add headers automatically:

```bash
#!/bin/bash
CONFIG_FILE="/etc/nginx/sites-available/crm.prashantthakar.com"

echo "=== Checking current config ==="
if grep -q "Cache-Control.*no-cache" "$CONFIG_FILE" 2>/dev/null; then
    echo "⚠️  Cache headers already exist, but might be in wrong place"
else
    echo "❌ Cache headers not found"
fi

echo ""
echo "=== Current server block ==="
sudo grep -A 15 "server_name crm.prashantthakar.com" "$CONFIG_FILE"

echo ""
echo "=== Adding cache headers ==="
# Create backup
sudo cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"

# Add cache headers before location / block
sudo sed -i '/location \/ {/i\
    # Cache-busting for HTML, JS, CSS\
    location ~* \\.(html|js|css)$ {\
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";\
        add_header Pragma "no-cache";\
        add_header Expires "0";\
        try_files $uri $uri/ /index.html;\
    }\
' "$CONFIG_FILE"

echo "✅ Headers added"

echo ""
echo "=== Testing config ==="
sudo nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "=== Restarting nginx ==="
    sudo systemctl restart nginx
    
    echo ""
    echo "=== Verifying headers ==="
    curl -I https://crm.prashantthakar.com 2>/dev/null | grep -i cache
    
    if [ $? -eq 0 ]; then
        echo "✅ Cache headers are now being sent!"
    else
        echo "❌ Headers still not found - check config manually"
    fi
else
    echo "❌ Config test failed - restoring backup"
    sudo cp "${CONFIG_FILE}.backup" "$CONFIG_FILE"
fi
```

---

## 🔧 Manual Fix (Recommended)

If the script doesn't work, do it manually:

```bash
# 1. View current config
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com

# 2. Edit config
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com

# 3. Find this section:
#    server {
#        listen 80;
#        server_name crm.prashantthakar.com;
#        root /var/www/primeacademy_frontend/dist;
#        index index.html;
#
#        location / {
#            try_files $uri $uri/ /index.html;
#        }
#    }

# 4. Add this BEFORE "location / {":
#        location ~* \.(html|js|css)$ {
#            add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
#            add_header Pragma "no-cache";
#            add_header Expires "0";
#            try_files $uri $uri/ /index.html;
#        }

# 5. Save: Ctrl+X, Y, Enter

# 6. Test and restart
sudo nginx -t && sudo systemctl restart nginx

# 7. Verify
curl -I https://crm.prashantthakar.com | grep -i cache
```

---

## ✅ Verify It's Working

After fixing:

```bash
# Check HTML headers
curl -I https://crm.prashantthakar.com | grep -E "Cache-Control|Pragma|Expires"

# Should show:
# Cache-Control: no-cache, no-store, must-revalidate, max-age=0
# Pragma: no-cache
# Expires: 0

# Check JS file headers
JS_FILE=$(curl -s https://crm.prashantthakar.com | grep -o 'assets/index-[^"]*\.js' | head -1)
curl -I "https://crm.prashantthakar.com/$JS_FILE" 2>/dev/null | grep -i cache
```

---

## 🎯 Quick Check

```bash
# Check if headers are being sent
curl -I https://crm.prashantthakar.com 2>&1 | head -20

# Look for Cache-Control in the output
# If not found, headers weren't added to config
```

---

## 📝 Summary

**The issue:** Cache-Control headers are not in the nginx config.

**The fix:** Add the location block for HTML/JS/CSS files with cache-busting headers.

**After fixing:**
1. Test config: `sudo nginx -t`
2. Restart: `sudo systemctl restart nginx`
3. Verify: `curl -I https://crm.prashantthakar.com | grep Cache-Control`
4. Clear browser cache
5. Reload page

**The headers must be in the config file for them to work!**




