# Quick VPS Login Setup Checklist

## ✅ Critical Items for Login to Work

### 1. Environment Variables (.env file)
```env
# Database (REQUIRED)
DB_HOST=your_database_host
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# JWT (REQUIRED - Generate a secure secret!)
JWT_SECRET=your-very-secure-secret-key-min-32-chars
JWT_EXPIRES_IN=24h

# Server
NODE_ENV=production
PORT=3001

# CORS
FRONTEND_URL=https://crm.prashantthakar.com
```

### 2. Generate Secure JWT Secret
```bash
openssl rand -base64 32
```
Copy the output and use it as `JWT_SECRET` in your `.env` file.

### 3. Build and Start Backend
```bash
cd /path/to/backend
npm install
npm run build
npm start
# OR use PM2: pm2 start dist/index.js --name primeacademy-backend
```

### 4. Verify Database Connection
- Database server is running
- Credentials in `.env` are correct
- Database `primeacademy_db` exists
- User table exists with at least one user

### 5. Test Login Endpoint
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

### 6. Nginx Configuration (if using reverse proxy)
- Proxy `/api` to `http://localhost:3001`
- SSL certificate configured
- CORS headers allowed

## 🔍 Troubleshooting

**Login not working? Check:**

1. ✅ Backend is running: `curl http://localhost:3001/api/health`
2. ✅ Database connection works
3. ✅ JWT_SECRET is set and not default value
4. ✅ User exists in database and is active
5. ✅ Frontend URL matches CORS configuration
6. ✅ Check backend logs for errors

## 📝 Quick Commands

```bash
# Check if backend is running
pm2 list
# OR
sudo systemctl status primeacademy-backend

# View logs
pm2 logs primeacademy-backend
# OR
sudo journalctl -u primeacademy-backend -f

# Restart backend
pm2 restart primeacademy-backend
# OR
sudo systemctl restart primeacademy-backend
```

