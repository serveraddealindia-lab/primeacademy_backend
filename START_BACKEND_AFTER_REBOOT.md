# 🚀 Start Backend After VPS Reboot

## ✅ Quick Start

After rebooting the VPS, PM2 processes don't automatically start. Here's how to start the backend:

---

## 🚀 Step 1: Check PM2 Status

```bash
pm2 list
```

**Check if backend is running:**
- If `primeacademy-backend` shows `online` → Already running ✅
- If `stopped` or not listed → Need to start ❌

---

## 🚀 Step 2: Start Backend

### Option A: If Backend is Listed but Stopped

```bash
pm2 start primeacademy-backend
```

### Option B: If Backend is Not Listed (Fresh Start)

```bash
cd /var/www/primeacademy_backend
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
```

---

## 🚀 Step 3: Check Backend Status

```bash
pm2 list
```

**Should show:**
```
┌─────┬─────────────────────────┬─────────┬─────────┬──────────┬─────────┐
│ id  │ name                    │ mode    │ status  │ restart  │ uptime  │
├─────┼─────────────────────────┼─────────┼─────────┼──────────┼─────────┤
│ 0   │ primeacademy-backend     │ fork    │ online  │ 0        │ 5s      │
└─────┴─────────────────────────┴─────────┴─────────┴──────────┴─────────┘
```

**Status should be `online` ✅**

---

## 🚀 Step 4: Check Backend Logs

```bash
pm2 logs primeacademy-backend --lines 20
```

**Look for:**
- Server started successfully
- Database connected
- Any errors

---

## 🚀 Step 5: Test Backend API

```bash
curl -I https://api.prashantthakar.com/api/health
```

**Should return:**
- `HTTP/1.1 200 OK` ✅
- If `502 Bad Gateway` → Backend not running or not accessible ❌

---

## 🔧 Enable PM2 Auto-Start (So It Starts After Reboot)

To prevent this issue in the future, enable PM2 to start automatically on reboot:

```bash
# Save current PM2 process list
pm2 save

# Generate startup script
pm2 startup

# This will show a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

# Run the command it shows (copy-paste it)
```

**After this, PM2 will automatically start all saved processes on reboot!**

---

## 📋 Complete Startup Sequence

```bash
# 1. Check PM2 status
pm2 list

# 2. Start backend (if not running)
cd /var/www/primeacademy_backend
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx

# 3. Check status
pm2 list

# 4. Check logs
pm2 logs primeacademy-backend --lines 20

# 5. Test API
curl -I https://api.prashantthakar.com/api/health

# 6. Enable auto-start (optional but recommended)
pm2 save
pm2 startup
# Then run the command it shows
```

---

## 🔍 Troubleshooting

### Backend Won't Start

```bash
# Check for errors
pm2 logs primeacademy-backend --lines 50

# Check if port 3000 is in use
netstat -tulpn | grep 3000

# Check if database is accessible
cd /var/www/primeacademy_backend
cat .env | grep DB_
```

### Backend Starts But API Returns 502

```bash
# Check if backend is actually listening
netstat -tulpn | grep 3000

# Check Nginx error logs
sudo tail -50 /var/log/nginx/error.log

# Check backend logs
pm2 logs primeacademy-backend --lines 50
```

### PM2 Not Found

```bash
# Install PM2 globally
npm install -g pm2

# Then start backend
cd /var/www/primeacademy_backend
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
```

---

## ✅ Verification Checklist

After starting backend:

- [ ] `pm2 list` shows `primeacademy-backend` as `online` ✅
- [ ] `pm2 logs` shows server started successfully ✅
- [ ] `curl https://api.prashantthakar.com/api/health` returns `200 OK` ✅
- [ ] No errors in logs ✅

---

## 🎯 Quick Command (Copy-Paste)

```bash
cd /var/www/primeacademy_backend && pm2 start src/index.ts --name primeacademy-backend --interpreter tsx && pm2 list && pm2 logs primeacademy-backend --lines 10
```

This will:
1. Navigate to backend directory
2. Start backend
3. Show PM2 status
4. Show recent logs

---

## 📝 Summary

**After VPS reboot:**
1. Check PM2 status: `pm2 list`
2. Start backend: `pm2 start src/index.ts --name primeacademy-backend --interpreter tsx`
3. Verify: `pm2 list` and `curl https://api.prashantthakar.com/api/health`
4. Enable auto-start: `pm2 save && pm2 startup`

**After this, backend will be running!** ✅




