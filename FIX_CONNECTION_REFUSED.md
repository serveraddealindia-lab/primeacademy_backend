# Fix "Connection Refused" Error - Backend Not Running

## 🔴 Problem
- **Error:** `connect() failed (111: Connection refused) while connecting to upstream`
- **Target:** `http://127.0.0.1:3000`
- **Meaning:** Backend server is NOT running on port 3000

---

## ✅ Step-by-Step Fix

### Step 1: Check if Backend is Running

```bash
# Check PM2 processes
pm2 list

# Check if port 3000 is listening
netstat -tulpn | grep 3000
# OR
ss -tulpn | grep 3000

# Check all node processes
ps aux | grep node
```

**If nothing shows up, backend is not running.**

### Step 2: Start Backend

```bash
cd /var/www/primeacademy_backend

# Check if backend process exists in PM2
pm2 list | grep primeacademy-backend

# If process exists but stopped, restart it
pm2 restart primeacademy-backend

# If process doesn't exist, start it
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
# OR if using compiled JS:
pm2 start dist/index.js --name primeacademy-backend

# Save PM2 configuration
pm2 save
```

### Step 3: Verify Backend Started

```bash
# Check PM2 status
pm2 status

# Should show: primeacademy-backend | online

# Check logs
pm2 logs primeacademy-backend --lines 20

# Look for: "Server running on port 3000" or similar
```

### Step 4: Test Backend Directly

```bash
# Test backend on localhost
curl http://localhost:3000/api/health

# Should return JSON response, not "Connection refused"
```

### Step 5: Verify Port is Listening

```bash
# Check if port 3000 is now listening
netstat -tulpn | grep 3000

# Should show something like:
# tcp  0  0  127.0.0.1:3000  LISTEN  <pid>/node
```

### Step 6: Test Through Nginx

```bash
# Test API through nginx
curl https://api.prashantthakar.com/api/health

# Should return JSON, not 502 or Connection refused
```

---

## 🔧 Complete Fix Sequence

Run these commands in order:

```bash
# 1. Check backend status
echo "=== Backend Status ==="
pm2 list
netstat -tulpn | grep 3000

# 2. Navigate to backend
cd /var/www/primeacademy_backend

# 3. Check if process exists
if pm2 list | grep -q "primeacademy-backend"; then
    echo "Restarting existing process..."
    pm2 restart primeacademy-backend
else
    echo "Starting new process..."
    pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
fi

# 4. Save PM2 config
pm2 save

# 5. Wait a few seconds
sleep 5

# 6. Check status
echo ""
echo "=== Backend Status After Start ==="
pm2 status

# 7. Check logs
echo ""
echo "=== Recent Logs ==="
pm2 logs primeacademy-backend --lines 10 --nostream

# 8. Test backend
echo ""
echo "=== Testing Backend ==="
curl http://localhost:3000/api/health && echo " ✅ Backend is running!" || echo " ❌ Backend not responding"

# 9. Test through nginx
echo ""
echo "=== Testing Through Nginx ==="
curl https://api.prashantthakar.com/api/health && echo " ✅ API is working!" || echo " ❌ API not working"
```

---

## 🎯 Quick Fix (Most Common Solution)

```bash
# Start backend
cd /var/www/primeacademy_backend
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
pm2 save

# Wait a few seconds
sleep 5

# Check if it's running
pm2 status
curl http://localhost:3000/api/health
```

---

## 🐛 Troubleshooting

### Issue: Backend Won't Start

```bash
# Check logs for errors
pm2 logs primeacademy-backend --lines 50

# Common errors:
# - Database connection failed
# - Port already in use
# - Missing dependencies
# - Environment variables not set
```

### Issue: Port 3000 Already in Use

```bash
# Find what's using port 3000
lsof -i :3000
# OR
netstat -tulpn | grep 3000

# Kill the process
kill -9 <PID>

# Or change backend port in .env
# PORT=3001
# Then update nginx config to proxy to 3001
```

### Issue: Backend Starts Then Crashes

```bash
# Check logs
pm2 logs primeacademy-backend --lines 100

# Common causes:
# - Database connection error
# - Missing environment variables
# - Missing dependencies
# - Syntax errors in code
```

### Issue: Backend Runs But Nginx Still Gets Connection Refused

```bash
# Check if backend is binding to correct address
netstat -tulpn | grep 3000

# Should show: 127.0.0.1:3000 or 0.0.0.0:3000
# If it shows a different IP, that's the problem

# Check nginx upstream config
sudo grep -A 5 "proxy_pass.*3000" /etc/nginx/sites-available/api.prashantthakar.com

# Should point to: http://127.0.0.1:3000 or http://localhost:3000
```

---

## ✅ Verification Checklist

After fixing, verify:

- [ ] Backend is running: `pm2 list` shows `primeacademy-backend | online`
- [ ] Port 3000 is listening: `netstat -tulpn | grep 3000` shows listening
- [ ] Backend responds locally: `curl http://localhost:3000/api/health` returns JSON
- [ ] Backend logs show "Server running": `pm2 logs primeacademy-backend` shows success message
- [ ] API works through nginx: `curl https://api.prashantthakar.com/api/health` returns JSON
- [ ] No more connection refused errors: `sudo tail -20 /var/log/nginx/error.log` shows no new errors

---

## 📝 Diagnostic Command

Run this to see everything:

```bash
echo "=== PM2 Status ==="
pm2 list

echo ""
echo "=== Port 3000 Status ==="
netstat -tulpn | grep 3000 || echo "Port 3000 not listening"

echo ""
echo "=== Backend Test ==="
curl -s http://localhost:3000/api/health && echo " ✅ Backend OK" || echo " ❌ Backend not responding"

echo ""
echo "=== Recent Backend Logs ==="
pm2 logs primeacademy-backend --lines 10 --nostream

echo ""
echo "=== Recent Nginx Errors ==="
sudo tail -10 /var/log/nginx/error.log | grep -i "connection refused" || echo "No recent connection refused errors"
```

---

## 🚀 Most Likely Solution

The backend simply needs to be started:

```bash
cd /var/www/primeacademy_backend
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
pm2 save
sleep 5
pm2 status
curl http://localhost:3000/api/health
```

If this works, the connection refused errors will stop!




