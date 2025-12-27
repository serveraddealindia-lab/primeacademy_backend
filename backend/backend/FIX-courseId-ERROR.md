# Fix "Unknown column 'courseId' in 'field list'" Error

## Quick Fix - Run on VPS

### Option 1: Automated Script (Recommended)

```bash
# Upload script to VPS
scp fix-courseId-column-vps.sh root@your-vps-ip:/var/www/primeacademy_backend/

# On VPS, run:
ssh root@your-vps-ip
cd /var/www/primeacademy_backend
chmod +x fix-courseId-column-vps.sh
./fix-courseId-column-vps.sh
```

### Option 2: Manual SQL Command

```bash
# SSH into VPS
ssh root@your-vps-ip

# Connect to MySQL
mysql -u primeacademy_user -p primeacademy_db

# Run these SQL commands:
```

```sql
USE primeacademy_db;

-- Add courseId column
ALTER TABLE `batches` 
ADD COLUMN `courseId` int(11) DEFAULT NULL AFTER `status`;

-- Add index for better performance
ALTER TABLE `batches` 
ADD INDEX `idx_courseId` (`courseId`);

-- Add foreign key constraint (if courses table exists)
ALTER TABLE `batches` 
ADD CONSTRAINT `batches_courseId_fkey` 
FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Verify
DESCRIBE batches;
```

**Exit MySQL:**
```sql
EXIT;
```

### Option 3: Using SQL File

```bash
# Upload SQL file to VPS
scp add-courseId-to-batches.sql root@your-vps-ip:/var/www/primeacademy_backend/

# On VPS, run:
cd /var/www/primeacademy_backend
mysql -u primeacademy_user -p primeacademy_db < add-courseId-to-batches.sql
```

## After Fixing

```bash
# Restart backend
pm2 restart backend-api

# Check logs
pm2 logs backend-api

# Test API
curl http://localhost:3001/api/health
```

## Verify Fix

```bash
# Check if column exists
mysql -u primeacademy_user -p primeacademy_db -e "DESCRIBE batches;" | grep courseId

# Should show:
# courseId | int(11) | YES | | NULL | |
```

## Why This Happened

The `database_setup_complete.sql` file was created before the `courseId` column was added to the batches table. The code expects this column, but the database schema doesn't have it.

## One-Liner Fix

```bash
mysql -u primeacademy_user -p primeacademy_db -e "ALTER TABLE batches ADD COLUMN courseId int(11) DEFAULT NULL AFTER status; ALTER TABLE batches ADD INDEX idx_courseId (courseId);"
```

