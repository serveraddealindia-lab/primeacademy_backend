# Debug Guide: Faculty Edit/View Showing Blank Fields

## The Problem
- Faculty edit form shows blank fields (but employee edit works)
- Faculty view shows "Not provided" for all fields
- Same code works in local but not in live

## Root Cause Analysis

### Key Difference: Faculty vs Employee Data Structure

**Employee:**
- Data stored directly in `employee_profiles` table columns
- Fields: `address`, `city`, `state`, `postalCode`, etc. (direct columns)
- Backend returns: `user.employeeProfile.address`, `user.employeeProfile.city`, etc.

**Faculty:**
- Data stored in `faculty_profiles.documents` JSON field
- Structure: `documents.personalInfo.address`, `documents.personalInfo.city`, etc.
- Backend must parse JSON and return as object

## Debugging Steps

### Step 1: Check Browser Console
1. Open DevTools (F12) → Console tab
2. Navigate to Faculty Edit page
3. Look for these logs:
   - "Faculty data fetched successfully"
   - "Parsing documents:"
   - "Personal Info extracted:"

**What to check:**
- Is `hasDocuments: true`?
- Is `documentsType: "object"` or `"string"`?
- Is `hasPersonalInfo: true`?
- Are `personalInfoKeys` populated?

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Click Edit on a faculty member
3. Find the `/api/users/{id}` request
4. Check Response:

**Expected Response:**
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
          "personalInfo": {
            "gender": "male",
            "address": "123 Street",
            "city": "City",
            ...
          },
          "employmentInfo": {...},
          "bankInfo": {...},
          "emergencyInfo": {...}
        },
        "expertise": "text or object",
        "availability": "text or object"
      }
    }
  }
}
```

**If `documents` is a STRING:**
- Backend JSON parsing is NOT working
- Need to restart backend or check backend code

**If `documents` is NULL:**
- Data was never saved
- Check if faculty registration completed successfully

**If `documents` is an OBJECT but empty `{}`:**
- Data structure issue
- Check how data was saved

### Step 3: Check Backend Logs
```bash
pm2 logs backend-api --lines 100
```

Look for:
- "Failed to parse documents JSON" → Backend parsing failing
- "Fetching user X with includes" → Query running
- Any 500 errors → Backend crash

### Step 4: Test API Directly
```bash
# Get faculty user ID and JWT token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.prashantthakar.com/api/users/FACULTY_ID | jq '.data.user.facultyProfile.documents'

# Should return an object, not a string
```

### Step 5: Check Database
```sql
-- Check if data exists
SELECT id, userId, 
  JSON_TYPE(documents) as documents_type,
  JSON_EXTRACT(documents, '$.personalInfo.address') as address,
  JSON_EXTRACT(documents, '$.personalInfo.city') as city
FROM faculty_profiles 
WHERE userId = YOUR_FACULTY_ID;

-- If documents_type is NULL or TEXT:
-- Data might not be saved or column is wrong type
```

## Common Issues and Fixes

### Issue 1: Backend Not Parsing JSON
**Symptom:** `documents` is a string in API response
**Fix:**
```bash
cd /var/www/primeacademy_backend
git pull origin main
npm run build
pm2 restart backend-api
```

### Issue 2: Database Column Wrong Type
**Symptom:** `documents_type` is TEXT or NULL
**Fix:**
```sql
ALTER TABLE faculty_profiles MODIFY COLUMN documents JSON;
```

### Issue 3: Data Not Saved
**Symptom:** `documents` is NULL in database
**Fix:** Re-register the faculty member

### Issue 4: Frontend Not Parsing
**Symptom:** Console shows "No documents in profile"
**Fix:**
```bash
cd /var/www/Primeacademy/frontend
git pull origin main
npm run build
sudo cp -r dist/* /var/www/crm.prashantthakar.com/
```

### Issue 5: Form Not Re-rendering
**Symptom:** Fields show blank even though data exists
**Fix:** Already fixed with improved form keys - update frontend

## Verification Checklist

After fixes:
- [ ] Browser console shows "Parsing documents:" with correct type
- [ ] Browser console shows "Personal Info extracted:" with keys
- [ ] Network tab shows `documents` as object (not string)
- [ ] Form fields populate when editing
- [ ] View modal shows all information
- [ ] No React errors in console

## Quick Test Script

Run this in browser console on Faculty Edit page:
```javascript
// Check if data is loaded
console.log('Faculty Data:', window.facultyData || 'Not found');

// Check parsed documents
const profile = window.facultyData?.profile;
if (profile?.documents) {
  console.log('Documents type:', typeof profile.documents);
  console.log('Documents value:', profile.documents);
  
  if (typeof profile.documents === 'string') {
    try {
      const parsed = JSON.parse(profile.documents);
      console.log('Parsed documents:', parsed);
      console.log('Personal Info:', parsed.personalInfo);
    } catch (e) {
      console.error('Failed to parse:', e);
    }
  } else {
    console.log('Documents is object:', profile.documents);
    console.log('Personal Info:', profile.documents.personalInfo);
  }
} else {
  console.log('No documents in profile');
}
```

