# Complete Fix for 502 Bad Gateway

## Step-by-Step Instructions for VPS

### Step 1: Upload Fixed Files
Upload these files to your VPS:
- `backend/src/index.ts` (with correct import: `import { runPendingMigrations }`)

### Step 2: Run These Commands on VPS

```bash
cd /var/www/primeacademy_backend

# 1. Fix .env file (CRITICAL!)
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://crm.prashantthakar.com,http://crm.prashantthakar.com
# Add your database credentials here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=primeacademy
EOF

# 2. Rebuild backend
npm run build

# 3. Stop old PM2 process
pm2 delete backend-api 2>/dev/null

# 4. Start backend
pm2 start dist/index.js --name backend-api
pm2 save

# 5. Wait for startup
sleep 5

# 6. Check status
pm2 list
pm2 logs backend-api --lines 20

# 7. Verify it's listening on 0.0.0.0 (NOT 127.0.0.1)
netstat -tlnp | grep 3001
# Should show: 0.0.0.0:3001

# 8. Test backend directly
curl http://localhost:3001/api/health

# 9. Test through nginx
curl https://api.prashantthakar.com/api/health
```

### Step 3: Verify Everything Works

Run the check script:
```bash
chmod +x check-backend-status.sh
bash check-backend-status.sh
```

## Common Issues and Fixes

### Issue 1: Backend listening on 127.0.0.1 instead of 0.0.0.0
**Symptom:** `netstat -tlnp | grep 3001` shows `127.0.0.1:3001`
**Fix:**
```bash
echo "NODE_ENV=production" >> .env
pm2 restart backend-api
```

### Issue 2: Backend not running
**Symptom:** `pm2 list` shows backend-api as stopped
**Fix:**
```bash
pm2 logs backend-api --err
# Check logs for errors, then:
pm2 restart backend-api
```

### Issue 3: Build errors
**Symptom:** `npm run build` fails
**Fix:**
```bash
npm install
npm run build
```

### Issue 4: Nginx still shows 502
**Symptom:** Backend works on localhost but nginx returns 502
**Fix:**
```bash
# Check nginx config
sudo nginx -t
sudo systemctl reload nginx

# Check nginx error logs
sudo tail -50 /var/log/nginx/api.prashantthakar.com.error.log
```

## Quick Verification Commands

```bash
# Check if backend is running
pm2 list

# Check what port backend is listening on
netstat -tlnp | grep 3001

# Test backend directly
curl http://localhost:3001/api/health

# Test through nginx
curl https://api.prashantthakar.com/api/health

# Check backend logs
pm2 logs backend-api --lines 30

# Check nginx logs
sudo tail -30 /var/log/nginx/api.prashantthakar.com.error.log
```

