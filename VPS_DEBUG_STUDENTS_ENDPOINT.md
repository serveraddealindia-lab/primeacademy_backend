# Debug: Students Not Showing on VPS (But Working Locally)

## Issue
- ✅ Local: Students showing (159 students)
- ❌ VPS: Students NOT showing (but studentwise works)
- ✅ Studentwise works on both (uses different endpoint)

## Root Cause Analysis

Since studentwise works, authentication is fine. The issue is likely:
1. Database query returning empty on VPS
2. Response format issue
3. Frontend not receiving data

## Step 1: Check Backend Logs on VPS

```bash
# SSH into VPS
ssh root@your-vps-ip

# Watch logs in real-time
pm2 logs primeacademy-backend --lines 0

# Then access Students page in browser
# Look for these log messages:
# - "getAllStudents: Request from user..."
# - "getAllStudents: Found X students total"
# - "getAllStudents: Response sent successfully"
```

## Step 2: Test API Endpoint Directly

```bash
# Get your auth token from browser:
# 1. Open DevTools (F12)
# 2. Go to Application/Storage > Local Storage
# 3. Find 'token' or 'authToken'
# OR check Network tab > Request Headers > Authorization

# Test endpoint:
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/attendance-reports/all-students

# OR if using domain:
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-domain.com/api/attendance-reports/all-students

# Check response:
# Should see: {"status":"success","data":{"students":[...],"totalCount":X}}
```

## Step 3: Check Database Directly

```bash
# Connect to MySQL
mysql -u root -p primeacademy_db

# Check if students exist
SELECT COUNT(*) as total_students FROM users WHERE role = 'student';

# Check sample students
SELECT id, name, email, phone, isActive, createdAt 
FROM users 
WHERE role = 'student' 
ORDER BY createdAt DESC 
LIMIT 5;

# Check if role is stored correctly (case sensitive)
SELECT DISTINCT role FROM users;
# Should show: student (lowercase)

# Exit MySQL
exit;
```

## Step 4: Compare Local vs VPS Database

### On Local:
```bash
mysql -u root -p primeacademy_db -e "SELECT COUNT(*) FROM users WHERE role = 'student';"
```

### On VPS:
```bash
mysql -u root -p primeacademy_db -e "SELECT COUNT(*) FROM users WHERE role = 'student';"
```

**If counts differ, that's the issue!**

## Step 5: Check Sequelize Model Association

The issue might be with `StudentProfile` association. Test without it:

```bash
# On VPS, temporarily modify the query to exclude StudentProfile
# Or check if StudentProfile table exists:
mysql -u root -p primeacademy_db -e "SHOW TABLES LIKE 'student_profiles';"

# Check if table has data:
mysql -u root -p primeacademy_db -e "SELECT COUNT(*) FROM student_profiles;"
```

## Step 6: Check Frontend Network Request

1. Open browser DevTools (F12) on VPS
2. Go to Network tab
3. Navigate to Students page
4. Look for request to `/api/attendance-reports/all-students`
5. Check:
   - **Status Code**: 200, 401, 403, 500?
   - **Response Body**: Empty array? Error message?
   - **Request Headers**: Authorization token present?

## Step 7: Common Issues and Fixes

### Issue 1: Role Case Mismatch
**Symptoms:** Database has 'STUDENT' but query looks for 'student'
**Fix:**
```sql
-- Check actual role values
SELECT DISTINCT role FROM users;

-- If uppercase, update:
UPDATE users SET role = 'student' WHERE role = 'STUDENT';
```

### Issue 2: StudentProfile Association Failing
**Symptoms:** Query works without include, fails with include
**Fix:** The code already has fallback - check logs to see if it's being used

### Issue 3: Empty Response
**Symptoms:** Query succeeds but returns empty array
**Fix:** Check if students actually exist in database

### Issue 4: CORS Issue
**Symptoms:** Request fails with CORS error
**Fix:** Check CORS configuration in `backend/src/index.ts`

## Step 8: Quick Diagnostic Script

Create a test file on VPS:

```bash
# On VPS
cd /var/www/primeacademy_backend
cat > test-students.js << 'EOF'
const db = require('./dist/models').default;
const { UserRole } = require('./dist/models/User').default;

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connected');
    
    const count = await db.User.count({ where: { role: UserRole.STUDENT } });
    console.log(`✅ Total students in DB: ${count}`);
    
    const students = await db.User.findAll({
      where: { role: UserRole.STUDENT },
      limit: 5,
      attributes: ['id', 'name', 'email'],
    });
    console.log(`✅ Sample students:`, students.map(s => ({ id: s.id, name: s.name })));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
EOF

# Run test
node test-students.js
```

## Step 9: Check PM2 Logs for Errors

```bash
# Check for errors
pm2 logs primeacademy-backend --err --lines 100

# Check for getAllStudents logs
pm2 logs primeacademy-backend | grep -i "getAllStudents" | tail -20
```

## Most Likely Issues:

1. **Database has no students** - Check with SQL query
2. **Role case mismatch** - 'STUDENT' vs 'student'
3. **StudentProfile association failing** - Check logs for fallback
4. **Response not reaching frontend** - Check Network tab

## Report Back With:

1. What does `SELECT COUNT(*) FROM users WHERE role = 'student';` return on VPS?
2. What do PM2 logs show when accessing Students page?
3. What does the curl test return?
4. What does browser Network tab show for the request?

