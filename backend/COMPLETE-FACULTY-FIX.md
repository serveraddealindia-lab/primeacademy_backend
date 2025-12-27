# COMPLETE FACULTY FIX - Step by Step

## Why It Works in Local But Not Live

**Common Causes:**
1. Database column types different (TEXT vs JSON)
2. Backend not restarted after code update
3. Frontend build not deployed
4. Sequelize returning strings instead of objects
5. MySQL version differences

## COMPLETE FIX - Follow These Steps EXACTLY

### STEP 1: Fix Database (CRITICAL)

```bash
# SSH into VPS
mysql -u primeacademy_user -p primeacademy_db
```

Then run this SQL:

```sql
-- Check current column types
DESCRIBE faculty_profiles;

-- Fix documents column
ALTER TABLE faculty_profiles 
MODIFY COLUMN documents JSON;

-- Fix expertise column  
ALTER TABLE faculty_profiles 
MODIFY COLUMN expertise JSON;

-- Fix availability column
ALTER TABLE faculty_profiles 
MODIFY COLUMN availability JSON;

-- Verify
DESCRIBE faculty_profiles;
-- All three should show "json" as type

-- Test with actual data
SELECT id, userId, 
  JSON_TYPE(documents) as documents_type,
  JSON_TYPE(expertise) as expertise_type,
  JSON_TYPE(availability) as availability_type
FROM faculty_profiles 
WHERE userId = 230;
-- Should all show "OBJECT" not "NULL"
```

### STEP 2: Update Backend Code

```bash
cd /var/www/primeacademy_backend

# Pull latest code
git fetch origin
git reset --hard origin/main

# Verify the fix is in the code
grep -n "Parse documents if it's a string" src/controllers/user.controller.ts
# Should show line numbers (around 341, 422)

# Rebuild
npm run build

# Check if build succeeded
ls -la dist/controllers/user.controller.js
# File should exist and be recent
```

### STEP 3: Restart Backend (CRITICAL)

```bash
# Stop backend completely
pm2 delete backend-api

# Start fresh
cd /var/www/primeacademy_backend
pm2 start dist/index.js --name backend-api
pm2 save

# Check logs
pm2 logs backend-api --lines 50
# Should NOT show any errors

# Test if backend is running
curl http://localhost:3001/api/health
# Should return success
```

### STEP 4: Update Frontend Code

```bash
cd /var/www/Primeacademy/frontend

# Pull latest code
git fetch origin
git reset --hard origin/main

# Rebuild
npm run build

# Check if build succeeded
ls -la dist/
# Should have index.html and assets folder

# Deploy
sudo rm -rf /var/www/crm.prashantthakar.com/*
sudo cp -r dist/* /var/www/crm.prashantthakar.com/

# Verify
ls -la /var/www/crm.prashantthakar.com/
# Should have index.html
```

### STEP 5: Clear ALL Caches

```bash
# Clear nginx cache
sudo systemctl reload nginx

# Clear PM2 logs (optional)
pm2 flush
```

**In Browser:**
- Press `Ctrl+Shift+Delete`
- Select "All time"
- Check "Cached images and files"
- Clear data
- Close browser completely
- Reopen browser

### STEP 6: Test API Directly

Open browser console (F12) and run:

```javascript
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
fetch('https://api.prashantthakar.com/api/users/230', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('=== FULL RESPONSE ===');
  console.log(JSON.stringify(data, null, 2));
  
  const profile = data?.data?.user?.facultyProfile;
  console.log('\n=== PROFILE CHECK ===');
  console.log('Has Profile:', !!profile);
  console.log('Documents Type:', typeof profile?.documents);
  
  if (typeof profile?.documents === 'string') {
    console.error('❌ STILL A STRING! Backend parsing failed!');
    console.error('Documents value:', profile.documents.substring(0, 200));
  } else if (profile?.documents && typeof profile.documents === 'object') {
    console.log('✅ Documents is OBJECT');
    console.log('Personal Info:', profile.documents.personalInfo);
    console.log('Employment Info:', profile.documents.employmentInfo);
  } else {
    console.error('❌ No documents or null');
  }
});
```

### STEP 7: Verify Everything

**Check 1: Backend Logs**
```bash
pm2 logs backend-api --lines 100 | grep -i "faculty\|230\|parse"
```
Should NOT show "Failed to parse" errors

**Check 2: Database**
```sql
SELECT 
  id, 
  userId,
  JSON_TYPE(documents) as doc_type,
  JSON_EXTRACT(documents, '$.personalInfo.address') as address
FROM faculty_profiles 
WHERE userId = 230;
```
- `doc_type` should be "OBJECT"
- `address` should show actual address value

**Check 3: Frontend Console**
- Open faculty edit page
- Check console for errors
- Should see "Faculty data fetched successfully"
- Should see "Parsing documents:" with type "object"

## If Still Not Working

### Nuclear Option: Complete Reset

```bash
# 1. Stop everything
pm2 delete backend-api
sudo systemctl stop nginx

# 2. Fix database
mysql -u primeacademy_user -p primeacademy_db < fix-faculty-profiles-table.sql

# 3. Fresh backend start
cd /var/www/primeacademy_backend
git pull origin main
rm -rf node_modules dist
npm install
npm run build
pm2 start dist/index.js --name backend-api
pm2 save

# 4. Fresh frontend deploy
cd /var/www/Primeacademy/frontend
git pull origin main
rm -rf node_modules dist
npm install
npm run build
sudo rm -rf /var/www/crm.prashantthakar.com/*
sudo cp -r dist/* /var/www/crm.prashantthakar.com/

# 5. Restart nginx
sudo systemctl start nginx
sudo systemctl reload nginx

# 6. Check logs
pm2 logs backend-api --lines 50
```

## Most Common Issue

**90% of the time, it's one of these:**

1. **Database column is TEXT, not JSON**
   - Fix: Run the ALTER TABLE commands in STEP 1

2. **Backend not restarted**
   - Fix: `pm2 delete backend-api && pm2 start dist/index.js --name backend-api`

3. **Frontend not rebuilt**
   - Fix: `npm run build && sudo cp -r dist/* /var/www/crm.prashantthakar.com/`

## Success Indicators

✅ API returns `documents` as object (not string)
✅ Database shows JSON_TYPE as "OBJECT"
✅ Backend logs show no parsing errors
✅ Frontend console shows "Parsing documents: type object"
✅ Form fields populate with data
✅ View modal shows all information

## After Following All Steps

If it STILL doesn't work, share:
1. Output of the API test script (STEP 6)
2. Database query result (STEP 7, Check 2)
3. Backend logs (STEP 7, Check 1)
4. Frontend console errors

This will tell us exactly what's wrong.

