# Fix Backend Errors

## 🔴 Issues Found

### Issue 1: Database Access Denied
```
ER_ACCESS_DENIED_NO_PASSWORD_ERROR
Access denied for user 'root'@'localhost'
```

### Issue 2: ES Module Error
```
ReferenceError: exports is not defined in ES module scope
```

---

## ✅ Solution 1: Fix Database Connection

### Step 1: Check Current Database Credentials
```bash
cd /var/www/primeacademy_backend
cat .env | grep DB_
```

### Step 2: Update Database Credentials in .env
```bash
nano .env
```

Make sure these are correct:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=your_actual_db_user
DB_PASSWORD=your_actual_db_password
```

**Important**: 
- Don't use `root` user if it requires password authentication
- Use a dedicated database user with proper permissions
- Make sure the password is correct

### Step 3: Test Database Connection
```bash
# Test connection with credentials from .env
mysql -u your_db_user -p -h localhost primeacademy_db

# If connection fails, check:
# 1. User exists: SELECT User FROM mysql.user;
# 2. User has permissions: SHOW GRANTS FOR 'your_db_user'@'localhost';
# 3. Database exists: SHOW DATABASES;
```

### Step 4: Create Database User (if needed)
```bash
# Connect as root (with sudo)
sudo mysql -u root

# Create user and grant permissions
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Update .env with new user
nano /var/www/primeacademy_backend/.env
# Change:
# DB_USER=primeacademy_user
# DB_PASSWORD=strong_password_here
```

---

## ✅ Solution 2: Fix ES Module Error

### Option A: Remove "type": "module" from package.json (Recommended)

```bash
cd /var/www/primeacademy_backend
nano package.json
```

**Remove or comment out this line:**
```json
"type": "module",
```

**Or change it to:**
```json
"type": "commonjs",
```

Then restart:
```bash
pm2 restart primeacademy-backend
```

### Option B: Use tsx to run TypeScript directly

```bash
cd /var/www/primeacademy_backend

# Stop current process
pm2 stop primeacademy-backend
pm2 delete primeacademy-backend

# Start with tsx (runs TypeScript directly)
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx

# Save
pm2 save
```

### Option C: Fix the compiled code

If you're using compiled JavaScript, check the build process:

```bash
# Check tsconfig.json
cat tsconfig.json

# Rebuild if needed
npm run build

# Check if dist/index.js has CommonJS syntax
head -20 dist/index.js
```

---

## 🔧 Complete Fix Sequence

Run these commands in order:

```bash
# 1. Fix database credentials
cd /var/www/primeacademy_backend
nano .env
# Update DB_USER and DB_PASSWORD

# 2. Test database connection
mysql -u your_db_user -p -h localhost primeacademy_db
# If successful, type EXIT;

# 3. Fix ES module issue
nano package.json
# Remove or change "type": "module" line

# 4. Restart backend
pm2 restart primeacademy-backend

# 5. Check logs
pm2 logs primeacademy-backend --lines 30

# 6. Test API
curl http://localhost:3000/api/health
```

---

## 🎯 Quick Fix (Recommended Approach)

### Step 1: Fix Database Credentials
```bash
cd /var/www/primeacademy_backend

# Edit .env file
nano .env

# Make sure you have correct database credentials:
# DB_USER=primeacademy_user (not root)
# DB_PASSWORD=your_actual_password
```

### Step 2: Fix Module System
```bash
# Edit package.json
nano package.json

# Remove this line if it exists:
# "type": "module",

# OR change to:
# "type": "commonjs",
```

### Step 3: Use tsx to run TypeScript (Best Option)
```bash
# Install tsx if not installed
npm install -g tsx

# Stop and delete old process
pm2 stop primeacademy-backend
pm2 delete primeacademy-backend

# Start with tsx
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx

# Save
pm2 save

# Check logs
pm2 logs primeacademy-backend
```

---

## 🐛 Troubleshooting

### Database Connection Still Fails
```bash
# Check if MySQL is running
sudo systemctl status mysql

# Check MySQL error log
sudo tail -f /var/log/mysql/error.log

# Try connecting with different user
mysql -u root -p
# Then check users:
SELECT User, Host FROM mysql.user;
```

### ES Module Error Persists
```bash
# Check package.json
cat package.json | grep type

# Check if using compiled code
ls -la dist/

# If using dist, check the compiled file
head -30 dist/index.js

# Try running source directly with tsx
tsx src/index.ts
```

### Backend Still Won't Start
```bash
# Check all logs
pm2 logs primeacademy-backend --lines 100

# Try running manually to see errors
cd /var/www/primeacademy_backend
npm start
# OR
tsx src/index.ts
```

---

## ✅ Verification

After fixing, verify:

```bash
# 1. Check PM2 status
pm2 status

# 2. Check logs (should see no errors)
pm2 logs primeacademy-backend --lines 20

# 3. Test backend
curl http://localhost:3000/api/health

# 4. Test through Nginx
curl https://api.prashantthakar.com/api/health
```

---

## 📝 Summary of Changes Needed

1. **Database**: Update `.env` with correct `DB_USER` and `DB_PASSWORD`
2. **Module System**: Remove `"type": "module"` from `package.json` OR use `tsx` to run TypeScript directly
3. **Restart**: Restart backend with `pm2 restart primeacademy-backend`




