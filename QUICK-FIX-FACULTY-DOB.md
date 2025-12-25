# Quick Fix for Faculty Date of Birth Error

## The Problem
"Date of Birth is required" error even though data exists in database.

## Quick Fix - Run These SQL Commands

### Step 1: Connect to MySQL
```bash
mysql -u primeacademy_user -p primeacademy_db
```

### Step 2: Run the Fix Script
```bash
# On VPS, run:
mysql -u primeacademy_user -p primeacademy_db < fix-faculty-complete-data.sql
```

Or copy-paste the SQL from `fix-faculty-complete-data.sql` into MySQL.

## What the SQL Does

1. **Ensures column types are correct** (JSON for documents, DATE for dateOfBirth)
2. **Copies dateOfBirth from documents.personalInfo to top-level dateOfBirth column**
3. **Ensures documents.personalInfo.dateOfBirth matches top-level dateOfBirth**
4. **Shows which faculty profiles need data**

## After Running SQL

1. **Update Frontend:**
```bash
cd /var/www/Primeacademy/frontend
git pull origin main
npm run build
sudo cp -r dist/* /var/www/crm.prashantthakar.com/
```

2. **Clear Browser Cache** (Ctrl+Shift+Delete)

3. **Test Faculty Edit** - Date of Birth should now populate

## Verify It Worked

Run this SQL to check:
```sql
SELECT 
  id,
  userId,
  dateOfBirth,
  JSON_EXTRACT(documents, '$.personalInfo.dateOfBirth') as dob_in_docs
FROM faculty_profiles
WHERE userId = 230;  -- Replace with your faculty user ID
```

Both `dateOfBirth` and `dob_in_docs` should show the same date.

