# 🔧 Fix: Wrong Directory & Missing Build Script

## ❌ Problems Found

1. **Wrong directory** - You're in `~` (home) instead of `/var/www/primeacademy_frontend`
2. **Not a git repository** - Git commands failing because you're not in the project directory
3. **Missing build script** - `npm run build` failing because you're in wrong directory
4. **No dist folder** - Build didn't run, so dist doesn't exist

---

## ✅ Step 1: Navigate to Correct Directory

```bash
cd /var/www/primeacademy_frontend
```

**Verify you're in the right place:**
```bash
pwd
# Should show: /var/www/primeacademy_frontend

ls -la
# Should show: package.json, src/, etc.
```

---

## ✅ Step 2: Check if It's a Git Repository

```bash
git status
```

**If it shows "not a git repository":**
- The directory might not be initialized as git repo
- Or it might be a different setup

**Check if .git exists:**
```bash
ls -la .git
```

---

## ✅ Step 3: If Not a Git Repository, Clone It

**If the directory doesn't have .git:**

```bash
# Backup existing files (if any)
cd /var/www
mv primeacademy_frontend primeacademy_frontend_backup

# Clone fresh from GitHub
git clone https://github.com/serveraddealindia-lab/primeacademy_frontend.git

# Or if you have SSH setup:
# git clone git@github.com:serveraddealindia-lab/primeacademy_frontend.git

# Navigate to cloned directory
cd primeacademy_frontend
```

---

## ✅ Step 4: If It Is a Git Repository, Pull Code

```bash
cd /var/www/primeacademy_frontend

# Fix Git ownership (if needed)
git config --global --add safe.directory /var/www/primeacademy_frontend

# Pull latest code
git pull origin main
```

---

## ✅ Step 5: Verify package.json Has Build Script

```bash
cat package.json | grep -A 5 "scripts"
```

**Should show:**
```json
"scripts": {
  "build": "tsc && vite build",
  ...
}
```

**If build script is missing, check if you're in the right directory.**

---

## ✅ Step 6: Clean Rebuild

```bash
# Make sure you're in the right directory
cd /var/www/primeacademy_frontend

# Clean old build
rm -rf dist node_modules .vite

# Clear npm cache
npm cache clean --force

# Install dependencies
npm install

# Build
npm run build
```

**Wait for build to complete** - Should show "✓ built in X.XXs"

---

## ✅ Step 7: Fix Permissions

```bash
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist
```

---

## ✅ Step 8: Restart Nginx

```bash
sudo systemctl restart nginx
```

---

## ✅ Step 9: Verify

```bash
# Check build files exist
ls -lth dist/assets/ | head -3

# Check HTTP headers
curl -I https://crm.prashantthakar.com | grep Last-Modified
```

---

## 🚀 Complete Fix Sequence

```bash
# 1. Navigate to correct directory
cd /var/www/primeacademy_frontend

# 2. Verify directory
pwd
ls -la package.json

# 3. Check if git repo
git status

# 4. If git repo exists, pull code
git config --global --add safe.directory /var/www/primeacademy_frontend
git pull origin main

# 5. Clean rebuild
rm -rf dist node_modules .vite
npm cache clean --force
npm install
npm run build

# 6. Fix permissions
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist

# 7. Restart Nginx
sudo systemctl restart nginx

# 8. Verify
ls -lth dist/assets/ | head -3
```

---

## 🔍 Troubleshooting

### If Directory Doesn't Exist

```bash
# Check if directory exists
ls -la /var/www/

# If primeacademy_frontend doesn't exist, create it and clone
cd /var/www
git clone https://github.com/serveraddealindia-lab/primeacademy_frontend.git
cd primeacademy_frontend
```

### If package.json Missing

```bash
# Check what's in the directory
ls -la /var/www/primeacademy_frontend/

# If no package.json, you're in wrong directory
# Navigate to correct location
cd /var/www/primeacademy_frontend
```

### If Build Still Fails

```bash
# Check Node.js version
node --version
# Should be v18+ or v20+

# Check npm version
npm --version

# Check package.json
cat package.json | grep "build"

# If build script missing, check if you're in frontend directory
```

---

## 📋 Quick Checklist

- [ ] Navigate to `/var/www/primeacademy_frontend` ✅
- [ ] Verify `package.json` exists ✅
- [ ] Check if it's a git repository ✅
- [ ] Pull code (or clone if needed) ✅
- [ ] Verify build script exists ✅
- [ ] Clean rebuild ✅
- [ ] Fix permissions ✅
- [ ] Restart Nginx ✅
- [ ] Verify deployment ✅

---

## ✅ Summary

**The main issue:** You were in the wrong directory (`~` instead of `/var/www/primeacademy_frontend`)

**Fix:**
1. `cd /var/www/primeacademy_frontend`
2. Verify you're in the right place
3. Pull code (or clone if needed)
4. Build and deploy

**After this, deployment will work!** ✅




