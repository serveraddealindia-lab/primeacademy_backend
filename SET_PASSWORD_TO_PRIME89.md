# Set MySQL Password to Prime@89

**Your .env has:** `DB_PASSWORD=Prime@89`  
**But MySQL password doesn't match** - need to reset it

---

## Step 1: Connect to MySQL as Root

```bash
mysql -u root -p
```

Enter root MySQL password when prompted.

**If that doesn't work:**
```bash
sudo mysql -u root
```

---

## Step 2: Reset Password to Prime@89

Once connected to MySQL, run these commands:

```sql
-- Reset password to match .env file
ALTER USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'Prime@89';

-- Grant privileges
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';

EXIT;
```

---

## Step 3: Test Connection

```bash
# Test with the password from .env
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SELECT 1;"
```

**Should return:** `1` (without errors)

---

## Step 4: Execute SQL Script

```bash
# Find backend directory first
find / -type d -name "backend" 2>/dev/null | grep -i prime

# Navigate to backend (use actual path found above)
cd /actual/path/to/backend

# Execute SQL script with password
mysql -u primeacademy_user -p'Prime@89' primeacademy_db < /tmp/fix_all.sql
```

---

## Alternative: One-Line Command

If you can connect as root, run this:

```bash
mysql -u root -p << 'EOF'
ALTER USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'Prime@89';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF
```

Then test:
```bash
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SELECT 1;" && echo "✅ Password works!"
```

---

## If Root Password Doesn't Work

### Option 1: Use sudo
```bash
sudo mysql -u root << 'EOF'
ALTER USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'Prime@89';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF
```

### Option 2: Reset Root Password First
```bash
# Stop MySQL
sudo systemctl stop mysql

# Start in safe mode
sudo mysqld_safe --skip-grant-tables &

# Connect without password
mysql -u root

# Then in MySQL:
```

```sql
USE mysql;
UPDATE user SET authentication_string=PASSWORD('NewRootPass') WHERE User='root';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Restart MySQL
sudo systemctl restart mysql

# Now use new root password to reset primeacademy_user
mysql -u root -p << 'EOF'
ALTER USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'Prime@89';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF
```

---

## Complete Workflow

```bash
# 1. Reset password to Prime@89
mysql -u root -p << 'EOF'
ALTER USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'Prime@89';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF

# 2. Test connection
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SELECT 1;" && echo "✅ Password works!"

# 3. Find backend directory
BACKEND_DIR=$(find / -type d -name "backend" 2>/dev/null | grep -i prime | head -1)
echo "Backend at: $BACKEND_DIR"

# 4. Execute SQL script
mysql -u primeacademy_user -p'Prime@89' primeacademy_db < /tmp/fix_all.sql

# 5. Create directories
cd "$BACKEND_DIR"
mkdir -p certificates receipts
chmod 755 certificates receipts

# 6. Install dependencies
npm install pdfmake

# 7. Restart backend
pm2 restart primeacademy-backend
```

---

**After resetting the password to `Prime@89`, it will match your .env file and everything should work!** ✅


