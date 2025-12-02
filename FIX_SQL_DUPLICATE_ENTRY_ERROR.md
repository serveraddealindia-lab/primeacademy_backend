# 🔧 Fix: SQL Error - Duplicate Entry for Primary Key

## ❌ Error

**Error:** `ERROR 1062 (23000) at line 93: Duplicate entry '4' for key 'batches.PRIMARY'`

**Cause:** SQL file is trying to `INSERT` data with a PRIMARY KEY that already exists in the table.

---

## ✅ Solution Options

### Option 1: Use INSERT IGNORE (Recommended)

**Edit the SQL file to use `INSERT IGNORE`:**

```bash
nano /var/www/primeacademy_db.sql
```

**Find INSERT statements (around line 93):**
- Press `Ctrl+W` to search
- Type: `INSERT INTO`

**Change from:**
```sql
INSERT INTO batches (id, title, ...) VALUES (4, '...', ...);
```

**To:**
```sql
INSERT IGNORE INTO batches (id, title, ...) VALUES (4, '...', ...);
```

**Or use:**
```sql
INSERT INTO batches (id, title, ...) VALUES (4, '...', ...)
ON DUPLICATE KEY UPDATE id=id;
```

**Save and run again:**
```bash
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

---

### Option 2: Auto-Fix with sed

**Automatically add IGNORE to all INSERT statements:**
```bash
# Backup original
cp /var/www/primeacademy_db.sql /var/www/primeacademy_db.sql.backup

# Fix INSERT statements
sed -i 's/INSERT INTO `/INSERT IGNORE INTO `/g' /var/www/primeacademy_db.sql

# Run SQL
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

---

### Option 3: Use REPLACE INTO

**Replace INSERT with REPLACE (will overwrite existing records):**
```bash
# Backup original
cp /var/www/primeacademy_db.sql /var/www/primeacademy_db.sql.backup

# Replace INSERT with REPLACE
sed -i 's/INSERT INTO `/REPLACE INTO `/g' /var/www/primeacademy_db.sql

# Run SQL
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

**Note:** `REPLACE` will delete and re-insert, so it overwrites existing data.

---

### Option 4: Skip Duplicate Errors (Continue on Error)

**Run SQL with force flag:**
```bash
mysql -u root -p primeacademy_db -f < /var/www/primeacademy_db.sql 2>&1 | grep -v "Duplicate entry"
```

**Or use:**
```bash
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql 2>&1 | grep -v "Duplicate entry"
```

**Note:** This continues execution but may skip some INSERT statements.

---

### Option 5: Delete Existing Data First

**If you want to replace all data:**

```bash
# Connect to MySQL
mysql -u root -p primeacademy_db

# Delete data from tables (be careful!)
DELETE FROM batches WHERE id = 4;
# Or delete all:
# DELETE FROM batches;

# Exit
exit;

# Then run SQL
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

---

## 🔍 Check What Data Already Exists

**Check existing data:**
```bash
mysql -u root -p primeacademy_db -e "SELECT * FROM batches WHERE id = 4;"
```

**Check all batches:**
```bash
mysql -u root -p primeacademy_db -e "SELECT id, title FROM batches;"
```

---

## 🚀 Complete Fix Sequence

### Fix Both CREATE TABLE and INSERT Issues

```bash
# 1. Backup original
cp /var/www/primeacademy_db.sql /var/www/primeacademy_db.sql.backup

# 2. Fix CREATE TABLE statements
sed -i 's/CREATE TABLE `/CREATE TABLE IF NOT EXISTS `/g' /var/www/primeacademy_db.sql

# 3. Fix INSERT statements (add IGNORE)
sed -i 's/INSERT INTO `/INSERT IGNORE INTO `/g' /var/www/primeacademy_db.sql

# 4. Run SQL
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql

# 5. Check for any remaining errors
echo "✅ SQL executed! Check for any warnings above."
```

---

## 🔧 Check SQL File Content

**See line 93 (where error occurred):**
```bash
sed -n '88,98p' /var/www/primeacademy_db.sql
```

**See all INSERT statements:**
```bash
grep -n "INSERT INTO" /var/www/primeacademy_db.sql
```

---

## ✅ Best Practice: Complete SQL Fix

**Fix both CREATE TABLE and INSERT issues:**

```bash
# Backup
cp /var/www/primeacademy_db.sql /var/www/primeacademy_db.sql.backup

# Fix CREATE TABLE (add IF NOT EXISTS)
sed -i 's/CREATE TABLE `/CREATE TABLE IF NOT EXISTS `/g' /var/www/primeacademy_db.sql

# Fix INSERT (add IGNORE)
sed -i 's/INSERT INTO `/INSERT IGNORE INTO `/g' /var/www/primeacademy_db.sql

# Run SQL
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

**This handles:**
- ✅ Tables that already exist
- ✅ Data that already exists
- ✅ No errors, continues execution

---

## 📋 Troubleshooting

### If Still Getting Errors

**Check what errors remain:**
```bash
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql 2>&1 | grep ERROR
```

### Check SQL File Syntax

**Validate SQL syntax:**
```bash
mysql -u root -p primeacademy_db --force < /var/www/primeacademy_db.sql 2>&1 | head -50
```

### See All Errors

**Run and capture all output:**
```bash
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql > /tmp/sql_output.log 2>&1
cat /tmp/sql_output.log | grep -i error
```

---

## ✅ Summary

**Error:** Duplicate entry '4' for key 'batches.PRIMARY'

**Quick Fix:**
1. Edit SQL: `nano /var/www/primeacademy_db.sql`
2. Find INSERT statements (around line 93)
3. Change `INSERT INTO` to `INSERT IGNORE INTO`
4. Run again: `mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql`

**Or auto-fix both issues:**
```bash
sed -i 's/CREATE TABLE `/CREATE TABLE IF NOT EXISTS `/g' /var/www/primeacademy_db.sql
sed -i 's/INSERT INTO `/INSERT IGNORE INTO `/g' /var/www/primeacademy_db.sql
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

**After this, SQL will execute successfully!** ✅




