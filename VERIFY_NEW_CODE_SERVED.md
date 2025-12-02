# Verify New Code is Actually Being Served

## ✅ Good News
- Build files: `Nov 28 16:41` ✅
- Server Last-Modified: `16:41:02 GMT` ✅
- **Timestamps match - server IS serving new files!**

## 🔴 But Still Seeing Old Code?
This means it's a **browser cache issue**, not a server issue!

---

## 🔍 Step 1: Verify Content is Actually New

```bash
# Check what the server is actually serving
curl -s https://crm.prashantthakar.com | head -50

# Check local file
head -50 /var/www/primeacademy_frontend/dist/index.html

# Compare - they should match
# If they match, it's browser cache
# If they don't match, nginx is serving wrong file
```

### Check for New Features in HTML
```bash
# Look for new code/features in server response
curl -s https://crm.prashantthakar.com | grep -i "certificate\|batch.*details\|new.*feature"

# Compare with local
grep -i "certificate\|batch.*details\|new.*feature" /var/www/primeacademy_frontend/dist/index.html
```

---

## 🌐 Step 2: Fix Browser Cache

### Option 1: Hard Refresh
- **Chrome/Edge:** `Ctrl + Shift + R` or `Ctrl + F5`
- **Firefox:** `Ctrl + Shift + R` or `Ctrl + F5`
- **Safari:** `Cmd + Shift + R`

### Option 2: Clear Browser Cache Completely
1. Open browser settings
2. Clear browsing data
3. Select "Cached images and files"
4. Clear data
5. Reload page

### Option 3: Use Incognito/Private Mode
- Open incognito/private window
- Visit: https://crm.prashantthakar.com
- Should show new code

### Option 4: Disable Cache in DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Keep DevTools open
5. Reload page (F5)

---

## 🔧 Step 3: Add Cache-Busting Headers to Nginx

If browser cache persists, add these headers to nginx:

```bash
# Edit nginx config
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

Add this inside the `server` block:
```nginx
server {
    listen 80;
    server_name crm.prashantthakar.com;

    root /var/www/primeacademy_frontend/dist;
    index index.html;

    # Disable caching for HTML files
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets (JS, CSS, images)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Default location
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Then:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## ✅ Step 4: Verify It's Working

### Test 1: Check Server Response
```bash
# Get full HTML response
curl -s https://crm.prashantthakar.com > /tmp/server_response.html

# Check for new features
grep -i "certificate\|new.*feature" /tmp/server_response.html

# Compare with local
grep -i "certificate\|new.*feature" /var/www/primeacademy_frontend/dist/index.html
```

### Test 2: Check Cache Headers
```bash
# Check what cache headers nginx sends
curl -I https://crm.prashantthakar.com | grep -i cache

# For HTML, should show: Cache-Control: no-cache
```

### Test 3: Test in Browser
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Reload page
5. Check the response - should be new code

---

## 🎯 Quick Verification Script

Run this to verify everything:

```bash
#!/bin/bash
echo "=== 1. Build Files Timestamp ==="
cd /var/www/primeacademy_frontend
ls -lth dist/assets/ | head -3

echo ""
echo "=== 2. Server Last-Modified ==="
curl -I https://crm.prashantthakar.com 2>/dev/null | grep Last-Modified

echo ""
echo "=== 3. Server Content (first 30 lines) ==="
curl -s https://crm.prashantthakar.com | head -30

echo ""
echo "=== 4. Local Content (first 30 lines) ==="
head -30 dist/index.html

echo ""
echo "=== 5. Content Hash Comparison ==="
echo "Server hash:"
curl -s https://crm.prashantthakar.com | md5sum
echo "Local hash:"
md5sum dist/index.html

echo ""
echo "=== 6. Cache Headers ==="
curl -I https://crm.prashantthakar.com 2>/dev/null | grep -i cache

echo ""
echo "If hashes match → Browser cache issue"
echo "If hashes don't match → Server serving wrong file"
```

---

## 🚀 Complete Solution

Since timestamps match, the issue is browser cache. Do this:

### 1. Add Cache-Busting to Nginx
```bash
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

Add this:
```nginx
location ~* \.html$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    try_files $uri $uri/ /index.html;
}
```

### 2. Restart Nginx
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Clear Browser Cache
- Use incognito mode, OR
- Clear browser cache completely, OR
- Use DevTools with "Disable cache" checked

### 4. Test
Visit: https://crm.prashantthakar.com with hard refresh (`Ctrl+Shift+R`)

---

## 📝 Summary

**Current Status:**
- ✅ Build is new (16:41)
- ✅ Server is serving new files (Last-Modified: 16:41:02)
- ❌ Browser is showing cached old code

**Solution:**
1. Add cache-busting headers to nginx (prevents future caching)
2. Clear browser cache or use incognito
3. Hard refresh: `Ctrl+Shift+R`

The server is working correctly - it's just browser cache showing old code!




