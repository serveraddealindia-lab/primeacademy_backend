# 🔧 CRITICAL: Fix Faculty in Production - Complete Diagnostic & Fix

## 🚨 The Problem
- ✅ Faculty works perfectly in LOCAL
- ❌ Faculty NOT working in PRODUCTION
- ✅ Everything else works in production

## 🎯 Root Cause
The backend code with JSON parsing fixes hasn't been deployed/restarted in production, OR there's a caching issue.

## ✅ COMPLETE FIX - Run These Commands on VPS

### Step 1: SSH into VPS and Navigate to Backend
```bash
cd /var/www/Primeacademy/backend
# OR
cd /var/www/primeacademy_backend
```

### Step 2: Pull Latest Code from GitHub
```bash
git pull origin main
```

### Step 3: Verify the Fix is in the Code
```bash
# Check if JSON parsing code exists
grep -n "Parse documents if it's a string - CRITICAL for production" src/controllers/user.controller.ts

# Should show lines with the parsing code
# If it doesn't show anything, the code wasn't pulled
```

### Step 4: Rebuild Backend (CRITICAL!)
```bash
npm run build
```

### Step 5: Restart Backend with PM2
```bash
pm2 restart backend-api
# Wait 5 seconds
sleep 5
pm2 logs backend-api --lines 50
```

### Step 6: Test API Directly
```bash
# Get your JWT token from browser (localStorage.getItem('token'))
# Replace YOUR_TOKEN and FACULTY_USER_ID below

curl -X GET "https://api.prashantthakar.com/api/users/FACULTY_USER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" | jq '.data.user.facultyProfile.documents'

# Check the output:
# ✅ GOOD: Should show an object like {"personalInfo": {...}, "employmentInfo": {...}}
# ❌ BAD: Shows a string like "{\"personalInfo\": {...}}" - means parsing failed
```

### Step 7: Check Backend Logs for Parsing
```bash
pm2 logs backend-api --lines 100 | grep -i "parsed documents\|documents is already\|documents is null"
```

**What to look for:**
- `Successfully parsed documents JSON for faculty X` ✅
- `Documents is already an object for faculty X` ✅
- `Documents is null/undefined for faculty X, setting to empty object` ✅
- `Failed to parse documents JSON` ❌ (if you see this, there's a JSON format issue)

### Step 8: Rebuild Frontend (if needed)
```bash
cd /var/www/Primeacademy/frontend
# OR
cd /var/www/primeacademy_frontend

git pull origin main
npm run build
# Copy to web directory
sudo cp -r dist/* /var/www/html/
# OR wherever your frontend is served from
```

### Step 9: Clear ALL Caches
```bash
# Clear nginx cache
sudo systemctl reload nginx

# In browser:
# 1. Press Ctrl+Shift+Delete
# 2. Select "Cached images and files"
# 3. Clear data
# OR use Incognito/Private mode
```

## 🔍 Diagnostic Commands

### Check if Backend is Running Latest Code
```bash
# Check when backend was last restarted
pm2 info backend-api | grep "restart time"

# Check if dist folder has latest code
ls -la dist/controllers/user.controller.js
stat dist/controllers/user.controller.js
```

### Check Database - Verify Data Exists
```bash
mysql -u your_user -p primeacademy -e "
SELECT 
  id, 
  userId,
  JSON_TYPE(documents) as documents_type,
  JSON_EXTRACT(documents, '$.personalInfo.gender') as gender,
  JSON_EXTRACT(documents, '$.employmentInfo.department') as department
FROM faculty_profiles 
WHERE userId IN (SELECT id FROM users WHERE role = 'faculty' LIMIT 1);
"
```

### Check API Response Structure
```bash
# Test with a real faculty user ID
curl -X GET "https://api.prashantthakar.com/api/users/FACULTY_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.data.user.facultyProfile | {
    hasDocuments: (.documents != null),
    documentsType: (if .documents then (type) else "null" end),
    hasPersonalInfo: (.documents.personalInfo != null),
    hasEmploymentInfo: (.documents.employmentInfo != null)
  }'
```

## 🐛 Common Issues & Fixes

### Issue 1: Code Not Deployed
**Symptom:** `grep` doesn't find the parsing code
**Fix:**
```bash
git pull origin main
npm run build
pm2 restart backend-api
```

### Issue 2: Backend Not Restarted
**Symptom:** Old code still running
**Fix:**
```bash
pm2 restart backend-api
pm2 logs backend-api --lines 20
```

### Issue 3: Build Failed
**Symptom:** `npm run build` shows errors
**Fix:**
```bash
npm install
npm run build
```

### Issue 4: Documents Still String
**Symptom:** API returns documents as string
**Fix:** Check backend logs for parsing errors:
```bash
pm2 logs backend-api | grep -i "failed to parse\|error parsing"
```

### Issue 5: Frontend Cache
**Symptom:** Changes not showing in browser
**Fix:**
- Clear browser cache (Ctrl+Shift+Delete)
- Use Incognito mode
- Hard refresh (Ctrl+F5)

## ✅ Verification Checklist

After running all steps, verify:

- [ ] Backend code pulled from GitHub
- [ ] Backend rebuilt (`npm run build` succeeded)
- [ ] Backend restarted (`pm2 restart backend-api`)
- [ ] API returns `documents` as object (not string)
- [ ] Backend logs show "Successfully parsed documents" or "Documents is already an object"
- [ ] Frontend rebuilt (if frontend code changed)
- [ ] Browser cache cleared
- [ ] Faculty view shows data (not "Not provided")
- [ ] Faculty edit form populates with data

## 🚀 Quick One-Liner Fix

If you're confident, run this:
```bash
cd /var/www/Primeacademy/backend && \
git pull origin main && \
npm run build && \
pm2 restart backend-api && \
sleep 5 && \
pm2 logs backend-api --lines 30
```

Then test in browser with cache cleared.

