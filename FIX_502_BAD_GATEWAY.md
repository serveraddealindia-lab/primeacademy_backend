# Fix 502 Bad Gateway Error

## 🔴 Problem
- API returns: `502 Bad Gateway`
- This means Nginx can't connect to the backend server

## 🔍 Step-by-Step Diagnosis

### Step 1: Check if Backend is Running
```bash
# Check PM2 processes
pm2 list

# Check if backend process exists
pm2 status | grep backend

# Check all node processes
ps aux | grep node
```

### Step 2: Check Backend Port
```bash
# Check if port 3000 is listening
netstat -tulpn | grep 3000

# Or using ss
ss -tulpn | grep 3000

# Check what's using port 3000
lsof -i :3000
```

### Step 3: Check Backend Logs
```bash
# PM2 logs
pm2 logs primeacademy-backend --lines 50

# Or if using systemd
journalctl -u primeacademy-backend -n 50

# Or check if there's a log file
tail -f /var/www/primeacademy_backend/logs/*.log
```

### Step 4: Test Backend Directly
```bash
# Test backend on localhost
curl http://localhost:3000/api/health

# If this works, backend is running but Nginx config might be wrong
# If this fails, backend is not running
```

---

## ✅ Solutions

### Solution 1: Start/Restart Backend

#### Using PM2
```bash
cd /var/www/primeacademy_backend

# Check if process exists
pm2 list

# If process exists but stopped, restart it
pm2 restart primeacademy-backend

# If process doesn't exist, start it
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
# OR if using compiled JS:
pm2 start dist/index.js --name primeacademy-backend

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs primeacademy-backend
```

#### Using systemd
```bash
# Start service
sudo systemctl start primeacademy-backend

# Enable on boot
sudo systemctl enable primeacademy-backend

# Check status
sudo systemctl status primeacademy-backend
```

#### Manual Start (for testing)
```bash
cd /var/www/primeacademy_backend

# Check environment variables
cat .env

# Start manually to see errors
npm start
# OR
node dist/index.js
# OR
tsx src/index.ts
```

### Solution 2: Fix Backend Startup Issues

#### Check Environment Variables
```bash
cd /var/www/primeacademy_backend
cat .env

# Make sure these are set:
# - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# - JWT_SECRET
# - PORT=3000
```

#### Check Dependencies
```bash
cd /var/www/primeacademy_backend

# Reinstall dependencies
npm install

# Check if pdfmake is installed
npm list pdfmake pdfkit
```

#### Check Database Connection
```bash
# Test database connection
mysql -u your_db_user -p -h localhost primeacademy_db

# If connection fails, check credentials in .env
```

#### Check Required Directories
```bash
# Create certificates directory
mkdir -p /var/www/primeacademy_backend/certificates
chmod 755 /var/www/primeacademy_backend/certificates

# Create uploads directory
mkdir -p /var/www/primeacademy_backend/uploads/general
chmod 755 /var/www/primeacademy_backend/uploads/general
```

### Solution 3: Fix Nginx Configuration

#### Check Nginx Config
```bash
# Find nginx config for API
sudo nano /etc/nginx/sites-available/api.prashantthakar.com
# OR
sudo nano /etc/nginx/sites-available/default
```

#### Verify Backend Proxy Settings
Make sure the config has:
```nginx
server {
    listen 80;
    server_name api.prashantthakar.com;

    location /api {
        proxy_pass http://localhost:3000;  # ← Check this port matches backend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Test and Reload Nginx
```bash
# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Solution 4: Check Firewall/Security

```bash
# Check if port 3000 is blocked
sudo ufw status

# If needed, allow port 3000 (only for localhost, not public)
# Backend should only be accessible via Nginx, not directly
```

---

## 🔧 Complete Fix Sequence

Run these commands in order:

```bash
# 1. Check backend status
cd /var/www/primeacademy_backend
pm2 list

# 2. If not running, start it
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
# OR
pm2 start dist/index.js --name primeacademy-backend

# 3. Check logs for errors
pm2 logs primeacademy-backend --lines 50

# 4. Test backend directly
curl http://localhost:3000/api/health

# 5. If backend works, check nginx
sudo nginx -t
sudo systemctl reload nginx

# 6. Test API through nginx
curl https://api.prashantthakar.com/api/health
```

---

## 🐛 Common Issues and Fixes

### Issue 1: Backend Crashes on Startup
```bash
# Check logs
pm2 logs primeacademy-backend

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Missing dependencies
# - Port already in use
```

### Issue 2: Port 3000 Already in Use
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change backend port in .env
# PORT=3001
# Then update nginx config to proxy to 3001
```

### Issue 3: Database Connection Error
```bash
# Test database connection
mysql -u your_db_user -p -h localhost primeacademy_db

# Check .env file
cat /var/www/primeacademy_backend/.env | grep DB_

# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"
```

### Issue 4: Missing Dependencies
```bash
cd /var/www/primeacademy_backend
npm install

# Check specific packages
npm list pdfmake pdfkit
```

### Issue 5: Permission Issues
```bash
# Check file permissions
ls -la /var/www/primeacademy_backend

# Fix ownership if needed
chown -R www-data:www-data /var/www/primeacademy_backend
# OR
chown -R root:root /var/www/primeacademy_backend
```

---

## ✅ Verification Checklist

After fixing, verify:

- [ ] Backend is running: `pm2 list` shows process
- [ ] Port 3000 is listening: `netstat -tulpn | grep 3000`
- [ ] Backend responds locally: `curl http://localhost:3000/api/health`
- [ ] Nginx config is correct: `sudo nginx -t`
- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] API works through Nginx: `curl https://api.prashantthakar.com/api/health`
- [ ] No errors in logs: `pm2 logs primeacademy-backend`

---

## 📝 Quick Diagnostic Script

Run this to diagnose the issue:

```bash
#!/bin/bash
echo "=== Backend Status ==="
pm2 list | grep backend
echo ""
echo "=== Port 3000 Status ==="
netstat -tulpn | grep 3000
echo ""
echo "=== Backend Test ==="
curl -s http://localhost:3000/api/health || echo "Backend not responding"
echo ""
echo "=== Nginx Status ==="
sudo systemctl status nginx | head -5
echo ""
echo "=== Recent Backend Logs ==="
pm2 logs primeacademy-backend --lines 10 --nostream
```

Save as `diagnose.sh`, make executable: `chmod +x diagnose.sh`, then run: `./diagnose.sh`




