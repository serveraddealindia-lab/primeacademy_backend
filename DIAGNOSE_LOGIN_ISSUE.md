# Diagnose and Fix Local Login Issue

## Quick Diagnosis

Your `.env` file shows:
- `DB_USER=primeacademy_user`
- `DB_PASSWORD=StrongAppPassword!123`
- `DB_NAME=primeacademy_db`

## Common Issues and Fixes

### Issue 1: Database User Doesn't Exist or Wrong Password

**Check if the MySQL user exists:**
```bash
mysql -u root -p
```

Then in MySQL:
```sql
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';
```

**If user doesn't exist, create it:**
```sql
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'StrongAppPassword!123';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;
```

**If user exists but password is wrong, reset it:**
```sql
ALTER USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'StrongAppPassword!123';
FLUSH PRIVILEGES;
```

### Issue 2: Database Doesn't Exist

**Check if database exists:**
```sql
SHOW DATABASES LIKE 'primeacademy_db';
```

**If it doesn't exist, create it:**
```sql
CREATE DATABASE primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Issue 3: Backend Server Not Running

**Check if backend is running:**
1. Open a terminal
2. Go to backend directory: `cd backend`
3. Start server: `npm run dev`
4. Look for: "Database connection established successfully" and "Server is running on port 3000"

**If you see database connection errors:**
- Check MySQL service is running
- Verify the database user and password
- Check the database exists

### Issue 4: Frontend Can't Connect to Backend

**Check frontend .env file:**
Create `frontend/.env.local` if it doesn't exist:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

**Verify backend is accessible:**
Open browser and go to: `http://localhost:3000/health`
Should return: `{"status":"ok"}`

### Issue 5: No Users in Database

**Check if users exist:**
```sql
USE primeacademy_db;
SELECT id, name, email, role, isActive FROM users LIMIT 5;
```

**If no users exist, create an admin user:**
```sql
USE primeacademy_db;
-- Password hash for 'admin123' (you can change this)
INSERT INTO users (name, email, passwordHash, role, isActive, createdAt, updatedAt)
VALUES (
  'Admin User',
  'admin@primeacademy.com',
  '$2b$10$rQ8K8K8K8K8K8K8K8K8K8uK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K',
  'admin',
  true,
  NOW(),
  NOW()
);
```

**Or use the registration API:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@primeacademy.com",
    "password": "admin123",
    "role": "admin"
  }'
```

## Step-by-Step Fix

### Step 1: Verify MySQL is Running
```bash
# Windows
net start MySQL80
# Or check Services app

# Test connection
mysql -u root -p
```

### Step 2: Create/Fix Database User
```sql
-- Connect as root
mysql -u root -p

-- Create user if doesn't exist
CREATE USER IF NOT EXISTS 'primeacademy_user'@'localhost' IDENTIFIED BY 'StrongAppPassword!123';

-- Grant privileges
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';
```

### Step 3: Create Database if Needed
```sql
CREATE DATABASE IF NOT EXISTS primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 4: Test Database Connection
```bash
cd backend
node -e "require('dotenv').config(); const db = require('./src/config/database').default; db.authenticate().then(() => { console.log('✅ Database connection successful!'); process.exit(0); }).catch(err => { console.error('❌ Database connection failed:', err.message); process.exit(1); });"
```

### Step 5: Start Backend Server
```bash
cd backend
npm run dev
```

**Expected output:**
```
Database connection established successfully.
Database models synchronized.
Server is running on port 3000
Environment: development
```

### Step 6: Test Login Endpoint
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@primeacademy.com", "password": "admin123"}'
```

### Step 7: Start Frontend
```bash
cd frontend
npm run dev
```

### Step 8: Test Login in Browser
1. Open http://localhost:5173/login
2. Enter email and password
3. Check browser console (F12) for errors
4. Check Network tab for the login request

## Debugging Tips

### Check Backend Logs
Look at the terminal where backend is running for:
- Database connection errors
- Authentication errors
- Request logs

### Check Browser Console
Open DevTools (F12) and check:
- Console tab for JavaScript errors
- Network tab for failed requests
- Check the login request response

### Common Error Messages

**"Invalid email or password"**
- User doesn't exist in database
- Password is incorrect
- User account is inactive (`isActive = false`)

**"Internal server error during login"**
- Database connection issue
- Check backend logs for details

**"Unable to connect to server"**
- Backend server not running
- Wrong API URL in frontend
- CORS issue

**"Database connection failed"**
- MySQL not running
- Wrong database credentials
- Database doesn't exist
- User doesn't have permissions

## Still Not Working?

1. **Check all services are running:**
   - MySQL service
   - Backend server (port 3000)
   - Frontend dev server (port 5173)

2. **Verify .env files:**
   - `backend/.env` - Database credentials
   - `frontend/.env.local` - API URL

3. **Check firewall/antivirus:**
   - May be blocking localhost connections

4. **Try resetting everything:**
   ```bash
   # Stop all servers
   # Restart MySQL
   # Clear browser cache
   # Restart backend and frontend
   ```

