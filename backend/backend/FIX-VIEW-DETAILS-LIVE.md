# Fix "View All Details Not Showing in Live" Issue

## Problem
View all details modal is not showing in production but works in local. This is likely due to:
1. API endpoint errors (500, 403, etc.)
2. Course model include causing SQL errors
3. Missing error handling
4. Database query failures

## Quick Fix - Upload Updated File to VPS

### Step 1: Upload Fixed File

```bash
# From your local machine
scp backend/src/controllers/attendanceReport.controller.ts root@your-vps-ip:/var/www/primeacademy_backend/src/controllers/
```

### Step 2: Rebuild and Restart on VPS

```bash
# SSH into VPS
ssh root@your-vps-ip
cd /var/www/primeacademy_backend

# Rebuild
npm run build

# Restart backend
pm2 restart backend-api

# Check logs
pm2 logs backend-api
```

## Check for Errors

### 1. Check Backend Logs

```bash
# Watch logs in real-time
pm2 logs backend-api

# Or check recent errors
pm2 logs backend-api --err --lines 50
```

### 2. Test the Endpoint Directly

```bash
# Test the endpoint (replace TOKEN and STUDENT_ID)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.prashantthakar.com/api/attendance-reports/students/STUDENT_ID/details
```

### 3. Check Browser Console

Open browser DevTools (F12) and check:
- **Console tab**: Look for API errors
- **Network tab**: Check the request to `/attendance-reports/students/:id/details`
  - Status code (should be 200)
  - Response body (should have student data)

## Common Issues and Fixes

### Issue 1: 500 Internal Server Error

**Cause**: Course model include failing or database query error

**Fix**: The updated code makes Course include conditional

### Issue 2: 403 Forbidden

**Cause**: User doesn't have ADMIN or SUPERADMIN role

**Check**: Verify user role in database:
```sql
SELECT id, name, email, role FROM users WHERE email = 'your-email@example.com';
```

### Issue 3: 404 Not Found

**Cause**: Student ID doesn't exist or user is not a student

**Check**: Verify student exists:
```sql
SELECT id, name, email, role FROM users WHERE id = STUDENT_ID AND role = 'student';
```

### Issue 4: Empty Response

**Cause**: Student exists but has no profile/enrollments

**Check**: 
```sql
SELECT * FROM student_profiles WHERE userId = STUDENT_ID;
SELECT * FROM enrollments WHERE studentId = STUDENT_ID;
```

## Debugging Steps

### 1. Enable Detailed Logging

Check if logs show the error:
```bash
pm2 logs backend-api | grep -i "student details\|getStudentDetails\|error"
```

### 2. Test with Different Student

Try viewing details for a different student to see if it's student-specific

### 3. Check Database Connection

```bash
# Test database connection
mysql -u primeacademy_user -p primeacademy_db -e "SELECT COUNT(*) FROM users WHERE role = 'student';"
```

### 4. Verify Frontend API Call

In browser console, check:
```javascript
// Check if API call is being made
// Look for: GET /api/attendance-reports/students/:id/details
```

## Alternative: Use Fallback Endpoint

If the issue persists, the frontend has a fallback to `userAPI.getUser()`. Check if that works:

```bash
# Test user endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.prashantthakar.com/api/users/USER_ID
```

## After Fixing

1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Try viewing student details again
4. Check browser console for any remaining errors

