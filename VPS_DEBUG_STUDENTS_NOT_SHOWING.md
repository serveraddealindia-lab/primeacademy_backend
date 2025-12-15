# Debug: Students Not Showing on VPS

## Issue
Students show properly in local but not showing on live VPS, even with same code.

## Enhanced Logging Added
The code now includes comprehensive logging to help identify the issue.

## Step 1: Deploy Updated Code

```bash
cd /var/www/primeacademy_backend
git pull origin main
npm install
npm run build
pm2 restart primeacademy-backend
```

## Step 2: Check Logs After Making Request

```bash
# Watch logs in real-time
pm2 logs primeacademy-backend --lines 100

# OR check specific logs
pm2 logs primeacademy-backend | grep -i "getAllStudents"
```

## Step 3: Test API Endpoint Directly

```bash
# Get your auth token from browser (Network tab -> Request Headers)
# Then test the endpoint:
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/attendance-reports/all-students

# OR if using domain:
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-domain.com/api/attendance-reports/all-students
```

## Step 4: Check Database Directly

```bash
# Connect to MySQL
mysql -u your_db_user -p primeacademy_db

# Check if students exist
SELECT COUNT(*) as total_students FROM users WHERE role = 'student';

# Check sample students
SELECT id, name, email, phone, isActive, createdAt 
FROM users 
WHERE role = 'student' 
ORDER BY createdAt DESC 
LIMIT 5;

# Check if StudentProfile table exists and has associations
DESCRIBE student_profiles;
SHOW CREATE TABLE student_profiles;

# Exit MySQL
exit;
```

## Step 5: Check What Logs Show

Look for these log messages in PM2 logs:

### Expected Log Messages:
1. `getAllStudents: Request from user X with role Y`
2. `getAllStudents: Attempting to fetch students with profile include`
3. `getAllStudents: Successfully fetched X students with profile include`
4. `getAllStudents: Found X students total`
5. `getAllStudents: Response sent successfully with X students`

### If You See Errors:
- **"Error fetching students with profile include"** → Database association issue
- **"Error fetching students even without include"** → Database connection or query issue
- **"No students found in database!"** → Check if students exist in database
- **"Total users with STUDENT role in database: X"** → If X > 0 but students.length = 0, query issue

## Step 6: Common Issues and Fixes

### Issue 1: Authentication/Authorization
**Symptoms:** 401 or 403 errors in logs
**Fix:** Check if user token is valid and user has ADMIN/SUPERADMIN role

### Issue 2: Database Connection
**Symptoms:** Connection errors in logs
**Fix:** Check database credentials in `.env` file

### Issue 3: StudentProfile Association Missing
**Symptoms:** "Error fetching students with profile include"
**Fix:** The code will automatically fallback to query without include

### Issue 4: No Students in Database
**Symptoms:** "No students found in database!" and count = 0
**Fix:** Check if students exist: `SELECT * FROM users WHERE role = 'student';`

### Issue 5: Role Mismatch
**Symptoms:** Students exist but query returns empty
**Fix:** Check if role is stored as 'student' (lowercase) vs 'STUDENT' (uppercase):
```sql
SELECT DISTINCT role FROM users;
```

## Step 7: Compare Local vs VPS

### Check Environment Variables:
```bash
# On VPS
cat .env | grep -i database
cat .env | grep -i db
```

### Check Database Connection:
```bash
# Test database connection
mysql -u your_db_user -p -e "SELECT 1;" primeacademy_db
```

### Check Node/Sequelize Version:
```bash
# On VPS
node --version
npm list sequelize
```

## Step 8: Manual Database Query Test

```bash
# Connect to database
mysql -u your_db_user -p primeacademy_db

# Run the exact query the code uses
SELECT id, name, email, phone, avatarUrl, isActive, createdAt 
FROM users 
WHERE role = 'student' 
ORDER BY createdAt DESC;

# Check if StudentProfile join works
SELECT u.id, u.name, u.email, sp.id as profile_id, sp.softwareList
FROM users u
LEFT JOIN student_profiles sp ON u.id = sp.userId
WHERE u.role = 'student'
LIMIT 5;

exit;
```

## Step 9: Check Frontend Network Request

1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to Students page
4. Look for request to `/api/attendance-reports/all-students`
5. Check:
   - Request status (200, 401, 403, 500?)
   - Response body (empty array? error message?)
   - Request headers (Authorization token present?)

## Step 10: Enable More Detailed Logging

If still not working, add this temporary debug code:

```typescript
// In getAllStudents function, add before the query:
logger.info('getAllStudents: Database connection test');
try {
  const testQuery = await db.User.findOne({ where: { role: UserRole.STUDENT } });
  logger.info(`getAllStudents: Test query result: ${testQuery ? 'Found student' : 'No student found'}`);
} catch (testError: any) {
  logger.error('getAllStudents: Database test query failed:', testError);
}
```

## Quick Diagnostic Commands

```bash
# 1. Check if backend is running
pm2 status

# 2. Check recent errors
pm2 logs primeacademy-backend --err --lines 50

# 3. Check database connection
mysql -u your_db_user -p -e "SELECT COUNT(*) FROM users WHERE role = 'student';" primeacademy_db

# 4. Restart backend
pm2 restart primeacademy-backend

# 5. Monitor logs in real-time
pm2 logs primeacademy-backend --lines 0
```

## Report Back With:

1. What do the PM2 logs show when you access the Students page?
2. What does the database query return? (`SELECT COUNT(*) FROM users WHERE role = 'student';`)
3. What does the API endpoint return when tested with curl?
4. What does the browser Network tab show for the request?
5. Any error messages in PM2 logs?

This will help identify the exact issue.

