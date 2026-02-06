# Upload These Files to Fix Faculty Create/Edit in Live

## Step 1: Upload SQL File to Database

**File:** `fix-faculty-profiles-table.sql`

**How to upload:**
1. Connect to your MySQL database on VPS
2. Run: `mysql -u your_username -p primeacademy < fix-faculty-profiles-table.sql`
3. Or copy-paste the SQL content into MySQL client

This ensures the database table has all required columns with correct data types.

## Step 2: Upload Backend Files

### File 1: `backend/src/controllers/user.controller.ts`

**What changed:**
- Added JSON parsing for faculty profile fields (documents, expertise, availability)
- Added JSON parsing for employee profile fields (documents)
- Applied to both main query and fallback query

**Upload path on VPS:**
`/var/www/primeacademy_backend/src/controllers/user.controller.ts`

### File 2: `backend/src/controllers/employee.controller.ts`

**What changed:**
- Added JSON parsing for documents field in getEmployeeProfile endpoint

**Upload path on VPS:**
`/var/www/primeacademy_backend/src/controllers/employee.controller.ts`

## Step 3: Rebuild and Restart Backend

After uploading files:

```bash
cd /var/www/primeacademy_backend
npm run build
pm2 restart backend-api
```

## Step 4: Verify

1. Check backend logs: `pm2 logs backend-api --lines 30`
2. Test faculty edit - fields should populate
3. Test faculty view - all information should display

## Files to Upload

1. ✅ `fix-faculty-profiles-table.sql` - Database schema fix
2. ✅ `backend/src/controllers/user.controller.ts` - Main user controller with JSON parsing
3. ✅ `backend/src/controllers/employee.controller.ts` - Employee controller with JSON parsing

**Note:** Frontend files are already updated in GitHub. Just rebuild frontend if needed:
```bash
cd /var/www/Primeacademy/frontend
git pull origin main
npm run build
sudo cp -r dist/* /var/www/crm.prashantthakar.com/
```

