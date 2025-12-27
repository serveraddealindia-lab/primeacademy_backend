# Quick Fix: Students Not Showing in Live

## The Issue
- Students exist in database ✅
- Sequelize query returns 0 in production ❌
- Frontend shows "No students found" ❌

## The Fix (Already Done)
The code has been updated to use **raw SQL directly** instead of Sequelize. This bypasses the ORM issue.

## Steps to Fix on VPS

### 1. Pull the Latest Code
```bash
cd /var/www/primeacademy_backend
git pull origin main
```

### 2. Rebuild the Backend
```bash
npm run build
```

### 3. Restart the Backend
```bash
pm2 restart backend-api
# OR
systemctl restart primeacademy-backend
```

### 4. Check the Logs
```bash
pm2 logs backend-api --lines 50
# OR
journalctl -u primeacademy-backend -n 50
```

Look for:
- "Raw SQL query executed: Found X students"
- "Raw SQL query: Transformed X students"

### 5. Test the API Endpoint
```bash
# Get your token from browser (Network tab -> Request Headers -> Authorization)
curl -X GET "https://api.prashantthakar.com/api/attendance-reports/all-students" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" | jq '.data.students | length'
```

Should return the number of students (not 0).

## If Still Not Working

### Check Backend Logs
```bash
pm2 logs backend-api | grep -i "student"
```

### Verify Database Connection
```bash
cd /var/www/primeacademy_backend
node check-students-sql.js
```

### Test Direct SQL Query
```bash
mysql -u root -p primeacademy_db -e "
SELECT COUNT(*) as total 
FROM users 
WHERE LOWER(role) = 'student';
"
```

## What Changed in the Code
- **Before**: Used Sequelize `User.findAll()` with includes
- **After**: Uses raw SQL query directly: `SELECT ... FROM users u LEFT JOIN student_profiles sp ...`

This ensures students are fetched even if Sequelize has issues.

