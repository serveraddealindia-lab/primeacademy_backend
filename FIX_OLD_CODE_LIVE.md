# 🔴 FIX: Old Code Still Showing on Live

## 🎯 Root Cause Analysis

**Problem:** Old frontend code is showing on live site even after updates.

**Why This Happens:**
1. Root URL (`https://crm.prashantthakar.com`) doesn't match `.html|js|css` pattern
2. It uses `location /` block which likely has NO cache headers
3. Browser caches the response
4. Even hard refresh doesn't help if server isn't sending proper headers

---

## ✅ Complete Fix (Run All Steps)

### Step 1: Check Current Nginx Config
```bash
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com
```

**Look for:**
- `location ~* \.(html|js|css)$` block (you have this ✅)
- `location / {` block (need to check if it has cache headers ❓)

### Step 2: Check if location / Block Has Headers
```bash
sudo grep -A 5 "location /" /etc/nginx/sites-available/crm.prashantthakar.com
```

**If it shows:**
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```
**→ This is the problem! No cache headers!**

### Step 3: Edit Nginx Config
```bash
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

**Find `location / {` block and make it look like this:**
```nginx
location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
    add_header Pragma "no-cache";
    add_header Expires "0";
    try_files $uri $uri/ /index.html;
}
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

### Step 4: Verify Frontend Build is New
```bash
cd /var/www/primeacademy_frontend
ls -lth dist/assets/ | head -5
```

**Check timestamp** - should be recent (today's date/time)

### Step 5: Force Rebuild Frontend (If Needed)
```bash
cd /var/www/primeacademy_frontend
git pull origin main
rm -rf dist node_modules .vite
npm cache clean --force
npm install
npm run build
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist
```

### Step 6: Test & Restart Nginx
```bash
sudo nginx -t && sudo systemctl restart nginx
```

### Step 7: Verify Headers are Working
```bash
curl -I https://crm.prashantthakar.com | grep -i cache
```

**Should show:**
```
Cache-Control: no-cache, no-store, must-revalidate, max-age=0
Pragma: no-cache
Expires: 0
```

### Step 8: Test Root URL Response
```bash
curl -I https://crm.prashantthakar.com
```

**Check:**
- `Last-Modified:` header (should be recent)
- `Cache-Control:` header (should be `no-cache, no-store...`)

### Step 9: Clear Browser Cache Completely
- **Chrome/Edge:** `Ctrl+Shift+Delete` → Select "Cached images and files" → Clear data
- **Or:** Open DevTools (`F12`) → Right-click refresh button → "Empty Cache and Hard Reload"
- **Or:** Use Incognito/Private window

### Step 10: Verify New Code is Live
```bash
# Check if new code is in dist folder
grep -r "NEW_FEATURE_NAME" /var/www/primeacademy_frontend/dist/ || echo "Check manually"
```

---

## 🚀 One-Command Complete Fix

```bash
cd /var/www/primeacademy_frontend && \
git pull origin main && \
rm -rf dist node_modules .vite && \
npm cache clean --force && \
npm install && \
npm run build && \
sudo chown -R www-data:www-data dist && \
sudo chmod -R 755 dist && \
sudo systemctl restart nginx && \
echo "✅ Frontend rebuilt and Nginx restarted!" && \
curl -I https://crm.prashantthakar.com | grep -i cache
```

**Then edit Nginx config:**
```bash
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```
**Add cache headers to `location /` block (see Step 3 above)**

---

## 🔍 Diagnostic Commands

### Check What Nginx is Serving
```bash
# Check root URL headers
curl -I https://crm.prashantthakar.com

# Check HTML file headers
curl -I https://crm.prashantthakar.com/index.html

# Check JS file headers
JS_FILE=$(curl -s https://crm.prashantthakar.com | grep -o 'assets/index-[^"]*\.js' | head -1)
curl -I "https://crm.prashantthakar.com/$JS_FILE"
```

### Check Build Timestamp
```bash
ls -lth /var/www/primeacademy_frontend/dist/assets/ | head -3
stat /var/www/primeacademy_frontend/dist/index.html
```

### Check Git Status
```bash
cd /var/www/primeacademy_frontend
git log -1 --oneline
git status
```

### Check Nginx Error Logs
```bash
sudo tail -50 /var/log/nginx/error.log
```

---

## 📋 Complete Nginx Config (Expected)

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

    # Cache-busting for root URL and all routes (CRITICAL!)
    location / {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }
}
```

---

## ✅ Checklist

- [ ] Nginx config has cache headers in `location /` block
- [ ] Frontend code is pulled from GitHub (`git pull`)
- [ ] Frontend is rebuilt (`npm run build`)
- [ ] Build timestamp is recent
- [ ] File permissions are correct (`www-data:www-data`)
- [ ] Nginx is restarted (`sudo systemctl restart nginx`)
- [ ] Cache headers are present in response (`curl -I`)
- [ ] Browser cache is cleared
- [ ] Tested in incognito/private window

---

## 🎯 Why Root URL is Critical

- `https://crm.prashantthakar.com` → No file extension → Uses `location /`
- `https://crm.prashantthakar.com/index.html` → Has `.html` → Uses `location ~* \.(html|js|css)$`

**Both need cache headers!** But root URL is more important because that's what users visit first.

---

## 🔥 Final Solution

1. **Add cache headers to `location /` block** ← Most important!
2. **Rebuild frontend** (if code changed)
3. **Restart Nginx**
4. **Clear browser cache**
5. **Test in incognito**

**After this, new code will appear!**




