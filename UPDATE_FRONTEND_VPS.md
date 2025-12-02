# Update Frontend on VPS from GitHub

## ✅ Backend is Done - Now Update Frontend

---

## 📦 Step 1: Navigate to Frontend Directory

```bash
cd /var/www/primeacademy_frontend

# Verify you're in the right place
pwd
ls -la
```

---

## 🔄 Step 2: Pull Latest Code from GitHub

```bash
# Check current status
git status

# Check current remote
git remote -v

# If remote is not set to GitHub, update it:
git remote set-url origin https://github.com/serveraddealindia-lab/primeacademy_frontend.git

# Pull latest code
git pull origin main

# If you get "unrelated histories" error:
# git pull origin main --allow-unrelated-histories
```

---

## 📥 Step 3: Install/Update Dependencies

```bash
# Install all dependencies (including new ones)
npm install

# This will install any new packages from package.json
```

---

## 🏗️ Step 4: Update Environment Variables

```bash
# Check current environment file
cat .env.production

# Edit if needed
nano .env.production
```

**Make sure it has:**
```env
VITE_API_URL=https://api.prashantthakar.com/api
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

---

## 🔨 Step 5: Build Frontend for Production

```bash
# Build the frontend (creates dist/ folder)
npm run build

# Verify build was successful
ls -la dist/

# You should see:
# - index.html
# - assets/ folder with JS and CSS files
```

**If build fails:**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

## 🔄 Step 6: Reload Nginx (if needed)

```bash
# Test nginx configuration
sudo nginx -t

# Reload nginx to serve new frontend build
sudo systemctl reload nginx

# Or restart nginx
sudo systemctl restart nginx
```

---

## ✅ Step 7: Verify Frontend is Working

### Check in Browser:
1. Visit: https://crm.prashantthakar.com
2. Open browser console (F12)
3. Check for errors
4. Try logging in
5. Test new features (certificate management, etc.)

### Check Nginx is Serving Correct Directory:
```bash
# Verify nginx config points to dist folder
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com | grep root

# Should show something like:
# root /var/www/primeacademy_frontend/dist;
```

---

## 🎯 Complete Update Sequence

Run these commands in order:

```bash
# 1. Navigate to frontend
cd /var/www/primeacademy_frontend

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm install

# 4. Update environment (if needed)
nano .env.production
# Make sure VITE_API_URL=https://api.prashantthakar.com/api
# Save: Ctrl+X, Y, Enter

# 5. Build frontend
npm run build

# 6. Verify build
ls -la dist/

# 7. Reload nginx
sudo systemctl reload nginx

# 8. Test in browser
# Visit: https://crm.prashantthakar.com
```

---

## 🐛 Troubleshooting

### Issue: Git Pull Fails
```bash
# Check if you have uncommitted changes
git status

# Stash changes if needed
git stash

# Then pull
git pull origin main

# Restore stashed changes
git stash pop
```

### Issue: npm install Fails
```bash
# Clear cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Build Fails
```bash
# Check for errors in build output
npm run build 2>&1 | tee build.log

# Common issues:
# - Missing dependencies: npm install
# - TypeScript errors: Check src/ files
# - Environment variables: Check .env.production
```

### Issue: Frontend Shows Old Version
```bash
# Clear browser cache (Ctrl+Shift+Delete)
# Or hard refresh (Ctrl+F5)

# Verify nginx is serving correct directory
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com | grep root

# Rebuild frontend
cd /var/www/primeacademy_frontend
npm run build

# Reload nginx
sudo systemctl reload nginx
```

### Issue: API Calls Fail (404 or CORS)
```bash
# Check .env.production has correct API URL
cat .env.production

# Should have:
# VITE_API_URL=https://api.prashantthakar.com/api

# Rebuild after changing .env.production
npm run build
```

### Issue: Login Not Working
```bash
# 1. Check backend is running
curl http://localhost:3000/api/health

# 2. Check frontend API URL
cat .env.production

# 3. Check browser console for errors (F12)
# 4. Check network tab in browser (F12 > Network)
```

---

## 📝 Quick Update Script

Create this script for future updates:

```bash
#!/bin/bash
# update-frontend.sh

set -e

echo "🚀 Updating frontend..."

cd /var/www/primeacademy_frontend

echo "📦 Pulling latest code..."
git pull origin main

echo "📥 Installing dependencies..."
npm install

echo "🏗️ Building frontend..."
npm run build

echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo "✅ Frontend update complete!"
echo "🌐 Visit: https://crm.prashantthakar.com"
```

Make it executable:
```bash
chmod +x update-frontend.sh
```

Run it:
```bash
./update-frontend.sh
```

---

## ✅ Verification Checklist

After update, verify:

- [ ] Code pulled: `git log -1` shows latest commit
- [ ] Dependencies installed: `npm list` shows no missing packages
- [ ] Build successful: `ls -la dist/` shows files
- [ ] Environment correct: `cat .env.production` shows correct API URL
- [ ] Nginx reloaded: `sudo systemctl status nginx` shows active
- [ ] Frontend loads: Browser shows https://crm.prashantthakar.com
- [ ] No console errors: Browser console (F12) shows no errors
- [ ] Login works: Can log in successfully
- [ ] API calls work: Network tab shows successful API requests
- [ ] New features work: Certificate management, etc. accessible

---

## 🔍 Quick Verification Commands

```bash
# Check frontend code is updated
cd /var/www/primeacademy_frontend
git log -1 --oneline

# Check build exists
ls -la dist/index.html

# Check environment
cat .env.production

# Check nginx status
sudo systemctl status nginx

# Test frontend is accessible
curl -I https://crm.prashantthakar.com
```

---

## 📞 Still Having Issues?

If frontend still doesn't work:

1. **Check browser console** (F12) for JavaScript errors
2. **Check network tab** (F12 > Network) for failed requests
3. **Check nginx error logs**: `sudo tail -f /var/log/nginx/error.log`
4. **Verify backend is running**: `curl http://localhost:3000/api/health`
5. **Check file permissions**: `ls -la /var/www/primeacademy_frontend/dist`

Share the errors you see for specific help!




