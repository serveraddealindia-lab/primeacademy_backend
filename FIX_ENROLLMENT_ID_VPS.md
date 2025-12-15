# Fix: Missing enrollmentId Column on VPS

## Error
```
Error: Unknown column 'enrollmentId' in 'field list'
```

## Quick Fix - Run This SQL on VPS

### Option 1: Add Only enrollmentId Column (Quick)
```bash
# SSH into VPS
ssh root@your-vps-ip

# Connect to MySQL
mysql -u your_db_user -p primeacademy_db

# Run this SQL:
ALTER TABLE payment_transactions ADD COLUMN enrollmentId INT NULL;

# Exit MySQL
exit;
```

### Option 2: Run Full SQL File (Recommended)
```bash
# SSH into VPS
ssh root@your-vps-ip

# Copy SQL file to VPS (if not already there)
# Or run directly:
mysql -u your_db_user -p primeacademy_db < /path/to/ADD_ALL_MISSING_COLUMNS_MYSQL.sql
```

### Option 3: One-Line Command
```bash
mysql -u your_db_user -p primeacademy_db -e "ALTER TABLE payment_transactions ADD COLUMN enrollmentId INT NULL;"
```

## Verify Column Was Added

```bash
mysql -u your_db_user -p primeacademy_db -e "DESCRIBE payment_transactions;" | grep enrollmentId
```

## After Adding Column

1. ✅ Column added
2. ✅ Restart backend (if needed):
   ```bash
   pm2 restart primeacademy-backend
   ```
3. ✅ Test payments page - should work now

## All Missing Columns (If You Want to Add All at Once)

The SQL file `ADD_ALL_MISSING_COLUMNS_MYSQL.sql` will add:
- `enrollmentId` ✅ (fixes current error)
- `paidAmount`
- `paymentMethod`
- `transactionId`
- `notes`
- Plus other columns for certificates and student_profiles

## Quick Copy-Paste Commands:

```bash
# 1. Connect and add column
mysql -u root -p primeacademy_db -e "ALTER TABLE payment_transactions ADD COLUMN enrollmentId INT NULL;"

# 2. Verify
mysql -u root -p primeacademy_db -e "DESCRIBE payment_transactions;" | grep enrollmentId

# 3. Restart backend
pm2 restart primeacademy-backend
```

