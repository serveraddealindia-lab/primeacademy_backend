# 🔧 Fix Git Ownership Error & Continue Deployment

## ❌ Error: Git Ownership Issue

**Error:** `fatal: detected dubious ownership in repository at '/var/www/primeacademy_frontend'`

**Cause:** Git security feature - repository is owned by different user than current user.

---

## ✅ Step 1: Fix Git Ownership (Run on VPS)

### Option A: Add Safe Directory (Recommended)

```bash
git config --global --add safe.directory /var/www/primeacademy_frontend
```

**This tells Git to trust this directory.**

### Option B: Fix Ownership (Alternative)

```bash
sudo chown -R root:root /var/www/primeacademy_frontend
```

**Or if you want to use www-data:**
```bash
sudo chown -R www-data:www-data /var/www/primeacademy_frontend
```

**Note:** If using www-data, you'll need to run git commands with sudo or switch user.

---

## ✅ Step 2: Verify Fix

```bash
git pull origin main
```

**Should now work without errors.**

---

## ✅ Step 3: Continue Deployment

After fixing Git ownership, continue with deployment:

```bash
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

## 🚀 Complete Fix & Deploy (One Command)

```bash
# Fix Git ownership
git config --global --add safe.directory /var/www/primeacademy_frontend && \
# Pull code
git pull origin main && \
# Clean rebuild
rm -rf dist node_modules .vite && \
npm cache clean --force && \
npm install && \
npm run build && \
# Fix permissions
sudo chown -R www-data:www-data dist && \
sudo chmod -R 755 dist && \
# Restart Nginx
sudo systemctl restart nginx && \
# Verify
echo "✅ Deployment complete!" && \
ls -lth dist/assets/ | head -3
```

---

## 🔍 Troubleshooting

### If Git Still Shows Error

```bash
# Check current ownership
ls -la /var/www/primeacademy_frontend | head -5

# Check Git config
git config --global --get-all safe.directory

# If needed, add more directories
git config --global --add safe.directory /var/www/primeacademy_backend
```

### If Build Fails

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# If versions are old, update Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### If Permissions Still Wrong

```bash
# Check dist folder ownership
ls -la dist/ | head -5

# Fix ownership
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist

# Verify Nginx can read
sudo -u www-data ls -la dist/
```

---

## 📋 Quick Checklist

- [ ] Fix Git ownership: `git config --global --add safe.directory /var/www/primeacademy_frontend` ✅
- [ ] Pull code: `git pull origin main` ✅
- [ ] Clean rebuild: `rm -rf dist node_modules .vite && npm install && npm run build` ✅
- [ ] Fix permissions: `sudo chown -R www-data:www-data dist` ✅
- [ ] Restart Nginx: `sudo systemctl restart nginx` ✅
- [ ] Verify: `ls -lth dist/assets/ | head -3` ✅

---

## ✅ Summary

**Next Steps:**

1. **Fix Git ownership:**
   ```bash
   git config --global --add safe.directory /var/www/primeacademy_frontend
   ```

2. **Continue deployment:**
   ```bash
   git pull origin main
   rm -rf dist node_modules .vite
   npm install && npm run build
   sudo chown -R www-data:www-data dist
   sudo systemctl restart nginx
   ```

**After this, deployment will be complete!** ✅




