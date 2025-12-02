# 🔧 Fix: SQL Syntax Error at Line 57

## ❌ Error

**Error:** `ERROR 1064 (42000) at line 57: You have an error in your SQL syntax`

**Problem:** `longtextTER SET utf8mb4` - Missing "CHARAC" in "CHARACTER"

**Should be:** `longtext CHARACTER SET utf8mb4` or just `longtext`

---

## 🔍 Step 1: Check Line 57

**View the problematic line:**
```bash
sed -n '52,62p' /var/www/primeacademy_db.sql
```

**This shows lines 52-62, including the error at line 57.**

---

## ✅ Step 2: Fix the Syntax Error

### Option A: Edit Manually

```bash
nano /var/www/primeacademy_db.sql
```

**Navigate to line 57:**
- Press `Ctrl+_` (underscore)
- Type: `57`
- Press Enter

**Find the problematic line:**
- Look for: `longtextTER SET`
- Change to: `longtext CHARACTER SET` or just `longtext`

**Example fix:**
```sql
# Wrong:
`rawP` longtextTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL

# Correct:
`rawP` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
```

**Or simpler:**
```sql
`rawP` longtext DEFAULT NULL
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

### Option B: Auto-Fix with sed

```bash
# Backup original
cp /var/www/primeacademy_db.sql /var/www/primeacademy_db.sql.backup

# Fix longtextTER SET (add missing CHARAC)
sed -i 's/longtextTER SET/longtext CHARACTER SET/g' /var/www/primeacademy_db.sql

# Also fix any other similar issues
sed -i 's/longtext CHARAC/longtext CHARACTER SET/g' /var/www/primeacademy_db.sql

# Run SQL
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

---

## 🔍 Step 3: Check for Other Similar Issues

**Search for other corrupted CHARACTER SET definitions:**
```bash
grep -n "TER SET" /var/www/primeacademy_db.sql
grep -n "CHARAC" /var/www/primeacademy_db.sql
```

**Fix all occurrences:**
```bash
# Fix all TER SET issues
sed -i 's/TER SET/CHARACTER SET/g' /var/www/primeacademy_db.sql

# Or if you want to simplify, just use longtext without CHARACTER SET
sed -i 's/longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin/longtext/g' /var/www/primeacademy_db.sql
```

---

## 🚀 Complete Fix Sequence

```bash
# 1. Check the error line
sed -n '52,62p' /var/www/primeacademy_db.sql

# 2. Backup
cp /var/www/primeacademy_db.sql /var/www/primeacademy_db.sql.backup

# 3. Fix all syntax issues
sed -i 's/longtextTER SET/longtext CHARACTER SET/g' /var/www/primeacademy_db.sql
sed -i 's/TER SET/CHARACTER SET/g' /var/www/primeacademy_db.sql
sed -i 's/curdate()/CURRENT_DATE/g' /var/www/primeacademy_db.sql

# 4. Also fix CREATE TABLE and INSERT issues
sed -i 's/CREATE TABLE `/CREATE TABLE IF NOT EXISTS `/g' /var/www/primeacademy_db.sql
sed -i 's/INSERT INTO `/INSERT IGNORE INTO `/g' /var/www/primeacademy_db.sql

# 5. Run SQL
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

---

## 🔧 Alternative: Simplify Column Definitions

**If you want to avoid CHARACTER SET issues, simplify:**

```bash
# Replace complex longtext definitions with simple ones
sed -i 's/longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin/longtext/g' /var/www/primeacademy_db.sql
sed -i 's/longtextTER SET utf8mb4 COLLATE utf8mb4_bin/longtext/g' /var/www/primeacademy_db.sql

# Run SQL
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

---

## 🔍 Check Full Context

**See the complete CREATE TABLE statement:**
```bash
# Find which table has the error
sed -n '50,65p' /var/www/primeacademy_db.sql

# Or search for the problematic column
grep -n "rawP" /var/www/primeacademy_db.sql
```

---

## ✅ Complete Auto-Fix Script

**Fix all known issues at once:**
```bash
# Backup
cp /var/www/primeacademy_db.sql /var/www/primeacademy_db.sql.backup

# Fix all syntax issues
sed -i 's/longtextTER SET/longtext CHARACTER SET/g' /var/www/primeacademy_db.sql
sed -i 's/TER SET/CHARACTER SET/g' /var/www/primeacademy_db.sql
sed -i 's/longtext CHARAC/longtext CHARACTER SET/g' /var/www/primeacademy_db.sql
sed -i 's/curdate()/CURRENT_DATE/g' /var/www/primeacademy_db.sql

# Fix CREATE TABLE and INSERT
sed -i 's/CREATE TABLE `/CREATE TABLE IF NOT EXISTS `/g' /var/www/primeacademy_db.sql
sed -i 's/INSERT INTO `/INSERT IGNORE INTO `/g' /var/www/primeacademy_db.sql

# Run SQL
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

---

## 📋 Troubleshooting

### If Error Persists

**Check the exact line:**
```bash
sed -n '57p' /var/www/primeacademy_db.sql
```

**Check surrounding context:**
```bash
sed -n '50,65p' /var/www/primeacademy_db.sql
```

**Look for:**
- Missing "CHARAC" in "CHARACTER"
- Truncated data types
- Invalid syntax

### Validate After Fix

**Check for remaining syntax errors:**
```bash
mysql -u root -p primeacademy_db --force < /var/www/primeacademy_db.sql 2>&1 | grep -i "error\|syntax" | head -20
```

---

## ✅ Summary

**Error:** `longtextTER SET` - Missing "CHARAC" in "CHARACTER"

**Quick Fix:**
1. Check line: `sed -n '52,62p' /var/www/primeacademy_db.sql`
2. Edit: `nano /var/www/primeacademy_db.sql`
3. Go to line 57: `Ctrl+_`, type `57`, Enter
4. Fix: Change `longtextTER SET` to `longtext CHARACTER SET` or just `longtext`
5. Save and run again

**Or auto-fix:**
```bash
sed -i 's/longtextTER SET/longtext CHARACTER SET/g' /var/www/primeacademy_db.sql
sed -i 's/TER SET/CHARACTER SET/g' /var/www/primeacademy_db.sql
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

**After fixing, SQL will execute successfully!** ✅




