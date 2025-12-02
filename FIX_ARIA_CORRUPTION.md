# Fix MySQL Aria Storage Engine Corruption Error

## Error: #1030 - Got error 176 "Read page with wrong checksum" from storage engine Aria

This indicates database corruption in the Aria storage engine (used by MariaDB/MySQL for system tables).

## Solution Steps

### Step 1: Stop MySQL Service

**Windows:**
```bash
net stop MySQL80
# Or MySQL57, MySQL, etc. - check your service name
```

**Or use Services app:**
- Press `Win + R`, type `services.msc`
- Find MySQL service
- Right-click → Stop

### Step 2: Repair Database Tables

**Option A: Repair via MySQL (Recommended)**

1. **Start MySQL in recovery mode:**
   ```bash
   mysqld --console --skip-grant-tables --skip-external-locking
   ```

2. **In another terminal, connect:**
   ```bash
   mysql -u root
   ```

3. **Repair system tables:**
   ```sql
   USE mysql;
   REPAIR TABLE user;
   REPAIR TABLE db;
   REPAIR TABLE tables_priv;
   REPAIR TABLE columns_priv;
   REPAIR TABLE procs_priv;
   ```

4. **Repair your database:**
   ```sql
   USE primeacademy_db;
   REPAIR TABLE users;
   REPAIR TABLE batches;
   REPAIR TABLE enrollments;
   -- Repair all tables that use Aria engine
   ```

**Option B: Use mysqlcheck (Easier)**

1. **Stop MySQL service first**

2. **Run repair command:**
   ```bash
   mysqlcheck -u root -p --auto-repair --check --all-databases
   ```

3. **Or repair specific database:**
   ```bash
   mysqlcheck -u root -p --auto-repair --check primeacademy_db
   ```

### Step 3: If Repair Doesn't Work - Rebuild Tables

**If repair fails, you may need to rebuild:**

1. **Backup your data first:**
   ```bash
   mysqldump -u root -p primeacademy_db > backup_before_repair.sql
   ```

2. **Drop and recreate corrupted tables:**
   ```sql
   -- Only if you have a backup!
   USE primeacademy_db;
   DROP TABLE IF EXISTS corrupted_table_name;
   -- Then restore from backup or recreate schema
   ```

### Step 4: Check Disk Space and Health

**Check disk space:**
```bash
# Windows
dir C:\
# Or check MySQL data directory
dir "C:\ProgramData\MySQL\MySQL Server 8.0\Data"
```

**If disk is full, free up space.**

### Step 5: Restart MySQL Normally

1. **Stop recovery mode MySQL** (if running)
2. **Start MySQL service:**
   ```bash
   net start MySQL80
   ```

3. **Test connection:**
   ```bash
   mysql -u root -p
   ```

### Step 6: Verify Database

```sql
USE primeacademy_db;
SHOW TABLES;
SELECT COUNT(*) FROM users;
```

## Quick Fix Script

**Create `fix_aria_corruption.bat`:**
```batch
@echo off
echo Stopping MySQL...
net stop MySQL80

echo Waiting 5 seconds...
timeout /t 5

echo Starting MySQL repair...
mysqlcheck -u root -p --auto-repair --check --all-databases

echo Starting MySQL...
net start MySQL80

echo Done! Test your connection.
pause
```

## Alternative: Use InnoDB Instead of Aria

If Aria keeps corrupting, consider converting tables to InnoDB:

```sql
ALTER TABLE table_name ENGINE=InnoDB;
```

## Prevention

1. **Regular backups**
2. **Proper MySQL shutdown** (don't force kill)
3. **Check disk health**
4. **Keep MySQL updated**
5. **Monitor disk space**

## If Nothing Works

1. **Restore from backup**
2. **Reinstall MySQL** (last resort)
3. **Use InnoDB engine** for all tables

