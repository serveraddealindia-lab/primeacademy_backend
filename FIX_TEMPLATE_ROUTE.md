# Fix Template Route Issue - Quick Guide

**Problem:** Route `/api/students/template` not found on VPS  
**Cause:** Code not properly uploaded from GitHub to backend  
**Solution:** Update backend from GitHub and restart

---

## Quick Fix Steps

### Step 1: Connect to VPS
```bash
ssh user@your-vps-ip
# Or
ssh root@your-vps-ip
```

### Step 2: Navigate to Backend Directory
```bash
cd /var/www/primeacademy/backend
# Or wherever your backend is located
```

### Step 3: Check Current Code Status
```bash
# Check if Git is initialized
git status

# Check if route file exists
ls -la src/routes/student.routes.ts

# Check if template route is in the file
grep -n "template" src/routes/student.routes.ts
```

**Expected output:** Should show line 54-60 with the template route definition

### Step 4: Update from GitHub

#### Option A: If Git is already initialized
```bash
# Pull latest code
git pull origin main

# If there are conflicts, check what changed
git status
```

#### Option B: If Git is not initialized or needs fresh clone
```bash
# Go to parent directory
cd ..

# Backup current backend (optional)
cp -r backend backend-backup-$(date +%Y%m%d)

# Remove old backend
rm -rf backend

# Clone fresh from GitHub
git clone https://github.com/serveraddealindia-lab/primeacademy_backend.git backend

# Go back to backend
cd backend
```

### Step 5: Restore Environment File
```bash
# If you backed up, restore .env
cp ../backend-backup-*/backend/.env .env

# Or manually check .env exists
ls -la .env

# If missing, create it with correct values
nano .env
```

**Required .env variables:**
```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=primeacademy_db
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://crm.prashantthakar.com
PORT=3000
NODE_ENV=production
```

### Step 6: Install Dependencies
```bash
npm install
```

### Step 7: Build TypeScript
```bash
npm run build
```

**Check if build succeeded:**
```bash
# Should see dist/ directory
ls -la dist/

# Should see dist/src/index.js
ls -la dist/src/index.js
```

### Step 8: Verify Route is in Built Code
```bash
# Check if route is in compiled JavaScript
grep -n "template" dist/src/routes/student.routes.js

# Check if controller function exists
grep -n "downloadEnrollmentTemplate" dist/src/controllers/student.controller.js
```

### Step 9: Restart Backend
```bash
# Check PM2 status
pm2 status

# Restart backend
pm2 restart primeacademy-backend

# Or if not running with PM2, start it
pm2 start dist/index.js --name primeacademy-backend
pm2 save
```

### Step 10: Check Backend Logs
```bash
# View recent logs
pm2 logs primeacademy-backend --lines 50

# Look for:
# - "Database connection established successfully"
# - "Server is running on port 3000"
# - No errors about missing routes
```

### Step 11: Test the Route
```bash
# Test from VPS (replace YOUR_TOKEN with actual admin token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/students/template \
     --output test_template.xlsx

# Check if file was downloaded
ls -la test_template.xlsx

# If file exists and has content, route is working!
```

### Step 12: Test from Frontend
1. Open browser: `https://crm.prashantthakar.com`
2. Login as admin
3. Go to Student Management
4. Click "Download Template" button
5. Should download `student_enrollment_template.xlsx`

---

## Troubleshooting

### Route Still Not Found After Update

**Check 1: Verify route is registered in index.ts**
```bash
grep -n "studentRoutes" dist/src/index.js
grep -n "/api/students" dist/src/index.js
```

**Check 2: Verify middleware order**
The route should be registered AFTER static file serving but BEFORE error handlers.

**Check 3: Check for TypeScript compilation errors**
```bash
cd /var/www/primeacademy/backend
npm run build 2>&1 | grep -i error
```

**Check 4: Verify controller function is exported**
```bash
grep -n "export.*downloadEnrollmentTemplate" src/controllers/student.controller.ts
```

**Check 5: Check backend is actually running**
```bash
pm2 status
pm2 logs primeacademy-backend --lines 100
```

### Backend Won't Start

**Check logs:**
```bash
pm2 logs primeacademy-backend --lines 100
```

**Common issues:**
- Missing dependencies: `npm install`
- TypeScript not built: `npm run build`
- Wrong .env: Check database credentials
- Port already in use: `lsof -i :3000`

### Route Returns 404

**Check route registration order in index.ts:**
```bash
# Route should be registered as:
# app.use('/api/students', studentRoutes);
```

**Check if route path is correct:**
- Route definition: `/template` in `student.routes.ts`
- Base path: `/api/students` in `index.ts`
- Full path: `/api/students/template`

**Check authentication:**
- Route requires `verifyTokenMiddleware`
- Route requires `checkRole(UserRole.ADMIN, UserRole.SUPERADMIN)`
- Make sure you're logged in as admin

### Route Returns 500 Error

**Check controller function:**
```bash
# Check if XLSX library is installed
grep -n "xlsx" package.json

# If missing, install it
npm install xlsx
npm run build
pm2 restart primeacademy-backend
```

---

## Verification Checklist

- [ ] Connected to VPS
- [ ] Navigated to backend directory
- [ ] Pulled latest code from GitHub (or cloned fresh)
- [ ] Restored .env file with correct values
- [ ] Installed dependencies (`npm install`)
- [ ] Built TypeScript (`npm run build`)
- [ ] Verified route exists in `dist/src/routes/student.routes.js`
- [ ] Verified controller function exists in `dist/src/controllers/student.controller.js`
- [ ] Restarted backend with PM2
- [ ] Checked backend logs for errors
- [ ] Tested route with curl (from VPS)
- [ ] Tested route from frontend (browser)
- [ ] Template downloads successfully

---

## Quick Command Summary

```bash
# All-in-one update command (run from backend directory)
cd /var/www/primeacademy/backend && \
git pull origin main && \
npm install && \
npm run build && \
pm2 restart primeacademy-backend && \
pm2 logs primeacademy-backend --lines 20
```

---

**After completing these steps, the `/api/students/template` route should work!** ✅


