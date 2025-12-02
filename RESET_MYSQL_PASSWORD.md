# Reset MySQL Password for primeacademy_user

**Problem:** MySQL access denied - need to reset password  
**Also:** Backend directory not found at `/var/www/primeacademy/backend`

---

## Step 1: Find Where Your Backend Actually Is

```bash
# Search for backend directory
find / -type d -name "backend" 2>/dev/null | grep -i prime

# Or search for package.json
find / -name "package.json" 2>/dev/null | grep -i prime

# Or check common locations
ls -la /var/www/
ls -la /home/
ls -la /opt/
```

Once you find it, note the path (e.g., `/home/user/primeacademy/backend` or `/opt/primeacademy/backend`)

---

## Step 2: Connect to MySQL as Root

```bash
# Connect as root MySQL user
mysql -u root -p

# Enter root MySQL password when prompted
```

**If root password doesn't work, try:**
```bash
# Try without password
mysql -u root

# Or use sudo
sudo mysql -u root
```

---

## Step 3: Reset Password for primeacademy_user

Once connected to MySQL, run these commands:

```sql
-- Use the database
USE mysql;

-- Reset password for primeacademy_user
ALTER USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'NewPassword123!';

-- Or if that doesn't work, try:
SET PASSWORD FOR 'primeacademy_user'@'localhost' = PASSWORD('NewPassword123!');

-- Grant privileges (if needed)
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify user exists
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';

-- Exit MySQL
EXIT;
```

**Replace `NewPassword123!` with your desired password**

---

## Step 4: Update .env File with New Password

```bash
# Find backend directory first (from Step 1)
# Let's say it's at /path/to/backend

# Navigate to backend
cd /path/to/backend

# Edit .env file
nano .env

# Or use vi
vi .env
```

**Find this line:**
```
DB_PASSWORD=old_password
```

**Change it to:**
```
DB_PASSWORD=NewPassword123!
```

**Save and exit:**
- In `nano`: Press `Ctrl+X`, then `Y`, then `Enter`
- In `vi`: Press `Esc`, type `:wq`, press `Enter`

---

## Step 5: Test New Password

```bash
# Test connection with new password
mysql -u primeacademy_user -p primeacademy_db

# When prompted, enter the new password
# If it works, you'll see: mysql> prompt
# Type EXIT; to leave
```

---

## Step 6: Execute SQL Script with New Password

```bash
# Navigate to backend directory (wherever it is)
cd /path/to/backend

# Execute SQL script
mysql -u primeacademy_user -p primeacademy_db < /tmp/fix_all.sql

# Enter new password when prompted
```

---

## Alternative: Create New MySQL User

If `primeacademy_user` doesn't exist or you want to start fresh:

```bash
# Connect as root
mysql -u root -p

# Then in MySQL:
```

```sql
-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS primeacademy_db;

-- Create user
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'NewPassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';

EXIT;
```

---

## Quick All-in-One Reset Script

Run this on your VPS:

```bash
# 1. Connect as root and reset password
mysql -u root -p << 'EOF'
ALTER USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'NewPassword123!';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF

# 2. Find backend directory
BACKEND_DIR=$(find / -type d -name "backend" 2>/dev/null | grep -i prime | head -1)
echo "Backend found at: $BACKEND_DIR"

# 3. Update .env file
if [ -f "$BACKEND_DIR/.env" ]; then
  sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=NewPassword123!/' "$BACKEND_DIR/.env"
  echo "✅ .env updated"
else
  echo "❌ .env not found at $BACKEND_DIR/.env"
fi

# 4. Test connection
mysql -u primeacademy_user -p'NewPassword123!' primeacademy_db -e "SELECT 1;" && echo "✅ Password works!" || echo "❌ Password failed"
```

**Remember to replace `NewPassword123!` with your actual desired password!**

---

## If You Don't Know Root MySQL Password

### Option 1: Reset Root Password

```bash
# Stop MySQL
sudo systemctl stop mysql

# Start MySQL in safe mode
sudo mysqld_safe --skip-grant-tables &

# Connect without password
mysql -u root

# In MySQL:
```

```sql
USE mysql;
UPDATE user SET authentication_string=PASSWORD('NewRootPassword') WHERE User='root';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Restart MySQL normally
sudo systemctl restart mysql
```

### Option 2: Use sudo (if available)

```bash
# Some systems allow root MySQL access via sudo
sudo mysql -u root

# Then reset password as shown in Step 3
```

---

## Verification Checklist

- [ ] Found backend directory location
- [ ] Connected to MySQL as root
- [ ] Reset password for primeacademy_user
- [ ] Updated .env file with new password
- [ ] Tested connection with new password
- [ ] Executed SQL script successfully

---

**After resetting the password, update .env and try the SQL script again!** ✅


