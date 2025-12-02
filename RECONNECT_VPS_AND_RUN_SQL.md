# 🔌 Reconnect to VPS & Run SQL File

## 🔌 Step 1: Reconnect to VPS via SSH

### Option A: Using SSH Command (Windows PowerShell/Terminal)

```bash
ssh root@your_vps_ip
```

**Or if you have a specific username:**
```bash
ssh username@your_vps_ip
```

**Example:**
```bash
ssh root@123.456.789.0
```

**Enter your password when prompted.**

---

### Option B: Using PuTTY (Windows)

1. **Open PuTTY**
2. **Enter your VPS IP address** in "Host Name"
3. **Port:** 22 (default SSH port)
4. **Connection type:** SSH
5. **Click "Open"**
6. **Enter username:** `root` (or your username)
7. **Enter password** when prompted

---

### Option C: Using WinSCP (SSH Terminal)

1. **Open WinSCP**
2. **Connect to your VPS** (same way you uploaded the SQL file)
3. **Click "Terminal" button** (or press `Ctrl+P`)
4. **This opens SSH terminal in WinSCP**

---

## 📂 Step 2: Locate the SQL File

### Find Where You Uploaded It

**Common locations:**
- `/var/www/primeacademy_backend/` (if uploaded to backend directory)
- `/root/` (if uploaded to home directory)
- `/tmp/` (if uploaded to temp directory)

**Find the file:**
```bash
# Search for SQL files
find /var/www -name "*.sql" -type f

# Or check common locations
ls -la /var/www/primeacademy_backend/*.sql
ls -la /root/*.sql
ls -la /tmp/*.sql
```

---

## 🗄️ Step 3: Check Database Name

```bash
cd /var/www/primeacademy_backend
cat .env | grep DB_NAME
```

**Should show something like:**
```
DB_NAME=primeacademy_db
```

**Note the database name** - you'll need it in the next step.

---

## 🚀 Step 4: Run SQL File

### Option A: From Command Line (Recommended)

```bash
# Replace with your actual database name and SQL file path
mysql -u root -p database_name < /path/to/your/file.sql
```

**Example:**
```bash
mysql -u root -p primeacademy_db < /var/www/primeacademy_backend/your_sql_file.sql
```

**Enter MySQL root password when prompted.**

---

### Option B: Connect to MySQL First

```bash
# Connect to MySQL
mysql -u root -p

# Enter password when prompted

# Select database
USE primeacademy_db;

# Run SQL file
source /var/www/primeacademy_backend/your_sql_file.sql;

# Exit MySQL
exit;
```

---

## ✅ Step 5: Verify SQL Executed

### Check Tables/Columns Were Created/Updated

```bash
# Connect to MySQL
mysql -u root -p primeacademy_db

# Check tables
SHOW TABLES;

# Check specific table structure
DESCRIBE table_name;

# Exit
exit;
```

---

## 🔍 Complete SQL Execution Sequence

```bash
# 1. Navigate to backend directory
cd /var/www/primeacademy_backend

# 2. Check database name
cat .env | grep DB_NAME

# 3. List SQL files
ls -la *.sql

# 4. Run SQL file (replace with actual filename)
mysql -u root -p primeacademy_db < your_sql_file.sql

# 5. Verify (connect to MySQL)
mysql -u root -p primeacademy_db
# Then run: SHOW TABLES; or DESCRIBE table_name;
```

---

## 🔧 Troubleshooting

### SQL File Not Found

```bash
# Search for SQL files
find / -name "*.sql" -type f 2>/dev/null

# Or check where you uploaded it in WinSCP
# Look at WinSCP's remote directory path
```

### MySQL Access Denied

```bash
# Check MySQL is running
sudo systemctl status mysql

# Try with different user
mysql -u your_username -p database_name < file.sql

# Check MySQL credentials in .env
cat /var/www/primeacademy_backend/.env | grep DB_
```

### SQL Syntax Errors

```bash
# Check SQL file syntax
mysql -u root -p primeacademy_db < file.sql 2>&1 | head -20

# Or validate in MySQL
mysql -u root -p primeacademy_db
source file.sql;
# Check for error messages
```

---

## 📋 Quick Checklist

- [ ] Reconnected to VPS via SSH ✅
- [ ] Located SQL file ✅
- [ ] Checked database name ✅
- [ ] Ran SQL file ✅
- [ ] Verified tables/columns updated ✅

---

## 🚀 One-Command SQL Execution

```bash
cd /var/www/primeacademy_backend && \
DB_NAME=$(grep DB_NAME .env | cut -d '=' -f2) && \
mysql -u root -p $DB_NAME < your_sql_file.sql
```

**This automatically:**
1. Navigates to backend directory
2. Gets database name from .env
3. Runs SQL file

**Enter MySQL password when prompted.**

---

## ✅ Summary

**To reconnect and run SQL:**

1. **Reconnect to VPS:**
   - SSH: `ssh root@your_vps_ip`
   - Or use PuTTY/WinSCP terminal

2. **Find SQL file:**
   - `find /var/www -name "*.sql"`
   - Or check where you uploaded it

3. **Run SQL:**
   - `mysql -u root -p database_name < /path/to/file.sql`
   - Enter password when prompted

4. **Verify:**
   - Connect to MySQL and check tables

**After this, SQL changes will be applied!** ✅




