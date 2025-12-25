# Exact Steps to Fix Faculty Create/Edit in Live

## Files You Need

### 1. SQL File (Upload to Database)
**File:** `fix-faculty-profiles-table.sql`
- Upload this to your MySQL database
- Run: `mysql -u username -p primeacademy < fix-faculty-profiles-table.sql`

### 2. Backend Files (Already in GitHub - Just Pull)
The backend files are already committed to GitHub. Just pull them:

```bash
cd /var/www/primeacademy_backend
git pull origin main
npm run build
pm2 restart backend-api
```

**Files that were updated:**
- `backend/src/controllers/user.controller.ts` (has JSON parsing)
- `backend/src/controllers/employee.controller.ts` (has JSON parsing)

### 3. Frontend Files (Already in GitHub - Just Pull)
```bash
cd /var/www/Primeacademy/frontend
git pull origin main
npm run build
sudo cp -r dist/* /var/www/crm.prashantthakar.com/
```

## Complete Steps

### Step 1: Fix Database
```bash
# On VPS, connect to MySQL
mysql -u your_db_user -p primeacademy

# Then run the SQL file
source /path/to/fix-faculty-profiles-table.sql
# OR copy-paste the SQL content
```

### Step 2: Update Backend
```bash
cd /var/www/primeacademy_backend
git pull origin main
npm run build
pm2 restart backend-api
pm2 logs backend-api --lines 20
```

### Step 3: Update Frontend
```bash
cd /var/www/Primeacademy/frontend
git pull origin main
npm run build
sudo cp -r dist/* /var/www/crm.prashantthakar.com/
```

### Step 4: Clear Browser Cache
- Press `Ctrl+Shift+R` (hard refresh)
- Or clear browser cache completely

## Verify It's Working

1. Go to Faculty Management
2. Click Edit on any faculty
3. All fields should populate (not blank)
4. Click View - all information should display

## If Still Not Working

Check backend logs:
```bash
pm2 logs backend-api
```

Look for:
- "Failed to parse documents JSON" - means parsing is trying but failing
- No errors - means code is running

Test API directly:
```bash
# Get a faculty user ID and your JWT token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.prashantthakar.com/api/users/FACULTY_USER_ID | jq
```

Check if `documents` field is an object `{...}` or a string `"{...}"`
- Object = ✅ Working
- String = ❌ Still needs parsing (backend not restarted?)

