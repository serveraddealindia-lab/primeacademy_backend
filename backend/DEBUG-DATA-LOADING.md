# Debug Guide: Faculty/Employee Data Not Loading in Production

## Quick Checks

### 1. Verify Backend is Running New Code

```bash
# SSH into VPS
cd /var/www/primeacademy_backend

# Check if code is updated
git log --oneline -3
# Should see commits with "parse JSON fields" and "employee address"

# Check if backend is running
pm2 list
# or
systemctl status primeacademy-backend

# Check backend logs for errors
pm2 logs backend-api --lines 50
# or
journalctl -u primeacademy-backend -n 50
```

### 2. Test API Directly

```bash
# Test faculty API (replace USER_ID with actual faculty user ID)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.prashantthakar.com/api/users/USER_ID | jq

# Check if documents field is parsed (should be object, not string)
# Look for: "documents": {...} not "documents": "{...}"
```

### 3. Check Browser Console

1. Open browser DevTools (F12)
2. Go to Network tab
3. Click Edit on a faculty/employee
4. Look for the API call to `/api/users/{id}`
5. Check the Response - see if `documents` is a string or object
6. Check Console tab for any errors

### 4. Verify Frontend Build

```bash
# On VPS
cd /var/www/Primeacademy/frontend

# Check if dist folder exists and is recent
ls -la dist/

# Rebuild if needed
npm run build

# Copy to web directory
sudo cp -r dist/* /var/www/crm.prashantthakar.com/
```

## Common Issues

### Issue 1: Backend Not Restarted
**Symptom:** Old code still running
**Fix:**
```bash
cd /var/www/primeacademy_backend
git pull origin main
npm run build
pm2 restart backend-api
# or
systemctl restart primeacademy-backend
```

### Issue 2: Frontend Not Rebuilt
**Symptom:** Frontend still has old code
**Fix:**
```bash
cd /var/www/Primeacademy/frontend
git pull origin main
npm run build
sudo cp -r dist/* /var/www/crm.prashantthakar.com/
```

### Issue 3: Browser Cache
**Symptom:** Old JavaScript files cached
**Fix:**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Try incognito/private window

### Issue 4: Data Format in Database
**Symptom:** Data exists but in wrong format
**Check:**
```sql
-- Check faculty profile documents
SELECT id, userId, 
  JSON_TYPE(documents) as documents_type,
  JSON_TYPE(expertise) as expertise_type,
  JSON_TYPE(availability) as availability_type,
  LEFT(documents, 50) as documents_preview
FROM faculty_profiles 
WHERE userId = YOUR_USER_ID;

-- Check employee profile
SELECT id, userId, 
  address, city, state, postalCode,
  JSON_TYPE(documents) as documents_type,
  LEFT(documents, 50) as documents_preview
FROM employee_profiles 
WHERE userId = YOUR_USER_ID;
```

## Debugging Steps

### Step 1: Check Backend Logs
```bash
# Watch backend logs in real-time
pm2 logs backend-api --lines 100

# Look for:
# - "Failed to parse documents JSON" warnings
# - "Fetching user X with includes" messages
# - Any errors when fetching user data
```

### Step 2: Test API Endpoint
```bash
# Get auth token first (from browser Network tab)
TOKEN="your_jwt_token_here"
USER_ID="faculty_user_id_here"

# Test the API
curl -H "Authorization: Bearer $TOKEN" \
  https://api.prashantthakar.com/api/users/$USER_ID \
  | jq '.data.user.facultyProfile.documents'

# If documents is a string, the parsing isn't working
# If documents is an object, parsing is working
```

### Step 3: Check Frontend Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for:
   - "Faculty data fetched successfully" logs
   - "Faculty data loaded in component" logs
   - Any errors about parsing or missing data

### Step 4: Verify Data Structure
In browser console, run:
```javascript
// After clicking Edit on a faculty
// Check what data is being received
console.log('Faculty Data:', window.facultyData);
```

## Expected Behavior

### Backend Response Should Be:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "name": "Faculty Name",
      "facultyProfile": {
        "id": 1,
        "userId": 1,
        "documents": {
          "personalInfo": {...},
          "employmentInfo": {...}
        },
        "expertise": "text or object",
        "availability": "text or object"
      }
    }
  }
}
```

**Important:** `documents`, `expertise`, and `availability` should be **objects**, not strings.

## If Still Not Working

1. **Check Sequelize Model Configuration:**
   - Ensure JSON fields are defined as `DataTypes.JSON` in models
   - Sequelize should auto-parse, but MySQL might return strings

2. **Check Database Column Types:**
   ```sql
   DESCRIBE faculty_profiles;
   DESCRIBE employee_profiles;
   ```
   - `documents`, `expertise`, `availability` should be `json` type

3. **Force Backend Restart:**
   ```bash
   pm2 delete backend-api
   cd /var/www/primeacademy_backend
   npm run build
   pm2 start dist/index.js --name backend-api
   pm2 save
   ```

4. **Clear All Caches:**
   ```bash
   # Clear PM2 logs
   pm2 flush
   
   # Restart nginx
   sudo systemctl restart nginx
   
   # Clear browser cache completely
   ```

## Quick Fix Script

Run this on your VPS:

```bash
#!/bin/bash
echo "=== Checking Backend Status ==="
cd /var/www/primeacademy_backend
git pull origin main
npm run build
pm2 restart backend-api
sleep 3
pm2 logs backend-api --lines 20

echo ""
echo "=== Checking Frontend ==="
cd /var/www/Primeacademy/frontend
git pull origin main
npm run build
sudo cp -r dist/* /var/www/crm.prashantthakar.com/

echo ""
echo "=== Testing API ==="
curl -I http://localhost:3001/api/health
```

