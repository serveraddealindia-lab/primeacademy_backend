# Fix MySQL Access Denied Error - Quick Fix

## Error: Access denied for user 'primeacademy_user'@'localhost'

### Solution 1: Fix MySQL User (Recommended)

**Step 1: Connect to MySQL as root**
```bash
mysql -u root -p
```

**Step 2: Run these SQL commands**
```sql
-- Drop and recreate the user
DROP USER IF EXISTS 'primeacademy_user'@'localhost';
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'StrongAppPassword!123';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;
```

**Step 3: Verify**
```sql
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';
```

**Step 4: Test connection**
```bash
mysql -u primeacademy_user -p primeacademy_db
# Enter password: StrongAppPassword!123
```

### Solution 2: Use Root User (Quick but less secure)

**Update `backend/.env`:**
```env
DB_USER=root
DB_PASSWORD=your_root_password_here
```

### Solution 3: Reset Password for Existing User

**If user exists but password is wrong:**
```sql
ALTER USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'StrongAppPassword!123';
FLUSH PRIVILEGES;
```

### Quick Fix Script

**Option A: Run SQL file**
```bash
mysql -u root -p < backend/fix_mysql_user.sql
```

**Option B: Copy-paste into MySQL**
```sql
DROP USER IF EXISTS 'primeacademy_user'@'localhost';
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'StrongAppPassword!123';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
CREATE DATABASE IF NOT EXISTS primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
FLUSH PRIVILEGES;
```

### After Fixing

1. **Restart backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Look for:**
   ```
   Database connection established successfully.
   Server is running on port 3000
   ```

3. **Test login in frontend**





