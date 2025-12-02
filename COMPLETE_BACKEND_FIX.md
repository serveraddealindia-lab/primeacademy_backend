# Complete Backend Fix - Step by Step

## 🔴 Current Problems
1. Backend is not running (stopped after SIGINT)
2. Database access denied (even after .env update)
3. ES module error preventing startup
4. Login not working

---

## ✅ Step-by-Step Fix

### Step 1: Verify .env File is Correct

```bash
cd /var/www/primeacademy_backend

# Check .env file exists and has correct values
cat .env

# Make sure you see these lines with CORRECT values:
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=primeacademy_db
# DB_USER=your_actual_db_user (NOT root)
# DB_PASSWORD=your_actual_db_password
```

**If .env is missing or wrong, fix it:**
```bash
nano .env
```

**Example correct .env:**
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=primeacademy_user
DB_PASSWORD=your_secure_password_here

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=production

# Backend URL
BACKEND_URL=https://api.prashantthakar.com

# File Uploads
UPLOAD_DIR=/var/www/primeacademy_backend/uploads
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

---

### Step 2: Test Database Connection

```bash
# Test with the credentials from .env
# Replace with your actual DB_USER and DB_PASSWORD from .env
mysql -u primeacademy_user -p primeacademy_db

# Enter password when prompted
# If connection succeeds, you'll see: mysql>
# Type: EXIT; to leave
```

**If connection fails:**
```bash
# Connect as root to create/fix user
sudo mysql -u root

# Create database user (if doesn't exist)
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

### Step 3: Fix ES Module Error (Use tsx)

The backend is trying to use compiled JavaScript which has ES module issues. Use tsx to run TypeScript directly:

```bash
cd /var/www/primeacademy_backend

# Install tsx globally (if not installed)
npm install -g tsx

# Or install locally
npm install tsx --save-dev

# Stop any existing process
pm2 stop primeacademy-backend 2>/dev/null
pm2 delete primeacademy-backend 2>/dev/null

# Start with tsx (runs TypeScript directly)
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx

# Save PM2 configuration
pm2 save

# Check if it started
pm2 status
```

---

### Step 4: Check Backend Logs

```bash
# Check logs for errors
pm2 logs primeacademy-backend --lines 50

# Look for:
# ✅ "Server running on port 3000" = SUCCESS
# ❌ "Access denied" = Database issue
# ❌ "exports is not defined" = Module issue
# ❌ "Cannot find module" = Missing dependency
```

**If you see database errors:**
- Go back to Step 1 and verify .env credentials
- Test database connection again (Step 2)

**If you see module errors:**
- Make sure you're using tsx: `pm2 list` should show `tsx` as interpreter
- Try: `pm2 restart primeacademy-backend`

---

### Step 5: Verify Backend is Running

```bash
# Check PM2 status
pm2 status

# Should show: primeacademy-backend | online

# Test backend API
curl http://localhost:3000/api/health

# Should return JSON response, not error
```

**If curl fails:**
```bash
# Check if port 3000 is listening
netstat -tulpn | grep 3000

# Check logs again
pm2 logs primeacademy-backend --lines 20
```

---

### Step 6: Test Login Functionality

#### Check if API endpoint works:
```bash
# Test login endpoint (will fail without credentials, but should not be 502)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Should return JSON (even if login fails)
# If you get "Connection refused" = backend not running
# If you get 502 = Nginx issue
```

#### Check Frontend API URL:
```bash
cd /var/www/primeacademy_frontend
cat .env.production

# Should have:
# VITE_API_URL=https://api.prashantthakar.com/api
```

---

### Step 7: Fix Login Issues

#### If login returns 401 (Unauthorized):
- This is normal if credentials are wrong
- Check if user exists in database

#### If login returns 502 (Bad Gateway):
- Backend is not running or Nginx can't reach it
- Go back to Step 3-5

#### If login returns 500 (Server Error):
- Check backend logs: `pm2 logs primeacademy-backend`
- Usually database connection issue

#### Check if users exist in database:
```bash
mysql -u primeacademy_user -p primeacademy_db

# Check users table
SELECT id, email, role FROM users LIMIT 5;

# Check if you have admin user
SELECT id, email, role FROM users WHERE role = 'admin' OR role = 'superadmin';

EXIT;
```

---

## 🔧 Complete Fix Script

Run this complete sequence:

```bash
#!/bin/bash
# Complete backend fix

echo "=== Step 1: Check .env ==="
cd /var/www/primeacademy_backend
cat .env | grep DB_

echo ""
echo "=== Step 2: Test Database ==="
read -p "Enter DB_USER from .env: " DB_USER
read -sp "Enter DB_PASSWORD from .env: " DB_PASS
echo ""
mysql -u "$DB_USER" -p"$DB_PASS" -h localhost primeacademy_db -e "SELECT 1;" && echo "✅ Database connection OK" || echo "❌ Database connection FAILED"

echo ""
echo "=== Step 3: Install tsx ==="
npm install -g tsx

echo ""
echo "=== Step 4: Stop old process ==="
pm2 stop primeacademy-backend 2>/dev/null
pm2 delete primeacademy-backend 2>/dev/null

echo ""
echo "=== Step 5: Start with tsx ==="
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
pm2 save

echo ""
echo "=== Step 6: Wait 5 seconds ==="
sleep 5

echo ""
echo "=== Step 7: Check status ==="
pm2 status

echo ""
echo "=== Step 8: Check logs ==="
pm2 logs primeacademy-backend --lines 20 --nostream

echo ""
echo "=== Step 9: Test API ==="
curl -s http://localhost:3000/api/health && echo " ✅ Backend is running!" || echo " ❌ Backend not responding"
```

---

## 🎯 Quick Manual Fix (Recommended)

Run these commands one by one:

```bash
# 1. Go to backend directory
cd /var/www/primeacademy_backend

# 2. Verify .env has correct database credentials
cat .env | grep -E "DB_USER|DB_PASSWORD|DB_NAME"

# 3. Test database connection (use your actual credentials)
mysql -u your_db_user -p primeacademy_db
# Enter password, then type: EXIT;

# 4. Install tsx
npm install -g tsx

# 5. Stop and delete old process
pm2 stop primeacademy-backend
pm2 delete primeacademy-backend

# 6. Start with tsx
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
pm2 save

# 7. Wait a few seconds
sleep 5

# 8. Check status
pm2 status

# 9. Check logs
pm2 logs primeacademy-backend --lines 30

# 10. Test API
curl http://localhost:3000/api/health
```

---

## 🐛 Common Issues and Solutions

### Issue: "Access denied" even after updating .env
**Solution:**
```bash
# Make sure .env file is in correct location
ls -la /var/www/primeacademy_backend/.env

# Check if backend is reading .env
# The backend should load .env automatically
# If not, check how it's loaded in src/index.ts
```

### Issue: Backend starts but immediately crashes
**Solution:**
```bash
# Check logs for specific error
pm2 logs primeacademy-backend --lines 50

# Common causes:
# - Database connection fails
# - Missing environment variable
# - Port already in use
# - Missing dependency
```

### Issue: Login returns 401 but credentials are correct
**Solution:**
```bash
# Check if password is hashed correctly in database
mysql -u primeacademy_user -p primeacademy_db

# Check user password hash
SELECT id, email, passwordHash FROM users WHERE email = 'your_email@example.com';

# Password should be bcrypt hash, not plain text
# If plain text, you need to reset password
```

### Issue: Frontend can't connect to backend
**Solution:**
```bash
# Check frontend .env.production
cat /var/www/primeacademy_frontend/.env.production

# Should have:
# VITE_API_URL=https://api.prashantthakar.com/api

# Rebuild frontend after changing .env
cd /var/www/primeacademy_frontend
npm run build
```

---

## ✅ Verification Checklist

After fixing, verify everything:

- [ ] `.env` file has correct database credentials
- [ ] Database connection works: `mysql -u user -p db`
- [ ] Backend is running: `pm2 status` shows online
- [ ] Backend logs show "Server running on port 3000"
- [ ] Local API test works: `curl http://localhost:3000/api/health`
- [ ] Nginx can reach backend: `curl https://api.prashantthakar.com/api/health`
- [ ] Frontend .env.production has correct API URL
- [ ] Frontend is rebuilt: `cd frontend && npm run build`
- [ ] Login page loads in browser
- [ ] Login attempt returns proper response (not 502)

---

## 📞 Still Not Working?

If backend still won't start, run this diagnostic:

```bash
cd /var/www/primeacademy_backend

echo "=== Environment ==="
cat .env

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Recent Logs ==="
pm2 logs primeacademy-backend --lines 50 --nostream

echo ""
echo "=== Port Check ==="
netstat -tulpn | grep 3000

echo ""
echo "=== Dependencies ==="
npm list tsx
```

Share the output to get more specific help.




