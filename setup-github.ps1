# PowerShell script to setup Git and push to GitHub
# Run this script in PowerShell from the project root directory

Write-Host "🚀 Setting up Git and GitHub..." -ForegroundColor Green

# Check if Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed. Please install Git first." -ForegroundColor Red
    Write-Host "Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Git is installed" -ForegroundColor Green

# Check if already a git repository
if (Test-Path .git) {
    Write-Host "⚠️  Git repository already initialized" -ForegroundColor Yellow
    $continue = Read-Host "Do you want to continue? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
} else {
    # Initialize Git
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Cyan
    git init
}

# Add all files
Write-Host "📝 Adding files to Git..." -ForegroundColor Cyan
git add .

# Create initial commit
Write-Host "💾 Creating initial commit..." -ForegroundColor Cyan
git commit -m "Initial commit: Prime Academy CRM System"

Write-Host ""
Write-Host "✅ Local Git repository is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to GitHub.com and create a new repository" -ForegroundColor White
Write-Host "2. Copy the repository URL (HTTPS or SSH)" -ForegroundColor White
Write-Host "3. Run these commands:" -ForegroundColor White
Write-Host ""
Write-Host "   git remote add origin YOUR_REPOSITORY_URL" -ForegroundColor Cyan
Write-Host "   git branch -M main" -ForegroundColor Cyan
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or run this script with your repository URL:" -ForegroundColor Yellow
Write-Host "   .\setup-github.ps1 -repoUrl YOUR_REPOSITORY_URL" -ForegroundColor Cyan
Write-Host ""

# Check if repository URL is provided as parameter
param(
    [string]$repoUrl = ""
)

if ($repoUrl -ne "") {
    Write-Host "🔗 Adding remote repository..." -ForegroundColor Cyan
    git remote add origin $repoUrl
    
    Write-Host "🌿 Setting branch to main..." -ForegroundColor Cyan
    git branch -M main
    
    Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
    Write-Host "You may be prompted for GitHub credentials:" -ForegroundColor Yellow
    Write-Host "- Username: Your GitHub username" -ForegroundColor Yellow
    Write-Host "- Password: Use a Personal Access Token (not your password)" -ForegroundColor Yellow
    Write-Host ""
    
    git push -u origin main
    
    Write-Host ""
    Write-Host "✅ Code pushed to GitHub successfully!" -ForegroundColor Green
}


