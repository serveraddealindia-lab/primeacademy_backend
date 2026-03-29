# 🚨 URGENT: Live Server 404 Error Fix

## Problem
Live server is returning 404 errors for report API endpoints:
- `/api/reports/batch-details`
- `/api/reports/pending-payments`
- `/api/reports/portfolio-status`
- `/api/reports/all-analysis`

## Root Cause
Backend server either:
1. ❌ Not running
2. ❌ Running old code without routes
3. ❌ Routes not properly registered
4. ❌ Environment misconfiguration

---

## ✅ COMPLETE LIVE SERVER FIX

### Files You MUST Upload to Live Server:

#### Backend Files (CRITICAL):
```
✅ src/index.ts                          - Main server file with routes
✅ src/routes/report.routes.ts           - Report routes
✅ src/routes/attendanceReport.routes.ts - Attendance report routes
✅ src/controllers/report.controller.ts  - Report controllers
✅ src/controllers/attendanceReport.controller.ts
✅ package.json                          - Dependencies
✅ .env                                  - Environment variables
✅ All other src/ files
```

#### Frontend Files:
```
✅ frontend/src/pages/ReportManagement.tsx
✅ Rebuild frontend after changes
```

#### Database:
```
✅ Run: fix-student-profiles-schema.js   - Adds missing serialNo column
```

---

## Step-by-Step Deployment Instructions

### STEP 1: Upload Backend Files

**Via SCP/SFTP:**
```bash
# Upload entire backend folder
scp -r src/ user@yourserver:/path/to/Primeacademynew/src/
scp package.json user@yourserver:/path/to/Primeacademynew/
scp .env user@yourserver:/path/to/Primeacademynew/
scp tsconfig.json user@yourserver:/path/to/Primeacademynew/
```

**Key files that MUST be updated:**
1. `src/index.ts` - Lines 486, 505 register the routes
2. `src/routes/report.routes.ts` - All report endpoints
3. `src/controllers/report.controller.ts` - Controller logic

---

### STEP 2: Install Dependencies on Server

SSH to your server:
```bash
ssh user@yourserver

cd /path/to/Primeacademynew

# Install/update dependencies
npm install

# Verify package.json has these dependencies:
# - express
# - sequelize
# - mysql2
# - dotenv
# - cors
# - helmet
# - morgan
```

---

### STEP 3: Run Database Migration

```bash
# On your server, run the schema fix
node fix-student-profiles-schema.js
```

Expected output:
```
✓ serialNo column added successfully!
✓ Column verified: { COLUMN_NAME: 'serialNo', ... }
Done!
```

---

### STEP 4: Build Frontend

```bash
cd /path/to/Primeacademynew/frontend

# Install dependencies if needed
npm install

# Build production version
npm run build
```

---

### STEP 5: Restart Backend Server

**Option A: Using PM2 (Recommended for Production)**
```bash
# If using PM2
pm2 restart primeacademy-backend
# OR
pm2 start ecosystem.config.js
```

**Option B: Manual Start**
```bash
cd /path/to/Primeacademynew

# Stop any existing node processes
pkill -f "node.*index.js"

# Start in production mode
NODE_ENV=production npm start
```

**Option C: Using systemd Service**
```bash
# If you have a systemd service
sudo systemctl restart primeacademy
sudo systemctl status primeacademy
```

---

### STEP 6: Verify Backend is Running

```bash
# Check if port 3001 (or your configured port) is listening
netstat -tlnp | grep 3001

# Test an endpoint locally
curl http://localhost:3001/api/health

# Should return something like:
# {"status":"ok","timestamp":"..."}
```

---

### STEP 7: Test All Report Endpoints

Test each endpoint from your browser:

1. **Students Without Batch:**
   ```
   https://api.prashantthakar.com/api/attendance-reports/students-without-batch
   ```

2. **Pending Payments:**
   ```
   https://api.prashantthakar.com/api/reports/pending-payments
   ```

3. **Portfolio Status:**
   ```
   https://api.prashantthakar.com/api/reports/portfolio-status
   ```

4. **Batch Details:**
   ```
   https://api.prashantthakar.com/api/reports/batch-details?type=present
   ```

5. **All Analysis:**
   ```
   https://api.prashantthakar.com/api/reports/all-analysis
   ```

**All should return 200 OK with JSON data (not 404!)**

---

## 🔍 Troubleshooting 404 Errors

### If Still Getting 404:

#### 1. Check Backend Logs
```bash
# View logs (adjust based on how you run backend)
pm2 logs primeacademy-backend
# OR check systemd logs
journalctl -u primeacademy -f
# OR check console output if running manually
```

Look for:
- ✅ "Server is running on port 3001"
- ✅ "Registered API Routes"
- ✅ "/api/reports" route registration
- ❌ Any error messages

#### 2. Verify Routes Are Registered

Add this temporarily to `src/index.ts` after route registration:
```typescript
console.log('=== REGISTERED ROUTES ===');
console.log('GET /api/reports/batch-details');
console.log('GET /api/reports/pending-payments');
console.log('GET /api/reports/portfolio-status');
console.log('GET /api/reports/all-analysis');
console.log('GET /api/attendance-reports/students-without-batch');
console.log('=========================');
```

Restart backend and check logs.

#### 3. Check .env Configuration

Ensure your `.env` file on server has:
```env
PORT=3001
NODE_ENV=production
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=primeacademy_db
FRONTEND_URL=https://crm.prashantthakar.com
```

#### 4. Test Authentication

The reports require admin authentication. Make sure:
- You're logged in as admin
- Token is being sent in headers
- Token hasn't expired

Check browser Network tab → Request Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 5. Check Nginx Configuration (If Using Reverse Proxy)

If using Nginx, ensure it's proxying to backend correctly:

```nginx
location /api/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Then restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📋 Quick Checklist

Before testing, verify:

- [ ] Backend files uploaded to server
- [ ] `npm install` completed successfully
- [ ] Database migration ran (`fix-student-profiles-schema.js`)
- [ ] Frontend rebuilt (`npm run build`)
- [ ] Backend server restarted
- [ ] Port 3001 (or configured port) is listening
- [ ] No errors in backend logs
- [ ] Logged in as admin user
- [ ] Valid auth token in browser

---

## 🎯 Expected Results After Fix

### In Browser Console (Network Tab):
```
✅ GET /api/attendance-reports/students-without-batch → 200 OK
✅ GET /api/reports/pending-payments → 200 OK  
✅ GET /api/reports/portfolio-status → 200 OK
✅ GET /api/reports/batch-details → 200 OK
✅ GET /api/reports/all-analysis → 200 OK
```

### In Application:
- ✅ All reports load without errors
- ✅ Download CSV buttons appear
- ✅ CSV downloads work
- ✅ Data matches UI tables

---

## 🆘 Emergency Rollback

If something breaks:

```bash
# Stop backend
pm2 stop primeacademy-backend

# Restore backup (if you made one)
cp -r /path/to/backup/primeacademy-backup/* /path/to/Primeacademynew/

# Restart
pm2 start primeacademy-backend
```

---

## 📞 Support Commands

### Check if backend is running:
```bash
ps aux | grep node
# or
pm2 list
```

### View backend logs:
```bash
tail -f /var/log/primeacademy/error.log
# or
pm2 logs primeacademy-backend
```

### Restart everything:
```bash
# Stop all
pm2 stop all

# Start backend
cd /path/to/Primeacademynew
npm start

# Or with PM2
pm2 start ecosystem.config.js
```

---

## ✅ Final Verification

After completing all steps, test in order:

1. Open browser DevTools → Network tab
2. Go to Reports page
3. Click each report type
4. Check Network tab - should see 200 OK (not 404!)
5. Click "Download CSV" buttons
6. Verify CSV downloads and matches UI

**If all show 200 OK → SUCCESS! 🎉**

**If still 404 → Check backend logs immediately for the exact error**
