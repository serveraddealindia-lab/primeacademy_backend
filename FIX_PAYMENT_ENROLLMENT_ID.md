# Fix: Payment enrollmentId Column Issue

## Issue
- Error: `Unknown column 'enrollmentId' in 'field list'`
- But when trying to add: `Duplicate column name 'enrollmentId'`
- **This means the column EXISTS but Sequelize can't see it**

## Root Cause
Sequelize model cache or column name mismatch (camelCase vs snake_case)

## Solution 1: Verify Column Exists and Restart Backend

```bash
# 1. Verify column exists
mysql -u root -p primeacademy_db -e "DESCRIBE payment_transactions;" | grep -i enrollment

# Should show: enrollmentId | int(11) | YES | NULL

# 2. Check exact column name (case sensitive)
mysql -u root -p primeacademy_db -e "SHOW COLUMNS FROM payment_transactions LIKE '%enrollment%';"

# 3. Restart backend to clear Sequelize cache
pm2 restart primeacademy-backend

# 4. Check logs
pm2 logs primeacademy-backend --lines 50
```

## Solution 2: Check Column Name Case

MySQL might have stored it as `enrollment_id` (snake_case) but Sequelize expects `enrollmentId` (camelCase):

```bash
# Check actual column name
mysql -u root -p primeacademy_db -e "SHOW COLUMNS FROM payment_transactions;"
```

If it's `enrollment_id` instead of `enrollmentId`, you have two options:

### Option A: Rename Column to Match Sequelize
```sql
ALTER TABLE payment_transactions CHANGE COLUMN enrollment_id enrollmentId INT NULL;
```

### Option B: Update Sequelize Model to Use snake_case
In `PaymentTransaction.ts`, add:
```typescript
enrollmentId: {
  type: DataTypes.INTEGER,
  allowNull: true,
  field: 'enrollment_id', // Map to snake_case column
  // ... rest of config
}
```

## Solution 3: Force Sequelize to Sync (Development Only)

**⚠️ WARNING: Only use in development, not production!**

```typescript
// In a temporary script or migration
await db.PaymentTransaction.sync({ alter: true });
```

## Solution 4: Use the Fallback (Already Implemented)

The code now has a fallback that will:
1. Detect if the error is about `enrollmentId`
2. Exclude `enrollmentId` from the query
3. Still return payments (just without enrollment relation)

**This is already in the code** - just restart the backend:

```bash
cd /var/www/primeacademy_backend
git pull origin main
npm run build
pm2 restart primeacademy-backend
```

## Quick Diagnostic Commands

```bash
# 1. Check column exists
mysql -u root -p primeacademy_db -e "SHOW COLUMNS FROM payment_transactions LIKE '%enrollment%';"

# 2. Check column name exactly
mysql -u root -p primeacademy_db -e "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'payment_transactions' AND COLUMN_NAME LIKE '%enrollment%';"

# 3. Restart backend
pm2 restart primeacademy-backend

# 4. Test payments endpoint
# (Check browser Network tab or use curl)
```

## Most Likely Fix

Since the column exists, it's probably a Sequelize cache issue. Just restart:

```bash
pm2 restart primeacademy-backend
```

The updated code with fallback should handle it even if there's a mismatch.

