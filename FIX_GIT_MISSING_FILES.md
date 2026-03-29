# 🚨 CRITICAL: Complete File List for Git Upload

## Problem
Your Git repository on VPS is missing critical files, causing TypeScript compilation errors.

## Missing Files That Must Be Uploaded to Git

### Backend - Models (ALL must be in Git):
```
✅ src/models/Report.ts          ← MISSING (causes db.Report error)
✅ src/models/Task.ts            ← MISSING (causes db.Task error)
✅ src/models/TaskStudent.ts     ← MISSING (imported by Task.ts)
✅ src/models/index.ts           ← Should include all model imports
```

### Backend - Controllers (ALL must be in Git):
```
✅ src/controllers/attendanceDraft.controller.ts  ← MISSING
✅ src/controllers/lecture.controller.ts          ← MISSING
✅ src/controllers/task.controller.ts             ← MISSING
✅ src/controllers/report.controller.ts           ← Has Report/Tasks usage
✅ src/controllers/attendanceReport.controller.ts ← Has getSavedReports functions
```

### Backend - Routes (ALL must be in Git):
```
✅ src/routes/attendanceDraft.routes.ts  ← MISSING
✅ src/routes/lecture.routes.ts          ← MISSING
✅ src/routes/task.routes.ts             ← MISSING
✅ src/routes/report.routes.ts           ← References saved report functions
```

---

## Step-by-Step Fix

### Step 1: Verify Files Exist Locally

Open PowerShell and run:
```powershell
cd C:\Users\Admin\Downloads\Primeacademynew

# Check if files exist
Test-Path src\models\Report.ts
Test-Path src\models\Task.ts
Test-Path src\models\TaskStudent.ts
Test-Path src\controllers\attendanceDraft.controller.ts
Test-Path src\controllers\lecture.controller.ts
Test-Path src\controllers\task.controller.ts
Test-Path src\controllers\attendanceReport.controller.ts
```

All should return `True`. If any return `False`, that file is missing locally too!

---

### Step 2: Add ALL Missing Files to Git

```powershell
cd C:\Users\Admin\Downloads\Primeacademynew

# Force add ALL files (even if .gitignore might skip some)
git add -f src/models/Report.ts
git add -f src/models/Task.ts
git add -f src/models/TaskStudent.ts
git add -f src/models/index.ts

git add -f src/controllers/attendanceDraft.controller.ts
git add -f src/controllers/lecture.controller.ts
git add -f src/controllers/task.controller.ts
git add -f src/controllers/attendanceReport.controller.ts
git add -f src/controllers/report.controller.ts

git add -f src/routes/attendanceDraft.routes.ts
git add -f src/routes/lecture.routes.ts
git add -f src/routes/task.routes.ts
git add -f src/routes/report.routes.ts

# Check status
git status
```

---

### Step 3: Commit and Push

```powershell
# Commit with detailed message
git commit -m "Add missing models, controllers, and routes for complete build"

# Push to GitHub
git push origin main
```

---

### Step 4: Verify on GitHub

1. Go to: https://github.com/serveraddealindia-lab/primeacademy_backend
2. Navigate to `src/models/`
3. Verify these files exist:
   - `Report.ts`
   - `Task.ts`
   - `TaskStudent.ts`
4. Navigate to `src/controllers/`
5. Verify these files exist:
   - `attendanceDraft.controller.ts`
   - `lecture.controller.ts`
   - `task.controller.ts`
   - `attendanceReport.controller.ts`
6. Navigate to `src/routes/`
7. Verify these files exist:
   - `attendanceDraft.routes.ts`
   - `lecture.routes.ts`
   - `task.routes.ts`

---

### Step 5: Deploy on VPS

SSH to your VPS and run:

```bash
cd /var/www/primeacademy_backend

# Pull latest code (should now include all missing files)
git pull origin main

# Verify files exist
ls -la src/models/Report.ts
ls -la src/models/Task.ts
ls -la src/models/TaskStudent.ts
ls -la src/controllers/attendanceDraft.controller.ts
ls -la src/controllers/lecture.controller.ts
ls -la src/controllers/task.controller.ts

# Install dependencies
npm install

# Build TypeScript (should work now!)
npm run build

# If build succeeds, restart
pm2 restart primeacademy-backend

# Check logs
pm2 logs primeacademy-backend --lines 50
```

---

## Expected Build Output

When build succeeds, you should see:
```
> primeacademy-backend@1.0.0 build
> tsc

✓ TypeScript compilation successful!
No errors found.
```

Then restart:
```
[PM2] Spawning PM2 daemon
[PM2] Starting app...
[PM2] Done.
```

---

## If Files Still Missing After Pull

If `git pull` doesn't bring all files, force checkout:

```bash
cd /var/www/primeacademy_backend

# Reset to match GitHub exactly
git fetch origin
git reset --hard origin/main

# Verify files
ls src/models/Report.ts
ls src/models/Task.ts

# Then build
npm install
npm run build
pm2 restart primeacademy-backend
```

---

## Why This Happened

Your `.gitignore` file might be excluding important files, OR you didn't add them before pushing.

Check your `.gitignore`:
```powershell
cat .gitignore
```

Make sure it does NOT contain:
```
# WRONG - Don't exclude these!
src/models/*.ts
src/controllers/*.ts
src/routes/*.ts
```

---

## Complete File Checklist for Backend

Before pushing to Git, verify ALL these files are tracked:

### Models (should all exist):
```bash
git ls-files src/models/*.ts
```

Expected output includes:
- Report.ts
- Task.ts  
- TaskStudent.ts
- index.ts
- (and all other models)

### Controllers:
```bash
git ls-files src/controllers/*.ts
```

Expected output includes:
- attendanceDraft.controller.ts
- lecture.controller.ts
- task.controller.ts
- attendanceReport.controller.ts
- report.controller.ts
- (and all others)

### Routes:
```bash
git ls-files src/routes/*.ts
```

Expected output includes:
- attendanceDraft.routes.ts
- lecture.routes.ts
- task.routes.ts
- report.routes.ts
- (and all others)

---

## Quick Fix Script (Run Locally)

Create a file `fix-git-upload.ps1`:

```powershell
# fix-git-upload.ps1

Write-Host "🔍 Checking for missing files..." -ForegroundColor Cyan

$missingFiles = @(
    "src/models/Report.ts",
    "src/models/Task.ts", 
    "src/models/TaskStudent.ts",
    "src/controllers/attendanceDraft.controller.ts",
    "src/controllers/lecture.controller.ts",
    "src/controllers/task.controller.ts",
    "src/controllers/attendanceReport.controller.ts",
    "src/routes/attendanceDraft.routes.ts",
    "src/routes/lecture.routes.ts",
    "src/routes/task.routes.ts"
)

$allExist = $true
foreach ($file in $missingFiles) {
    if (Test-Path $file) {
        Write-Host "✓ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "✗ Missing: $file" -ForegroundColor Red
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Host "`n❌ Some files are missing locally!" -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 Adding files to Git..." -ForegroundColor Yellow
git add -f $missingFiles

Write-Host "`n💾 Committing changes..." -ForegroundColor Yellow
git commit -m "Add missing models, controllers, and routes"

Write-Host "`n🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "`n✅ Upload complete!" -ForegroundColor Green
Write-Host "`nNext: SSH to VPS and run 'git pull origin main'" -ForegroundColor Cyan
```

Run it:
```powershell
.\fix-git-upload.ps1
```

---

## Deployment Commands Summary

### Local (PowerShell):
```powershell
cd C:\Users\Admin\Downloads\Primeacademynew

# Add all files
git add .

# Commit
git commit -m "Complete backend with all models and controllers"

# Push
git push origin main
```

### VPS (via SSH):
```bash
cd /var/www/primeacademy_backend

# Get latest code
git pull origin main

# Install
npm install

# Build
npm run build

# Restart
pm2 restart primeacademy-backend

# Verify
pm2 logs primeacademy-backend --lines 20
```

---

## Success Indicators

Build succeeds when:
- ✅ No TypeScript errors about missing properties
- ✅ All imports resolve successfully
- ✅ Output shows "compiled successfully"

Backend works when:
- ✅ PM2 shows process as "online"
- ✅ No crash loops
- ✅ API endpoints respond

---

## Emergency Backup Plan

If Git continues to have issues, use SCP to upload directly:

```powershell
# From local to VPS
pscp -r src/ root@api.prashantthakar.com:/var/www/primeacademy_backend/src/
pscp package.json root@api.prashantthakar.com:/var/www/primeacademy_backend/

# Then on VPS
ssh root@api.prashantthakar.com
cd /var/www/primeacademy_backend
npm install
npm run build
pm2 restart primeacademy-backend
```

This bypasses Git entirely and uploads files directly.

---

## Final Verification

After deployment, test:

```bash
# On VPS
curl http://localhost:3001/api/health
curl http://localhost:3001/api/reports/batch-details?type=present \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return JSON, not 500 error!
