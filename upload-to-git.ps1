# Complete Backend Git Upload Fix Script
# This ensures ALL required files are added to Git before pushing

Write-Host "🚀 Prime Academy Backend - Complete Git Upload" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Change to project directory
Set-Location "C:\Users\Admin\Downloads\Primeacademynew"

Write-Host "Step 1: Verifying critical files exist..." -ForegroundColor Yellow
$criticalFiles = @(
    "src/models/Report.ts",
    "src/models/Task.ts",
    "src/models/TaskStudent.ts",
    "src/models/index.ts",
    "src/controllers/attendanceDraft.controller.ts",
    "src/controllers/lecture.controller.ts",
    "src/controllers/task.controller.ts",
    "src/controllers/attendanceReport.controller.ts",
    "src/controllers/report.controller.ts",
    "src/routes/attendanceDraft.routes.ts",
    "src/routes/lecture.routes.ts",
    "src/routes/task.routes.ts",
    "src/routes/report.routes.ts"
)

$missingFiles = @()
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file - MISSING!" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`n❌ CRITICAL: Some files are missing locally!" -ForegroundColor Red
    Write-Host "Missing files:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    Write-Host "`nPlease restore these files first!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All critical files found!" -ForegroundColor Green

Write-Host "`nStep 2: Checking Git status..." -ForegroundColor Yellow
git status

Write-Host "`nStep 3: Adding ALL files to Git (including previously missed ones)..." -ForegroundColor Yellow

# Force add all the critical files that were missing
foreach ($file in $criticalFiles) {
    git add -f $file
    Write-Host "  Added: $file" -ForegroundColor Green
}

# Also add everything else
git add .

Write-Host "`nStep 4: Current Git status:" -ForegroundColor Yellow
git status --short

Write-Host "`nStep 5: Committing changes..." -ForegroundColor Yellow
$commitMessage = "Complete backend deployment - all models, controllers, and routes included"
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️ Nothing to commit or commit failed." -ForegroundColor Yellow
    Write-Host "This is OK if files were already committed." -ForegroundColor Yellow
} else {
    Write-Host "`n✓ Changes committed successfully!" -ForegroundColor Green
}

Write-Host "`nStep 6: Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "Repository: https://github.com/serveraddealindia-lab/primeacademy_backend`n" -ForegroundColor Cyan

git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ SUCCESS! Files pushed to GitHub." -ForegroundColor Green
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. SSH to your VPS:" -ForegroundColor White
    Write-Host "   ssh root@api.prashantthakar.com" -ForegroundColor Gray
    Write-Host "`n2. Navigate to backend:" -ForegroundColor White
    Write-Host "   cd /var/www/primeacademy_backend" -ForegroundColor Gray
    Write-Host "`n3. Pull latest code:" -ForegroundColor White
    Write-Host "   git pull origin main" -ForegroundColor Gray
    Write-Host "`n4. Rebuild:" -ForegroundColor White
    Write-Host "   npm install && npm run build" -ForegroundColor Gray
    Write-Host "`n5. Restart PM2:" -ForegroundColor White
    Write-Host "   pm2 restart primeacademy-backend" -ForegroundColor Gray
} else {
    Write-Host "`n❌ Push failed!" -ForegroundColor Red
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "- You have unpushed commits" -ForegroundColor White
    Write-Host "- Network issue" -ForegroundColor White
    Write-Host "- Permission denied" -ForegroundColor White
    Write-Host "`nTry running 'git pull --rebase' then 'git push' again" -ForegroundColor White
}

Write-Host "`nDone!" -ForegroundColor Cyan
