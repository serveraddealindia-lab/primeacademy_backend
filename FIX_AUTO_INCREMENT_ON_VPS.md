# 🔧 Fix AUTO_INCREMENT on VPS Database

## 🎯 Goal

Fix the "Field 'id' doesn't have a default value" error by adding AUTO_INCREMENT to database table `id` columns.

---

## 🔌 Step 1: Connect to VPS

### Option A: SSH Command
```bash
ssh root@your_vps_ip
```

### Option B: PuTTY
- Open PuTTY
- Enter VPS IP, Port 22
- Click Open, enter username/password

### Option C: WinSCP Terminal
- Open WinSCP
- Connect to VPS
- Click Terminal button (or press `Ctrl+P`)

---

## 🗄️ Step 2: Connect to MySQL

```bash
mysql -u root -p primeacademy_db
```

**Enter MySQL root password when prompted.**

---

## ✅ Step 3: Fix AUTO_INCREMENT for All Tables

**Run these SQL commands one by one:**

```sql
-- Fix student_profiles
ALTER TABLE student_profiles MODIFY COLUMN id INT AUTO_INCREMENT;

-- Fix enrollments
ALTER TABLE enrollments MODIFY COLUMN id INT AUTO_INCREMENT;

-- Fix users
ALTER TABLE users MODIFY COLUMN id INT AUTO_INCREMENT;

-- Fix batches
ALTER TABLE batches MODIFY COLUMN id INT AUTO_INCREMENT;

-- Fix sessions
ALTER TABLE sessions MODIFY COLUMN id INT AUTO_INCREMENT;

-- Fix attendances
ALTER TABLE attendances MODIFY COLUMN id INT AUTO_INCREMENT;

-- Fix payment_transactions
ALTER TABLE payment_transactions MODIFY COLUMN id INT AUTO_INCREMENT;

-- Fix faculty_profiles (if exists)
ALTER TABLE faculty_profiles MODIFY COLUMN id INT AUTO_INCREMENT;

-- Fix employee_profiles (if exists)
ALTER TABLE employee_profiles MODIFY COLUMN id INT AUTO_INCREMENT;

-- Fix certificates (if exists)
ALTER TABLE certificates MODIFY COLUMN id INT AUTO_INCREMENT;
```

---

## ✅ Step 4: Verify Fix

**Check if AUTO_INCREMENT is set:**

```sql
-- Check student_profiles
SHOW CREATE TABLE student_profiles;
-- Should show: `id` int NOT NULL AUTO_INCREMENT

-- Check enrollments
SHOW CREATE TABLE enrollments;
-- Should show: `id` int NOT NULL AUTO_INCREMENT

-- Check users
SHOW CREATE TABLE users;
-- Should show: `id` int NOT NULL AUTO_INCREMENT
```

---

## ✅ Step 5: Exit MySQL

```sql
exit;
```

---

## 🚀 Quick Fix: One-Command Solution

**Fix all tables at once from command line:**

```bash
mysql -u root -p primeacademy_db << 'EOF'
ALTER TABLE student_profiles MODIFY COLUMN id INT AUTO_INCREMENT;
ALTER TABLE enrollments MODIFY COLUMN id INT AUTO_INCREMENT;
ALTER TABLE users MODIFY COLUMN id INT AUTO_INCREMENT;
ALTER TABLE batches MODIFY COLUMN id INT AUTO_INCREMENT;
ALTER TABLE sessions MODIFY COLUMN id INT AUTO_INCREMENT;
ALTER TABLE attendances MODIFY COLUMN id INT AUTO_INCREMENT;
ALTER TABLE payment_transactions MODIFY COLUMN id INT AUTO_INCREMENT;
ALTER TABLE faculty_profiles MODIFY COLUMN id INT AUTO_INCREMENT;
ALTER TABLE employee_profiles MODIFY COLUMN id INT AUTO_INCREMENT;
ALTER TABLE certificates MODIFY COLUMN id INT AUTO_INCREMENT;
EOF
```

**Enter MySQL password when prompted.**

---

## 🔍 Step 6: Check Which Tables Need Fixing

**If you want to check which tables are missing AUTO_INCREMENT:**

```sql
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    EXTRA
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = 'primeacademy_db'
    AND COLUMN_NAME = 'id'
    AND EXTRA NOT LIKE '%auto_increment%';
```

**This shows all tables where `id` doesn't have AUTO_INCREMENT.**

---

## ✅ Step 7: Test Student Enrollment

**After fixing, test the enrollment:**

1. Go to your live site: `https://crm.prashantthakar.com`
2. Try to enroll a student
3. The error should be gone! ✅

---

## 🔧 Troubleshooting

### If ALTER TABLE Fails

**Check current table structure:**
```sql
DESCRIBE student_profiles;
```

**Check if table exists:**
```sql
SHOW TABLES;
```

**If table doesn't exist, create it first:**
```bash
# Run your SQL file to create tables
mysql -u root -p primeacademy_db < /var/www/primeacademy_db.sql
```

### If Column Type is Different

**Check column type:**
```sql
SHOW COLUMNS FROM student_profiles WHERE Field = 'id';
```

**If it's BIGINT:**
```sql
ALTER TABLE student_profiles MODIFY COLUMN id BIGINT AUTO_INCREMENT;
```

---

## 📋 Complete Fix Sequence

```bash
# 1. Connect to VPS
ssh root@your_vps_ip

# 2. Connect to MySQL
mysql -u root -p primeacademy_db

# 3. Run ALTER TABLE commands (see Step 3 above)

# 4. Verify
SHOW CREATE TABLE student_profiles;

# 5. Exit
exit;

# 6. Test enrollment on live site
```

---

## ✅ Summary

**To fix on VPS:**

1. **Connect to VPS:** `ssh root@your_vps_ip`
2. **Connect to MySQL:** `mysql -u root -p primeacademy_db`
3. **Run ALTER TABLE commands** (see Step 3)
4. **Verify:** `SHOW CREATE TABLE student_profiles;`
5. **Exit:** `exit;`
6. **Test enrollment** on live site

**After this, student enrollment will work!** ✅




