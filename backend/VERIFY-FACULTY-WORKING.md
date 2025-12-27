# Verify Faculty is Working - Checklist

## Quick Verification Steps

### 1. Check Backend is Running
```bash
# On VPS
pm2 list
# Should show backend-api as "online"

# Check logs for errors
pm2 logs backend-api --lines 20
# Should NOT show any JSON parsing errors
```

### 2. Test Faculty Edit
1. Go to: https://crm.prashantthakar.com/faculty
2. Click **Edit** on any faculty member
3. **Expected:** All form fields should be populated (not blank)
   - Account Information (name, email, phone)
   - Personal Information (all fields)
   - Employment Information
   - Bank Information
   - Emergency Contact
   - Software Proficiency
   - Documents

### 3. Test Faculty View
1. Click **View** on any faculty member
2. **Expected:** All information should display:
   - Personal Information section
   - Employment Information section
   - Bank Information section
   - Emergency Contact section
   - Software Proficiency section
   - Documents section
   - Expertise and Availability

### 4. Test Faculty Create
1. Click **Add New Faculty**
2. Fill in all required fields
3. Submit
4. **Expected:** Faculty should be created successfully

## If Still Not Working

### Check 1: Backend Logs
```bash
pm2 logs backend-api --lines 50
```
Look for:
- ❌ "Failed to parse documents JSON" → Database column might be wrong type
- ❌ "Table doesn't exist" → SQL file wasn't run
- ✅ No errors → Backend is working

### Check 2: Database Schema
```bash
# Login to MySQL
mysql -u primeacademy_user -p primeacademy_db

# Check table structure
DESCRIBE faculty_profiles;

# Should show:
# - documents (type: json)
# - expertise (type: json)
# - availability (type: json)
# - dateOfBirth (type: date)
```

### Check 3: Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Click Edit on faculty
4. Look for errors or warnings

### Check 4: Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Click Edit on faculty
4. Find the API call to `/api/users/{id}`
5. Check Response:
   - `documents` should be an **object** `{...}`, not a **string** `"{...}"`
   - `expertise` should be an object or string (not JSON string)
   - `availability` should be an object or string (not JSON string)

## Common Issues

### Issue: Fields Still Blank
**Solution:**
1. Hard refresh browser: `Ctrl+Shift+R`
2. Check backend logs for parsing errors
3. Verify database columns are JSON type

### Issue: "Failed to parse documents JSON"
**Solution:**
```sql
-- Check if documents column is JSON type
DESCRIBE faculty_profiles;

-- If it's TEXT or VARCHAR, convert it:
ALTER TABLE faculty_profiles 
MODIFY COLUMN documents JSON;

ALTER TABLE faculty_profiles 
MODIFY COLUMN expertise JSON;

ALTER TABLE faculty_profiles 
MODIFY COLUMN availability JSON;
```

### Issue: Backend Not Restarted
**Solution:**
```bash
cd /var/www/primeacademy_backend
npm run build
pm2 restart backend-api
pm2 logs backend-api --lines 20
```

## Success Indicators

✅ Faculty edit form shows all data (not blank)
✅ Faculty view shows all information
✅ No errors in browser console
✅ No "Failed to parse" errors in backend logs
✅ API response shows `documents` as object, not string

