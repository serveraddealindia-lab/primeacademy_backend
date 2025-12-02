# 🔧 QUICK FIX: MySQL Access Denied Error

## The Problem
```
Access denied for user 'primeacademy_user'@'localhost' (using password: YES)
```

## The Solution (Choose One)

### Option 1: Fix MySQL User (Recommended - 2 minutes)

**Open MySQL Command Line:**
```bash
mysql -u root -p
```

**Enter your MySQL root password, then run:**
```sql
DROP USER IF EXISTS 'primeacademy_user'@'localhost';
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'StrongAppPassword!123';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
CREATE DATABASE IF NOT EXISTS primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
FLUSH PRIVILEGES;
```

**Exit MySQL:**
```sql
EXIT;
```

**Restart backend:**
```bash
cd backend
npm run dev
```

### Option 2: Use Root User (Faster but less secure)

**Edit `backend/.env` and change:**
```env
DB_USER=root
DB_PASSWORD=your_mysql_root_password
```

**Then restart backend:**
```bash
cd backend
npm run dev
```

### Option 3: Run SQL File

**If you have MySQL command line access:**
```bash
mysql -u root -p < backend/fix_mysql_user.sql
```

## Verify It Works

After fixing, you should see:
```
✅ Database connection established successfully.
✅ Server is running on port 3000
```

Then test login at: http://localhost:5173/login

## Still Not Working?

1. **Check MySQL is running:**
   ```bash
   # Windows
   net start MySQL80
   ```

2. **Test MySQL connection manually:**
   ```bash
   mysql -u primeacademy_user -p primeacademy_db
   # Password: StrongAppPassword!123
   ```

3. **Check backend logs** for any other errors

