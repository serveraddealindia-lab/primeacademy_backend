# Diagnose and Fix MySQL User Issue

**Problem:** Still getting "Access denied" even after password reset  
**Need to:** Check if user exists, verify privileges, and fix properly

---

## Step 1: Check if User Exists

Connect as root and check:

```bash
mysql -u root -p
```

Then in MySQL:

```sql
-- Check if user exists
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';

-- Check user privileges
SHOW GRANTS FOR 'primeacademy_user'@'localhost';

EXIT;
```

---

## Step 2: If User Doesn't Exist, Create It

```bash
mysql -u root -p
```

```sql
-- Create database if missing
CREATE DATABASE IF NOT EXISTS primeacademy_db;

-- Create user
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'Prime@89';

-- Grant all privileges
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';
SHOW GRANTS FOR 'primeacademy_user'@'localhost';

EXIT;
```

---

## Step 3: If User Exists But Password Wrong, Reset Properly

```bash
mysql -u root -p
```

```sql
-- Drop and recreate user (clean way)
DROP USER IF EXISTS 'primeacademy_user'@'localhost';
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'Prime@89';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';

EXIT;
```

---

## Step 4: Test Connection

```bash
# Test with password
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SELECT 1;" && echo "✅ SUCCESS!" || echo "❌ FAILED"

# Or test interactively
mysql -u primeacademy_user -p primeacademy_db
# Enter: Prime@89
# Should see: mysql> prompt
```

---

## Step 5: Complete Diagnostic Script

Run this to check everything:

```bash
mysql -u root -p << 'EOF'
-- Check if user exists
SELECT 'Checking if user exists...' AS info;
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';

-- Check if database exists
SELECT 'Checking if database exists...' AS info;
SHOW DATABASES LIKE 'primeacademy_db';

-- Check user privileges
SELECT 'Checking user privileges...' AS info;
SHOW GRANTS FOR 'primeacademy_user'@'localhost';

-- Try to fix
SELECT 'Fixing user...' AS info;
DROP USER IF EXISTS 'primeacademy_user'@'localhost';
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'Prime@89';
CREATE DATABASE IF NOT EXISTS primeacademy_db;
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify fix
SELECT 'Verification...' AS info;
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';
SHOW GRANTS FOR 'primeacademy_user'@'localhost';

EXIT;
EOF

# Test connection
echo "Testing connection..."
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SELECT 1;" && echo "✅ Connection works!" || echo "❌ Still failing"
```

---

## Alternative: Check Current Password

If you want to see what password is currently set:

```bash
mysql -u root -p << 'EOF'
SELECT User, Host, authentication_string FROM mysql.user WHERE User = 'primeacademy_user';
EXIT;
EOF
```

---

## Common Issues and Fixes

### Issue 1: User Doesn't Exist
**Fix:** Create user (see Step 2)

### Issue 2: Wrong Host
**Fix:** Try with different host:
```sql
CREATE USER 'primeacademy_user'@'%' IDENTIFIED BY 'Prime@89';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'%';
FLUSH PRIVILEGES;
```

### Issue 3: Special Characters in Password
**Fix:** Escape the password or use quotes:
```sql
ALTER USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'Prime@89';
-- Or if that doesn't work:
SET PASSWORD FOR 'primeacademy_user'@'localhost' = 'Prime@89';
```

### Issue 4: Password Plugin Issue
**Fix:** Use native password authentication:
```sql
ALTER USER 'primeacademy_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Prime@89';
FLUSH PRIVILEGES;
```

---

## Complete Fix Script

Run this complete script:

```bash
mysql -u root -p << 'EOF'
-- Drop existing user if any
DROP USER IF EXISTS 'primeacademy_user'@'localhost';
DROP USER IF EXISTS 'primeacademy_user'@'%';

-- Create database
CREATE DATABASE IF NOT EXISTS primeacademy_db;

-- Create user with password
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'Prime@89';

-- Also create for all hosts (just in case)
CREATE USER 'primeacademy_user'@'%' IDENTIFIED BY 'Prime@89';

-- Grant privileges
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'%';

-- Apply
FLUSH PRIVILEGES;

-- Verify
SELECT 'User created:' AS info;
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';

SELECT 'Grants:' AS info;
SHOW GRANTS FOR 'primeacademy_user'@'localhost';

EXIT;
EOF

# Test
echo "Testing connection..."
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SELECT 1 AS test;" && echo "✅ SUCCESS - Password works!" || echo "❌ FAILED - Check root access"
```

---

## If Root Access Also Fails

```bash
# Try sudo
sudo mysql -u root << 'EOF'
DROP USER IF EXISTS 'primeacademy_user'@'localhost';
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'Prime@89';
CREATE DATABASE IF NOT EXISTS primeacademy_db;
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF
```

---

**Run the complete fix script above - it will recreate the user properly!** ✅


