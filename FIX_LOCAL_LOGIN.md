# Fix Local Login Issue

## Common Issues and Solutions

### 1. Database Connection Issue (Most Common)

**Problem:** `DB_PASSWORD` is empty in `.env` file, causing database connection to fail.

**Solution:**

1. **Check your MySQL password:**
   - Open MySQL Workbench or command line
   - Try to connect with your MySQL root user
   - Note your MySQL password

2. **Update `backend/.env` file:**
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=primeacademy_db
   DB_USER=root
   DB_PASSWORD=your_mysql_password_here
   NODE_ENV=development
   PORT=3000
   JWT_SECRET=your_jwt_secret_key_here
   ```

3. **If you don't have a password for MySQL root:**
   - Leave `DB_PASSWORD=` empty (but make sure MySQL allows passwordless login)
   - Or set a password: `ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password';`

### 2. Backend Server Not Running

**Check if backend is running:**
```bash
cd backend
npm run dev
```

**Expected output:**
```
Database connection established successfully.
Server is running on port 3000
```

**If you see database connection errors:**
- Check MySQL is running: `mysql -u root -p`
- Verify database exists: `SHOW DATABASES;`
- Create database if needed: `CREATE DATABASE primeacademy_db;`

### 3. Frontend API URL Mismatch

**Check `frontend/.env` or `frontend/.env.local`:**
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

**If file doesn't exist, create it:**
```bash
cd frontend
echo "VITE_API_BASE_URL=http://localhost:3000/api" > .env.local
```

### 4. CORS Issues

**Check `backend/src/index.ts` has CORS configured:**
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
```

### 5. No Users in Database

**If login fails with "Invalid email or password":**

1. **Check if users exist:**
   ```sql
   USE primeacademy_db;
   SELECT id, name, email, role FROM users;
   ```

2. **Create a test admin user:**
   ```bash
   cd backend
   npm run dev
   ```
   Then use the registration endpoint or create user via SQL.

3. **Or create user via API:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Admin User",
       "email": "admin@example.com",
       "password": "password123",
       "role": "admin"
     }'
   ```

### 6. Check Browser Console

**Open browser DevTools (F12) and check:**
- Network tab: Is the login request being sent?
- Console tab: Any JavaScript errors?
- Check the response from `/api/auth/login`

### 7. Verify Backend Routes

**Test backend directly:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your_email@example.com", "password": "your_password"}'
```

**Expected response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "...",
    "user": {...}
  }
}
```

## Quick Fix Steps

1. **Stop both frontend and backend servers**

2. **Update `backend/.env`:**
   ```env
   DB_PASSWORD=your_mysql_password
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your_secret_key_here
   ```

3. **Start backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Wait for: "Database connection established successfully."

4. **Start frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Test login:**
   - Open http://localhost:5173/login
   - Use valid credentials
   - Check browser console for errors

## Still Not Working?

1. **Check backend logs** for specific error messages
2. **Check MySQL is running:** `mysql -u root -p`
3. **Verify database exists:** `SHOW DATABASES LIKE 'primeacademy_db';`
4. **Check user exists:** `SELECT * FROM primeacademy_db.users WHERE email='your_email@example.com';`
5. **Test database connection manually:**
   ```bash
   cd backend
   node -e "require('dotenv').config(); const db = require('./src/config/database').default; db.authenticate().then(() => console.log('Connected!')).catch(err => console.error('Error:', err));"
   ```

