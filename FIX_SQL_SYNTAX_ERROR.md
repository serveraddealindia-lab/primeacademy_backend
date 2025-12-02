# 🔧 Fix: SQL Syntax Error at Line 299

## ❌ Error

**Error:** `ERROR 1064 (42000) at line 299: You have an error in your SQL syntax`

**Problem area:** Near `curdate(),` and `paymentPlan longtext CHARAC`

**Cause:** Invalid SQL syntax in the SQL file.

---

## 🔍 Step 1: Check Line 299

**View the problematic line:**
```bash
sed -n '295,305p' /var/www/primeacademy_db.sql
```

**This shows lines 295-305, including the error at line 299.**

---

## 🔍 Step 2: Common Issues

### Issue 1: `curdate()` in Column Definition

**Wrong:**
```sql
`someColumn` curdate(),
```

**Correct:**
```sql
`someColumn` DATE DEFAULT (CURRENT_DATE),
```
**Or:**
```sql
`someColumn` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
```

### Issue 2: `longtext CHARAC` (Truncated)

**Wrong:**
```sql
`paymentPlan` longtext CHARAC
```

**Correct:**
```sql
`paymentPlan` longtext,
```
**Or:**
```sql
`paymentPlan` longtext CHARACTER SET utf8mb4,
```

---

## ✅ Step 3: Fix the SQL File

### Option A: Edit Manually

```bash
nano /var/www/primeacademy_db.sql
```

**Navigate to line 299:**
- Press `Ctrl+_` (underscore)
- Type: `299`
- Press Enter

**Fix the syntax:**
- Remove or fix `curdate(),`
- Fix `longtext CHARAC` to `longtext`

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

### Option B: Auto-Fix Common Issues

```bash
# Backup original
cp /var/www/primeacademy_db.sql /var/www/primeacademy_db.sql.backup

# Fix curdate() issues (replace with CURRENT_DATE)
sed -i 's/curdate()/CURRENT_DATE/g' /var/www/primeacademy_db.sql

# Fix truncated CHARAC
sed -i 's/longtext CHARAC/longtext/g' /var/www/primeacademy_db.sql
sed -i 's/CHARAC/CHARACTER SET utf8mb4/g' /var/www/primeacademy_db.sql

# Run SQL
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

---

## 🔍 Step 4: Check Full Context

**See more context around the error:**
```bash
sed -n '290,310p' /var/www/primeacademy_db.sql
```

**This shows the full CREATE TABLE or ALTER TABLE statement.**

---

## 🔧 Common SQL Syntax Fixes

### Fix 1: Remove Invalid curdate() in Column Definition

**If you see:**
```sql
`columnName` curdate(),
```

**Change to:**
```sql
`columnName` DATE DEFAULT (CURRENT_DATE),
```

### Fix 2: Fix Truncated longtext

**If you see:**
```sql
`paymentPlan` longtext CHARAC
```

**Change to:**
```sql
`paymentPlan` longtext,
```

### Fix 3: Fix Missing Commas

**Check for missing commas between column definitions:**
```sql
`column1` varchar(255),
`column2` int,  -- comma here
`column3` text
```

---

## 🚀 Complete Fix Sequence

```bash
# 1. Check the error line
sed -n '295,305p' /var/www/primeacademy_db.sql

# 2. Backup
cp /var/www/primeacademy_db.sql /var/www/primeacademy_db.sql.backup

# 3. Edit file
nano /var/www/primeacademy_db.sql
# Navigate to line 299 (Ctrl+_, type 299, Enter)
# Fix the syntax error
# Save (Ctrl+X, Y, Enter)

# 4. Or try auto-fix
sed -i 's/curdate()/CURRENT_DATE/g' /var/www/primeacademy_db.sql
sed -i 's/longtext CHARAC/longtext/g' /var/www/primeacademy_db.sql

# 5. Run SQL again
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

---

## 🔍 Validate SQL Syntax

**Check for other syntax errors:**
```bash
# Try to validate (won't execute, just check syntax)
mysql -u root -p primeacademy_db --force < /var/www/primeacademy_db.sql 2>&1 | grep -i "error\|syntax" | head -20
```

---

## 📋 Troubleshooting

### If Error Persists

**Check the exact line:**
```bash
sed -n '299p' /var/www/primeacademy_db.sql
```

**Check surrounding lines:**
```bash
sed -n '295,305p' /var/www/primeacademy_db.sql
```

**Look for:**
- Missing commas
- Invalid function calls
- Truncated data types
- Unclosed quotes or parentheses

### Check for Other Syntax Issues

**Search for common problems:**
```bash
# Check for curdate() issues
grep -n "curdate()" /var/www/primeacademy_db.sql

# Check for truncated types
grep -n "CHARAC" /var/www/primeacademy_db.sql

# Check for missing commas
grep -n "DEFAULT NULL" /var/www/primeacademy_db.sql | head -10
```

---

## ✅ Summary

**Error:** SQL syntax error at line 299

**Quick Fix:**
1. Check the line: `sed -n '295,305p' /var/www/primeacademy_db.sql`
2. Edit file: `nano /var/www/primeacademy_db.sql`
3. Navigate to line 299: `Ctrl+_`, type `299`, Enter
4. Fix syntax (remove `curdate(),` or fix `longtext CHARAC`)
5. Save and run: `mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql`

**Common fixes:**
- `curdate(),` → Remove or change to `DATE DEFAULT (CURRENT_DATE),`
- `longtext CHARAC` → `longtext,`

**After fixing, SQL will execute successfully!** ✅




