# PowerShell script to push code to GitHub repositories
# Backend: https://github.com/serveraddealindia-lab/primeacademy_backend.git
# Frontend: https://github.com/serveraddealindia-lab/primeacademy_frontend.git

Write-Host "🚀 Pushing Prime Academy CRM to GitHub..." -ForegroundColor Green
Write-Host ""

# Check if Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed. Please install Git first." -ForegroundColor Red
    Write-Host "Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

$backendRepo = "https://github.com/serveraddealindia-lab/primeacademy_backend.git"
$frontendRepo = "https://github.com/serveraddealindia-lab/primeacademy_frontend.git"

# ============================================
# BACKEND
# ============================================
Write-Host "📦 Setting up Backend repository..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path "backend\.git") {
    Write-Host "⚠️  Backend Git repository already exists" -ForegroundColor Yellow
    Set-Location backend
    $currentRemote = git remote get-url origin 2>$null
    if ($currentRemote -ne $backendRepo) {
        Write-Host "Updating remote URL..." -ForegroundColor Yellow
        git remote set-url origin $backendRepo
    }
} else {
    Set-Location backend
    Write-Host "Initializing Git repository..." -ForegroundColor Cyan
    git init
    git remote add origin $backendRepo
}

Write-Host "Adding files..." -ForegroundColor Cyan
git add .

Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m "Initial commit: Prime Academy Backend" -m "Complete backend with all features including orientation, receipts, certificates, and payment management"

Write-Host "Setting branch to main..." -ForegroundColor Cyan
git branch -M main

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "You may be prompted for GitHub credentials:" -ForegroundColor Yellow
Write-Host "- Username: Your GitHub username" -ForegroundColor Yellow
Write-Host "- Password: Use a Personal Access Token (not your password)" -ForegroundColor Yellow
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend pushed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Backend push failed. Please check credentials." -ForegroundColor Red
}

Set-Location ..

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# FRONTEND
# ============================================
Write-Host "📦 Setting up Frontend repository..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path "frontend\.git") {
    Write-Host "⚠️  Frontend Git repository already exists" -ForegroundColor Yellow
    Set-Location frontend
    $currentRemote = git remote get-url origin 2>$null
    if ($currentRemote -ne $frontendRepo) {
        Write-Host "Updating remote URL..." -ForegroundColor Yellow
        git remote set-url origin $frontendRepo
    }
} else {
    Set-Location frontend
    Write-Host "Initializing Git repository..." -ForegroundColor Cyan
    git init
    git remote add origin $frontendRepo
}

Write-Host "Adding files..." -ForegroundColor Cyan
git add .

Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m "Initial commit: Prime Academy Frontend" -m "Complete frontend with React, TypeScript, and all features including orientation, payments, and student management"

Write-Host "Setting branch to main..." -ForegroundColor Cyan
git branch -M main

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "You may be prompted for GitHub credentials again..." -ForegroundColor Yellow
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend pushed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend push failed. Please check credentials." -ForegroundColor Red
}

Set-Location ..

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ GitHub upload complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Repository URLs:" -ForegroundColor Yellow
Write-Host "Backend:  $backendRepo" -ForegroundColor White
Write-Host "Frontend: $frontendRepo" -ForegroundColor White
Write-Host ""
Write-Host "Next step: Deploy to VPS using GITHUB_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan


