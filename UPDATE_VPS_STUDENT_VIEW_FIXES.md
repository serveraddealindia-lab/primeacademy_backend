# Update VPS with Student View Fixes

**What Changed:**
- Added total students count display
- Fixed date format to dd/mm/yyyy
- Added emergency contact fields display (number, name, relation)
- Added payment plan display (total deal, booking amount, balance, EMI plan)

**Files Modified:**
- `frontend/src/pages/StudentManagement.tsx`

---

## Step 1: Push Changes to GitHub

### On Your Local Machine (Windows):

```powershell
# Navigate to frontend directory
cd frontend

# Check status
git status

# Add changes
git add src/pages/StudentManagement.tsx

# Commit
git commit -m "Fix student view: Add emergency contact, payment plan, date format, and total count"

# Push to GitHub
git push origin main
```

**If you're in the root directory:**

```powershell
cd frontend
git add .
git commit -m "Fix student view: Add emergency contact, payment plan, date format, and total count"
git push origin main
```

---

## Step 2: Update VPS

### Connect to VPS via SSH:

```bash
ssh root@your-vps-ip
```

### Navigate to Frontend Directory:

```bash
cd /var/www/primeacademy_frontend
```

### Pull Latest Code:

```bash
# Check current branch
git branch

# Pull latest changes
git pull origin main
```

**If you get conflicts or need to reset:**

```bash
# Backup current code (optional)
cp -r src src.backup

# Reset to match GitHub (WARNING: This will discard local changes)
git fetch origin
git reset --hard origin/main
```

### Install Dependencies (if needed):

```bash
npm install
```

### Rebuild Frontend:

```bash
npm run build
```

**This will create/update the `dist` folder with the new code.**

---

## Step 3: Restart Frontend Service

### If using PM2:

```bash
# Check current processes
pm2 list

# Restart frontend
pm2 restart primeacademy-frontend

# Or if it's named differently
pm2 restart all

# Check logs
pm2 logs primeacademy-frontend --lines 50
```

### If using Nginx (static files):

```bash
# Nginx should automatically serve the new dist folder
# But you can reload nginx to be sure
sudo systemctl reload nginx

# Or restart
sudo systemctl restart nginx
```

### If using a different setup:

```bash
# Check what's serving the frontend
ps aux | grep node
ps aux | grep nginx

# Restart accordingly
```

---

## Step 4: Verify Changes

1. **Open your website:** `https://crm.prashantthakar.com` (or your domain)

2. **Login as admin**

3. **Go to Student Management**

4. **Check:**
   - ✅ Total students count shows in header
   - ✅ Click "View" on any student
   - ✅ Date of Birth shows as dd/mm/yyyy
   - ✅ Enrollment Date shows as dd/mm/yyyy
   - ✅ Emergency Contact section shows (if data exists)
   - ✅ Payment Plan section shows (if data exists)

---

## Step 5: Troubleshooting

### If frontend doesn't update:

```bash
# Clear browser cache
# Or use incognito/private mode

# Check if build was successful
cd /var/www/primeacademy_frontend
ls -la dist/

# Check nginx config
sudo nginx -t
sudo cat /etc/nginx/sites-available/primeacademy

# Check PM2 logs
pm2 logs primeacademy-frontend --lines 100
```

### If you see errors:

```bash
# Check frontend build errors
cd /var/www/primeacademy_frontend
npm run build

# Check for TypeScript errors
npm run type-check  # if available

# Check browser console for errors
# Open DevTools (F12) and check Console tab
```

### If dates still show wrong format:

```bash
# Clear browser cache completely
# Or hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

---

## Quick Update Script

**Save this as `update-frontend.sh` on VPS:**

```bash
#!/bin/bash

echo "=== Updating Frontend ==="

cd /var/www/primeacademy_frontend

echo "1. Pulling latest code..."
git pull origin main

echo "2. Installing dependencies..."
npm install

echo "3. Building frontend..."
npm run build

echo "4. Restarting PM2..."
pm2 restart primeacademy-frontend

echo "5. Checking status..."
pm2 status

echo "=== Update Complete ==="
echo "Check logs: pm2 logs primeacademy-frontend"
```

**Make it executable and run:**

```bash
chmod +x update-frontend.sh
./update-frontend.sh
```

---

## Summary

**What to upload:**
- ✅ Only `frontend/src/pages/StudentManagement.tsx` (already in GitHub)

**What to do on VPS:**
1. Pull latest code from GitHub
2. Rebuild frontend (`npm run build`)
3. Restart frontend service (PM2 or Nginx)

**No database changes needed** - all data is already in the database, we just fixed the display!

---

**After updating, test the student view to see all the new fields!** ✅

