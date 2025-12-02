# 🚀 Deploy Fixed Frontend to VPS

## 📋 Step-by-Step Deployment Guide

---

## 🔧 Step 1: Commit Changes to Git (Local)

### Check What Changed
```bash
cd C:\Users\ADDEAL\Primeacademy\frontend
git status
```

### Add All Changes
```bash
git add .
```

### Commit Changes
```bash
git commit -m "Fix TypeScript build errors - StudentManagement, CertificateManagement, and cleanup unused code"
```

### Push to GitHub
```bash
git push origin main
```

**Verify on GitHub:** Check that your changes are pushed to `https://github.com/serveraddealindia-lab/primeacademy_frontend.git`

---

## 🚀 Step 2: Deploy to VPS

### Connect to VPS
```bash
ssh root@your_vps_ip
# Or use your VPS provider's SSH console
```

### Navigate to Frontend Directory
```bash
cd /var/www/primeacademy_frontend
```

### Pull Latest Code
```bash
git pull origin main
```

**Verify:** Check that new code was pulled
```bash
git log -1 --oneline
```

---

## 🔨 Step 3: Clean Rebuild

### Remove Old Build
```bash
rm -rf dist node_modules .vite
```

### Clear npm Cache
```bash
npm cache clean --force
```

### Install Dependencies
```bash
npm install
```

### Build Frontend
```bash
npm run build
```

**Wait for build to complete** - Should show "✓ built in X.XXs"

---

## 🔐 Step 4: Fix Permissions

```bash
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist
```

---

## 🔄 Step 5: Restart Nginx

```bash
sudo systemctl restart nginx
```

---

## ✅ Step 6: Verify Deployment

### Check Build Files
```bash
ls -lth dist/assets/ | head -5
```

**Should show recent files (just now).**

### Check HTTP Headers
```bash
curl -I https://crm.prashantthakar.com | grep -E "Last-Modified|Cache-Control"
```

**Should show:**
- `Last-Modified:` with recent timestamp
- `Cache-Control: no-cache, no-store, must-revalidate, max-age=0` (if configured)

### Test in Browser
1. Clear browser cache: `Ctrl+Shift+Delete` → Clear cached images
2. Or use Incognito/Private window
3. Visit: `https://crm.prashantthakar.com`
4. Check browser console (F12) for errors

---

## 🚀 Quick Deployment Script (Copy-Paste)

```bash
# Navigate to frontend
cd /var/www/primeacademy_frontend

# Pull latest code
git pull origin main

# Clean rebuild
rm -rf dist node_modules .vite
npm cache clean --force
npm install
npm run build

# Fix permissions
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist

# Restart Nginx
sudo systemctl restart nginx

# Verify
ls -lth dist/assets/ | head -3
curl -I https://crm.prashantthakar.com | grep Last-Modified
```

---

## 🔍 Troubleshooting

### Build Fails on VPS

```bash
# Check Node.js version
node --version
# Should be v18+ or v20+

# Check npm version
npm --version

# If Node.js is old, update it:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Git Pull Fails

```bash
# Check if you have uncommitted changes
git status

# If yes, stash them:
git stash
git pull origin main
git stash pop
```

### Permissions Issues

```bash
# Check current permissions
ls -la dist/

# Fix ownership
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist

# Check Nginx can read files
sudo -u www-data ls -la dist/
```

### Old Code Still Showing

```bash
# 1. Verify build timestamp
ls -lth dist/assets/ | head -3

# 2. Check Nginx is serving correct directory
sudo nginx -T | grep -A 5 "crm.prashantthakar.com" | grep root

# 3. Verify cache headers
curl -I https://crm.prashantthakar.com | grep Cache-Control

# 4. If headers missing, add them (see previous guides)

# 5. Clear browser cache completely
```

---

## 📋 Deployment Checklist

### Before Deployment:
- [ ] All TypeScript errors fixed ✅
- [ ] Build successful locally ✅
- [ ] Changes committed to Git ✅
- [ ] Changes pushed to GitHub ✅

### On VPS:
- [ ] Pulled latest code from GitHub ✅
- [ ] Removed old build files ✅
- [ ] Installed dependencies ✅
- [ ] Build completed successfully ✅
- [ ] Permissions fixed ✅
- [ ] Nginx restarted ✅
- [ ] Build files are recent ✅
- [ ] HTTP headers correct ✅

### After Deployment:
- [ ] Browser cache cleared ✅
- [ ] Tested in incognito/private window ✅
- [ ] No console errors ✅
- [ ] All features working ✅

---

## 🎯 Summary

**Local (Windows):**
1. `git add .`
2. `git commit -m "Fix TypeScript errors"`
3. `git push origin main`

**VPS (Linux):**
1. `cd /var/www/primeacademy_frontend`
2. `git pull origin main`
3. `rm -rf dist node_modules .vite`
4. `npm install && npm run build`
5. `sudo chown -R www-data:www-data dist`
6. `sudo systemctl restart nginx`

**After this, new code will be live!** ✅

---

## 🔥 One-Command Deployment (After Git Push)

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
echo "✅ Deployment complete!" && \
ls -lth dist/assets/ | head -3
```

---

## 📝 Notes

- **Build time:** Usually takes 1-2 minutes
- **Downtime:** Minimal (only during Nginx restart, ~1 second)
- **Rollback:** If issues occur, you can revert with `git checkout <previous-commit>` and rebuild

---

## ✅ After Deployment

1. **Test key pages:**
   - Student Management
   - Certificate Management
   - Other pages

2. **Check browser console:**
   - No errors
   - All API calls working

3. **Verify features:**
   - All functionality working
   - No broken UI elements

**If everything works, deployment is successful!** 🎉




