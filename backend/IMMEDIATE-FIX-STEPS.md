# IMMEDIATE FIX STEPS - Faculty Not Working in Live

## The Problem
1. ✅ React error #31 fixed (objects being rendered)
2. ⚠️ Form fields blank after error
3. ⚠️ Edit form shows blank fields
4. ⚠️ View shows no details

## Root Cause
The React error was crashing the component, causing:
- Form state to reset
- Data not loading properly
- Components to fail silently

## Immediate Actions Required

### Step 1: Update Frontend (CRITICAL)
```bash
cd /var/www/Primeacademy/frontend
git pull origin main
npm run build
sudo cp -r dist/* /var/www/crm.prashantthakar.com/
```

### Step 2: Verify Backend is Running Latest Code
```bash
cd /var/www/primeacademy_backend
git pull origin main
npm run build
pm2 restart backend-api
pm2 logs backend-api --lines 30
```

### Step 3: Clear ALL Caches
```bash
# Clear browser cache completely
# Press Ctrl+Shift+Delete
# Or use incognito mode

# Clear nginx cache (if any)
sudo systemctl reload nginx
```

### Step 4: Test in Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Navigate to Faculty page
4. Check for ANY errors
5. If you see React error #31, the frontend wasn't updated properly

### Step 5: Test API Directly
```bash
# Get a faculty user ID and your JWT token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.prashantthakar.com/api/users/FACULTY_ID | jq

# Check:
# - documents should be object {...}, not string "{...}"
# - expertise should be object or string, not JSON string
# - availability should be object or string, not JSON string
```

## If Still Not Working

### Check 1: Backend Logs
```bash
pm2 logs backend-api --lines 100
# Look for:
# - "Failed to parse documents JSON" → Backend parsing issue
# - Any 500 errors → Backend crash
# - Any 400 errors → Validation issue
```

### Check 2: Database
```sql
-- Check if data exists
SELECT id, userId, 
  JSON_TYPE(documents) as documents_type,
  JSON_TYPE(expertise) as expertise_type,
  JSON_TYPE(availability) as availability_type
FROM faculty_profiles 
WHERE userId = YOUR_FACULTY_ID;

-- If columns are TEXT instead of JSON:
ALTER TABLE faculty_profiles MODIFY COLUMN documents JSON;
ALTER TABLE faculty_profiles MODIFY COLUMN expertise JSON;
ALTER TABLE faculty_profiles MODIFY COLUMN availability JSON;
```

### Check 3: Browser Network Tab
1. Open DevTools > Network
2. Click Edit on faculty
3. Check the `/api/users/{id}` request
4. Look at Response:
   - Status should be 200
   - Response should have `data.user.facultyProfile`
   - `documents` should be object, not string

## Expected Behavior After Fix

✅ No React errors in console
✅ Faculty registration form doesn't reset after error
✅ Faculty edit form shows all data
✅ Faculty view shows all information
✅ All fields populate correctly

## Most Common Issues

1. **Frontend not rebuilt** → Run `npm run build` again
2. **Backend not restarted** → Run `pm2 restart backend-api`
3. **Browser cache** → Clear completely or use incognito
4. **Database columns wrong type** → Run SQL to fix column types
5. **API returning strings instead of objects** → Backend parsing not working

## Quick Verification

After all fixes:
1. Create new faculty → Should work
2. Edit existing faculty → Fields should populate
3. View faculty → All details should show
4. No errors in console → Success!

