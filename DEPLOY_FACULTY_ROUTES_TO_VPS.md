# 🚀 Deploy Faculty Routes to VPS

## Step 1: Commit and Push to GitHub (Local Machine)

### 1.1 Add Files to Git
```bash
cd backend
git add src/controllers/faculty.controller.ts
git add src/routes/faculty.routes.ts
git add src/index.ts
```

### 1.2 Commit Changes
```bash
git commit -m "Add faculty routes and controller for faculty registration"
```

### 1.3 Push to GitHub
```bash
git push origin main
```

**Verify:** Check GitHub to confirm files are uploaded:
- `src/controllers/faculty.controller.ts`
- `src/routes/faculty.routes.ts`
- `src/index.ts` (updated)

---

## Step 2: Deploy to VPS

### 2.1 Connect to VPS
```bash
ssh root@your-vps-ip
# Or use your VPS connection method
```

### 2.2 Navigate to Backend Directory
```bash
cd /var/www/primeacademy_backend
```

### 2.3 Pull Latest Code
```bash
git pull origin main
```

**If you get "dubious ownership" error:**
```bash
git config --global --add safe.directory /var/www/primeacademy_backend
git pull origin main
```

### 2.4 Verify Files Are Updated
```bash
ls -la src/controllers/faculty.controller.ts
ls -la src/routes/faculty.routes.ts
cat src/index.ts | grep "facultyRoutes"
```

**Should show:**
- `import facultyRoutes from './routes/faculty.routes';`
- `app.use('/api/faculty', facultyRoutes);`

### 2.5 Restart Backend Server (PM2)
```bash
pm2 restart primeacademy-backend
```

**Or if using different name:**
```bash
pm2 list
pm2 restart <backend-process-name>
```

### 2.6 Check Backend Logs
```bash
pm2 logs primeacademy-backend --lines 50
```

**Look for:**
- No errors
- Server started successfully
- Routes registered (if logging enabled)

### 2.7 Test the Route (Optional)
```bash
curl -X POST http://localhost:3000/api/faculty \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"userId": 1, "expertise": "React", "availability": "Full-time"}'
```

**Or test from frontend:**
- Try registering a new faculty member
- Should work without "Route /api/faculty not found" error

---

## Step 3: Verify Deployment

### 3.1 Check PM2 Status
```bash
pm2 status
```

**Should show:** `primeacademy-backend` status = `online`

### 3.2 Check Nginx (If Using)
```bash
sudo systemctl status nginx
```

**Should show:** `active (running)`

### 3.3 Test from Frontend
1. Go to Faculty Registration page
2. Fill in the form
3. Submit
4. Should successfully create faculty profile

---

## Troubleshooting

### Issue: "Route /api/faculty not found" still appears

**Solution:**
1. Check backend logs: `pm2 logs primeacademy-backend --lines 100`
2. Verify route is registered: `grep -r "facultyRoutes" src/index.ts`
3. Restart backend: `pm2 restart primeacademy-backend`
4. Clear browser cache and try again

### Issue: "Cannot find module './routes/faculty.routes'"

**Solution:**
1. Verify file exists: `ls -la src/routes/faculty.routes.ts`
2. Check file permissions: `chmod 644 src/routes/faculty.routes.ts`
3. Restart backend: `pm2 restart primeacademy-backend`

### Issue: Backend won't start

**Solution:**
1. Check logs: `pm2 logs primeacademy-backend --lines 100`
2. Check for TypeScript errors: `cd /var/www/primeacademy_backend && npm run build` (if using build)
3. Verify Node modules: `npm install`
4. Restart: `pm2 restart primeacademy-backend`

---

## Quick Commands Summary

**Local (Windows PowerShell):**
```powershell
cd backend
git add src/controllers/faculty.controller.ts src/routes/faculty.routes.ts src/index.ts
git commit -m "Add faculty routes and controller"
git push origin main
```

**VPS (SSH):**
```bash
cd /var/www/primeacademy_backend
git pull origin main
pm2 restart primeacademy-backend
pm2 logs primeacademy-backend --lines 50
```

---

## ✅ Success Indicators

- ✅ Git push successful
- ✅ Files exist on VPS
- ✅ Backend restarted without errors
- ✅ Faculty registration works from frontend
- ✅ No "Route /api/faculty not found" error

---

**After deployment, test faculty registration to confirm it's working!** 🎉




