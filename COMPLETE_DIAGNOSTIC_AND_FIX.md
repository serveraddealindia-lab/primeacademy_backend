# 🔍 Complete Diagnostic: Frontend + Backend Issue

## 🎯 Understanding the Problem

**You're seeing old code. This could be:**
1. **Frontend issue** - Old frontend code being served/cached
2. **Backend issue** - Backend not restarted, serving old API responses
3. **Both** - Both frontend and backend need updates

---

## 🔍 Step 1: Check Backend Status

### Check if Backend is Running
```bash
pm2 list
```

**Look for:**
- `primeacademy-backend` process
- Status should be `online` ✅
- If `stopped` or `errored` → Backend is not running ❌

### Check Backend Logs
```bash
pm2 logs primeacademy-backend --lines 50
```

**Look for:**
- Any errors
- When it last started
- If it's actually running

### Check Backend Code is Updated
```bash
cd /var/www/primeacademy_backend
git log -1 --oneline
git status
```

**Should show latest commit from GitHub.**

---

## 🔍 Step 2: Check Frontend Status

### Check Frontend Build Timestamp
```bash
ls -lth /var/www/primeacademy_frontend/dist/assets/ | head -5
stat /var/www/primeacademy_frontend/dist/index.html
```

**Check:**
- When files were last built
- Should be recent (today's date/time)

### Check Frontend Code is Updated
```bash
cd /var/www/primeacademy_frontend
git log -1 --oneline
git status
```

**Should show latest commit from GitHub.**

---

## 🔍 Step 3: Check What's Actually Being Served

### Test Frontend Directly
```bash
curl -I https://crm.prashantthakar.com
```

**Check:**
- `Last-Modified:` header (should be recent)
- `Cache-Control:` header (should be `no-cache...`)

### Test Backend API
```bash
curl -I https://api.prashantthakar.com/api/health
```

**Check:**
- Response code (should be `200 OK`)
- If `502 Bad Gateway` → Backend is not running ❌

---

## ✅ Complete Fix: Update Both Frontend AND Backend

### Part A: Update Backend

```bash
# 1. Navigate to backend
cd /var/www/primeacademy_backend

# 2. Pull latest code
git pull origin main

# 3. Install dependencies (if package.json changed)
npm install

# 4. Stop old backend
pm2 stop primeacademy-backend

# 5. Start backend with new code
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx

# 6. Check status
pm2 status

# 7. Check logs
pm2 logs primeacademy-backend --lines 20
```

### Part B: Update Frontend

```bash
# 1. Navigate to frontend
cd /var/www/primeacademy_frontend

# 2. Pull latest code
git pull origin main

# 3. Remove old build
rm -rf dist node_modules .vite

# 4. Clear npm cache
npm cache clean --force

# 5. Install dependencies
npm install

# 6. Build new frontend
npm run build

# 7. Fix permissions
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist

# 8. Restart Nginx
sudo systemctl restart nginx
```

### Part C: Verify Cache Headers (If Not Done)

```bash
# 1. Edit config
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com

# 2. Find location / block and add headers:
location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;
    try_files $uri $uri/ /index.html;
}

# 3. Save and restart
sudo nginx -t && sudo systemctl restart nginx
```

---

## 🚀 One-Command Complete Update

### Backend Update
```bash
cd /var/www/primeacademy_backend && \
git pull origin main && \
npm install && \
pm2 stop primeacademy-backend && \
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx && \
pm2 logs primeacademy-backend --lines 10
```

### Frontend Update
```bash
cd /var/www/primeacademy_frontend && \
git pull origin main && \
rm -rf dist node_modules .vite && \
npm cache clean --force && \
npm install && \
npm run build && \
sudo chown -R www-data:www-data dist && \
sudo chmod -R 755 dist && \
sudo systemctl restart nginx
```

---

## 🔍 Diagnostic Commands (Run All)

```bash
echo "=== BACKEND STATUS ==="
pm2 list
echo ""
echo "=== BACKEND LOGS (last 10 lines) ==="
pm2 logs primeacademy-backend --lines 10 --nostream
echo ""
echo "=== BACKEND CODE STATUS ==="
cd /var/www/primeacademy_backend && git log -1 --oneline && git status
echo ""
echo "=== FRONTEND BUILD TIMESTAMP ==="
ls -lth /var/www/primeacademy_frontend/dist/assets/ | head -3
echo ""
echo "=== FRONTEND CODE STATUS ==="
cd /var/www/primeacademy_frontend && git log -1 --oneline && git status
echo ""
echo "=== FRONTEND HEADERS ==="
curl -I https://crm.prashantthakar.com | grep -E "Last-Modified|Cache-Control"
echo ""
echo "=== BACKEND API TEST ==="
curl -I https://api.prashantthakar.com/api/health
```

---

## 🎯 Most Likely Issues

### Issue 1: Backend Not Restarted
**Symptom:** Frontend shows old data, API returns old responses
**Fix:** Restart backend with `pm2 restart primeacademy-backend`

### Issue 2: Frontend Not Rebuilt
**Symptom:** UI looks old, old features missing
**Fix:** Rebuild frontend with `npm run build`

### Issue 3: Browser Cache
**Symptom:** Even after server updates, browser shows old code
**Fix:** Clear browser cache, use incognito, add cache headers to Nginx

### Issue 4: Both Frontend and Backend Old
**Symptom:** Everything is old
**Fix:** Update both (see Part A and Part B above)

---

## ✅ Verification Checklist

After updating:

- [ ] Backend is running: `pm2 list` shows `online` ✅
- [ ] Backend code is latest: `git log` shows recent commit ✅
- [ ] Frontend build is recent: `ls -lth dist/assets/` shows today's date ✅
- [ ] Frontend code is latest: `git log` shows recent commit ✅
- [ ] Cache headers present: `curl -I` shows `Cache-Control` ✅
- [ ] Backend API works: `curl https://api.prashantthakar.com/api/health` returns `200` ✅
- [ ] Browser cache cleared: Tested in incognito ✅

---

## 🔥 Quick Fix Sequence

```bash
# 1. Update Backend
cd /var/www/primeacademy_backend
git pull origin main
npm install
pm2 restart primeacademy-backend
pm2 logs primeacademy-backend --lines 10

# 2. Update Frontend
cd /var/www/primeacademy_frontend
git pull origin main
rm -rf dist node_modules .vite
npm install
npm run build
sudo chown -R www-data:www-data dist
sudo systemctl restart nginx

# 3. Verify
curl -I https://crm.prashantthakar.com | grep Cache-Control
curl -I https://api.prashantthakar.com/api/health

# 4. Clear browser cache and test!
```

---

## 📋 Summary

**The exact problem could be:**
1. **Backend not restarted** after code update
2. **Frontend not rebuilt** after code update
3. **Both** frontend and backend need updates
4. **Browser cache** showing old code

**Solution:** Update both backend and frontend, restart services, add cache headers, clear browser cache.

**After this:** Everything should work with new code! ✅




