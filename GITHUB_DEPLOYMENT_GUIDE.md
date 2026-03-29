# 🚀 GitHub Deployment Guide - Prime Academy Backend

## Overview
Upload backend code to GitHub and deploy to live server using git pull.

---

## Part 1: Upload Backend to GitHub (Local Machine)

### Step 1: Prepare Your Local Repository

Open **PowerShell** in your project folder:
```powershell
cd C:\Users\Admin\Downloads\Primeacademynew
```

### Step 2: Initialize Git (if not already done)

```powershell
# Check git status
git status

# If not initialized, initialize
git init

# Add all files
git add .

# Commit
git commit -m "Complete backend fix - all reports and routes"
```

### Step 3: Connect to GitHub Repository

```powershell
# Add remote repository
git remote add origin https://github.com/serveraddealindia-lab/primeacademy_backend.git

# Verify remote is added
git remote -v
# Should show:
# origin  https://github.com/serveraddealindia-lab/primeacademy_backend.git (fetch)
# origin  https://github.com/serveraddealindia-lab/primeacademy_backend.git (push)
```

### Step 4: Push to GitHub

```powershell
# Check which branch you're on
git branch

# If on 'main' branch
git push -u origin main

# If on 'master' branch
git push -u origin master
```

**If you get an error about branch name:**
```powershell
# Set upstream for current branch
git push --set-upstream origin main

# Or force push (be careful!)
git push -f origin main
```

### Step 5: Verify on GitHub

1. Go to: https://github.com/serveraddealindia-lab/primeacademy_backend
2. Refresh the page
3. Check that files are uploaded:
   - ✅ `src/index.ts`
   - ✅ `src/controllers/report.controller.ts`
   - ✅ `src/controllers/attendanceReport.controller.ts`
   - ✅ `src/models/Task.ts`
   - ✅ `src/models/Report.ts`
   - ✅ `package.json`

---

## Part 2: Deploy to Live Server via PuTTY

### Step 1: Connect to Server

Open **PuTTY**:
- Host: `api.prashantthakar.com`
- Port: `22`
- Username: `root`
- Password: [your password]

### Step 2: Navigate to Backend Directory

```bash
cd /var/www/primeacademy_backend
```

### Step 3: Backup Important Files

```bash
# Backup .env file
cp .env .env.backup

# Backup any custom configs
cp package.json package.json.backup
```

### Step 4: Pull Latest Code from GitHub

```bash
# First, check git status
git status

# Pull latest code
git pull origin main
# OR if using master
git pull origin master
```

**If you get conflicts:**
```bash
# Reset local changes (be careful - backs up first!)
cp .env .env.local-backup
git reset --hard origin/main
# Then restore .env
cp .env.local-backup .env
```

### Step 5: Install Dependencies

```bash
# Clean install
npm ci
# OR
npm install
```

### Step 6: Build TypeScript

```bash
# Build the project
npm run build

# This creates the dist/ folder with compiled JavaScript
```

### Step 7: Restart Backend

```bash
# If using PM2 (recommended)
pm2 restart primeacademy-backend

# If PM2 process doesn't exist
pm2 start dist/index.js --name primeacademy-backend

# Save PM2 configuration
pm2 save
```

### Step 8: Check Logs

```bash
# View logs
pm2 logs primeacademy-backend --lines 50

# Or tail logs in real-time
pm2 logs primeacademy-backend
```

Look for:
- ✅ "Server is running on port 3001"
- ✅ "Registered API Routes"
- ✅ No compilation errors

### Step 9: Test Endpoints

```bash
# Test locally on server
curl http://localhost:3001/api/reports/pending-payments

# Should return JSON like:
# {"status":"success","data":{...}}
```

### Step 10: Test from Browser

Open these URLs in your browser:
```
https://api.prashantthakar.com/api/reports/pending-payments
https://api.prashantthakar.com/api/reports/portfolio-status
https://api.prashantthakar.com/api/reports/batch-details
https://api.prashantthakar.com/api/attendance-reports/students-without-batch
```

All should return JSON data (200 OK), not 404!

---

## Part 3: Ongoing Deployment Workflow

### For Future Updates:

**On Local Machine:**
```powershell
# Make your code changes
# ... edit files ...

# Commit and push
git add .
git commit -m "Description of changes"
git push origin main
```

**On Server (via PuTTY):**
```bash
cd /var/www/primeacademy_backend
git pull origin main
npm install
npm run build
pm2 restart primeacademy-backend
pm2 logs primeacademy-backend --lines 20
```

---

## 🔧 Troubleshooting

### Problem 1: Git Push Fails

**Error:** `rejected master -> master (non-fast-forward)`

**Solution:**
```powershell
# Fetch latest from GitHub
git fetch origin

# Rebase your changes
git rebase origin/main

# Then push
git push origin main
```

### Problem 2: Git Pull Fails on Server

**Error:** `error: Your local changes to the following files would be overwritten`

**Solution:**
```bash
# Backup your .env
cp .env .env.backup

# Reset all changes
git reset --hard HEAD

# Pull fresh code
git pull origin main

# Restore .env
cp .env.backup .env
```

### Problem 3: Build Fails After Pull

**Error:** TypeScript compilation errors

**Solution:**
```bash
# Delete node_modules and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Problem 4: PM2 Not Starting

**Error:** Process won't start

**Solution:**
```bash
# Stop all PM2 processes
pm2 stop all

# Delete old process
pm2 delete primeacademy-backend

# Start fresh
pm2 start dist/index.js --name primeacademy-backend

# Monitor
pm2 monit
```

---

## 📋 Complete One-Time Setup Commands

### Local Machine (PowerShell):
```powershell
cd C:\Users\Admin\Downloads\Primeacademynew
git init
git add .
git commit -m "Initial commit - complete backend"
git remote add origin https://github.com/serveraddealindia-lab/primeacademy_backend.git
git push -u origin main
```

### Server (PuTTY):
```bash
cd /var/www/primeacademy_backend
cp .env .env.backup
git pull origin main
npm install
npm run build
pm2 restart primeacademy-backend
pm2 logs primeacademy-backend --lines 50
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] GitHub shows all files at https://github.com/serveraddealindia-lab/primeacademy_backend
- [ ] Server pulled latest code (`git log` shows recent commit)
- [ ] `npm run build` completed without errors
- [ ] PM2 process is running (`pm2 list`)
- [ ] All API endpoints return 200 OK (not 404)
- [ ] Reports load in browser without errors
- [ ] CSV download buttons work

---

## 🎯 Quick Reference

### Push from Local:
```powershell
git add .
git commit -m "Your message"
git push origin main
```

### Pull on Server:
```bash
cd /var/www/primeacademy_backend
git pull origin main
npm install
npm run build
pm2 restart primeacademy-backend
```

### Check Status:
```bash
# On server
pm2 status
pm2 logs primeacademy-backend --lines 20
```

---

## 🆘 Emergency Rollback

If something breaks after git pull:

```bash
# On server
cd /var/www/primeacademy_backend

# View git history
git log --oneline -10

# Reset to previous version (replace COMMIT_ID)
git reset --hard COMMIT_ID

# Rebuild and restart
npm install
npm run build
pm2 restart primeacademy-backend
```

---

## 📞 Useful Commands

### Git Commands:
```bash
# Check current branch
git branch

# Check git status
git status

# View commit history
git log --oneline

# See what changed
git diff HEAD~1
```

### PM2 Commands:
```bash
# List all processes
pm2 list

# View logs
pm2 logs [process-name]

# Monitor in real-time
pm2 monit

# Restart process
pm2 restart [process-name]

# Stop process
pm2 stop [process-name]

# Delete process
pm2 delete [process-name]

# Save process list
pm2 save

# Startup configuration
pm2 startup
```

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ GitHub repo shows all your files
2. ✅ `git pull` on server completes without errors
3. ✅ `npm run build` finishes with "Build successful"
4. ✅ `pm2 list` shows process as "online"
5. ✅ Browser console shows NO 404 errors
6. ✅ All report endpoints return JSON data
7. ✅ CSV downloads work

**That's it! Your deployment workflow is now set up!** 🚀

From now on, just:
1. Code locally
2. `git push` 
3. SSH to server
4. `git pull && npm run build && pm2 restart`
