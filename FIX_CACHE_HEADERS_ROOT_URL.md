# Fix Cache Headers for Root URL

## 🔴 Problem
- Cache headers are in config ✅
- But root URL doesn't match the pattern ❌
- `curl https://crm.prashantthakar.com` doesn't have `.html` extension
- So it goes to `location /` block, not the cache-busting block

---

## ✅ Solution: Add Headers to Location / Block

### Option 1: Add Headers to Both Blocks (Recommended)

```bash
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

**Your config should look like this:**

```nginx
server {
    listen 80;
    server_name crm.prashantthakar.com;

    root /var/www/primeacademy_frontend/dist;
    index index.html;

    # Cache-busting for HTML, JS, CSS files
    location ~* \.(html|js|css)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }

    # Cache-busting for root and all routes
    location / {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }
}
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

### Option 2: Modify Location / to Include Headers

```nginx
location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
    add_header Pragma "no-cache";
    add_header Expires "0";
    try_files $uri $uri/ /index.html;
}
```

---

## 🚀 Quick Fix

```bash
# Edit config
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com

# Find the "location / {" block
# Add these 3 lines INSIDE that block (before try_files):
#    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
#    add_header Pragma "no-cache";
#    add_header Expires "0";

# Save and restart
sudo nginx -t && sudo systemctl restart nginx
```

---

## ✅ Verify It's Working

After fixing:

```bash
# Test root URL
curl -I https://crm.prashantthakar.com | grep -i cache

# Should now show:
# Cache-Control: no-cache, no-store, must-revalidate, max-age=0
# Pragma: no-cache
# Expires: 0

# Test HTML file directly
curl -I https://crm.prashantthakar.com/index.html | grep -i cache

# Should also show cache headers
```

---

## 🔍 Complete Verification

```bash
#!/bin/bash
echo "=== Testing Root URL ==="
curl -I https://crm.prashantthakar.com 2>/dev/null | grep -E "Cache-Control|Pragma|Expires"

echo ""
echo "=== Testing HTML File ==="
curl -I https://crm.prashantthakar.com/index.html 2>/dev/null | grep -E "Cache-Control|Pragma|Expires"

echo ""
echo "=== Testing JS File ==="
JS_FILE=$(curl -s https://crm.prashantthakar.com | grep -o 'assets/index-[^"]*\.js' | head -1)
if [ ! -z "$JS_FILE" ]; then
    curl -I "https://crm.prashantthakar.com/$JS_FILE" 2>/dev/null | grep -E "Cache-Control|Pragma|Expires"
else
    echo "Could not find JS file"
fi

echo ""
echo "If all show cache headers → ✅ Working!"
echo "If root URL doesn't show headers → Need to add to location / block"
```

---

## 📝 Why This Happens

- `curl https://crm.prashantthakar.com` → No file extension → Matches `location /`
- `curl https://crm.prashantthakar.com/index.html` → Has `.html` → Matches `location ~* \.(html|js|css)$`

**Solution:** Add cache headers to BOTH blocks, or just to `location /` block.

---

## 🎯 Final Config (Complete)

```nginx
server {
    listen 80;
    server_name crm.prashantthakar.com;

    root /var/www/primeacademy_frontend/dist;
    index index.html;

    # Cache-busting for specific file types
    location ~* \.(html|js|css)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }

    # Cache-busting for all routes (including root)
    location / {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }
}
```

---

## ✅ After Fixing

1. **Test config:** `sudo nginx -t`
2. **Restart:** `sudo systemctl restart nginx`
3. **Verify:** `curl -I https://crm.prashantthakar.com | grep Cache-Control`
4. **Should show:** `Cache-Control: no-cache, no-store, must-revalidate, max-age=0`
5. **Clear browser cache**
6. **Reload page** - New code should appear!

---

## 📝 Summary

**The issue:** Root URL doesn't match the file extension pattern, so it uses `location /` block which doesn't have cache headers.

**The fix:** Add cache headers to the `location /` block as well.

**After fixing:** Both root URL and file URLs will have cache-busting headers!




