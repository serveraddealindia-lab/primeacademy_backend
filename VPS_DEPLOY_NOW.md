# VPS Deployment Commands - Complete Guide

## Step 1: SSH into VPS
```bash
ssh root@your-vps-ip
# OR
ssh username@your-vps-ip
```

## Step 2: Navigate to Backend Directory
```bash
cd /var/www/primeacademy_backend
```

## Step 3: Pull Latest Code from GitHub
```bash
git pull origin main
```

## Step 4: Install Dependencies (if package.json changed)
```bash
npm install
```

## Step 5: Build TypeScript Code
```bash
npm run build
```

## Step 6: Restart Backend with PM2
```bash
pm2 restart primeacademy-backend
# OR if using different name:
pm2 restart all
```

## Step 7: Check Status and Logs
```bash
pm2 status
pm2 logs primeacademy-backend --lines 50
```

---

## Complete One-Line Command Sequence:
```bash
cd /var/www/primeacademy_backend && git pull origin main && npm install && npm run build && pm2 restart primeacademy-backend && pm2 logs primeacademy-backend --lines 50
```

---

## Step-by-Step Commands (Copy-Paste Ready):

```bash
# 1. Navigate to backend
cd /var/www/primeacademy_backend

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm install

# 4. Build code
npm run build

# 5. Restart server
pm2 restart primeacademy-backend

# 6. Check status
pm2 status

# 7. View logs
pm2 logs primeacademy-backend --lines 50
```

---

## Verify Deployment:

### Check if students are now showing:
```bash
# Check logs for student query
pm2 logs primeacademy-backend | grep -i "students"

# Should see: "Get all students: Found X students"
```

### Test API endpoint:
```bash
# Test the students endpoint (replace with your actual token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/attendance-reports/all-students
```

---

## Troubleshooting:

### If git pull fails:
```bash
# Check current branch
git branch

# Check remote
git remote -v

# If needed, add GitHub remote
git remote add origin https://github.com/serveraddealindia-lab/primeacademy_backend.git
```

### If npm install fails:
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

### If build fails:
```bash
# Check for TypeScript errors
npm run build

# Check Node version (should be >= 18)
node --version
```

### If PM2 not found:
```bash
# Install PM2 globally
npm install -g pm2

# Start backend
pm2 start dist/index.js --name primeacademy-backend
pm2 save
```

### If PM2 restart fails:
```bash
# Check PM2 status
pm2 list

# Check if process exists
pm2 describe primeacademy-backend

# If not running, start it
pm2 start dist/index.js --name primeacademy-backend
```

---

## After Deployment:

1. ✅ Code pulled from GitHub
2. ✅ Dependencies installed
3. ✅ TypeScript compiled
4. ✅ Server restarted
5. ✅ Check logs to verify students are being fetched correctly
6. ✅ Test in browser - Students should now show in "Students" tab

---

## Quick Reference:

```bash
cd /var/www/primeacademy_backend
git pull origin main
npm install
npm run build
pm2 restart primeacademy-backend
pm2 logs primeacademy-backend --lines 50
```

