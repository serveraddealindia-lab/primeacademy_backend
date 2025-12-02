# Push to GitHub - Step by Step Guide

Your repositories:
- **Backend:** https://github.com/serveraddealindia-lab/primeacademy_backend.git
- **Frontend:** https://github.com/serveraddealindia-lab/primeacademy_frontend.git

## Quick Method (Recommended)

Run the PowerShell script:
```powershell
.\push-to-github.ps1
```

This will automatically:
1. Set up backend repository and push
2. Set up frontend repository and push

## Manual Method

### Step 1: Push Backend

```powershell
# Navigate to backend
cd backend

# Initialize Git (if not already)
git init

# Add remote
git remote add origin https://github.com/serveraddealindia-lab/primeacademy_backend.git
# Or update if exists:
# git remote set-url origin https://github.com/serveraddealindia-lab/primeacademy_backend.git

# Add all files
git add .

# Commit
git commit -m "Initial commit: Prime Academy Backend with all features"

# Push
git branch -M main
git push -u origin main
```

### Step 2: Push Frontend

```powershell
# Navigate to frontend
cd ..\frontend

# Initialize Git (if not already)
git init

# Add remote
git remote add origin https://github.com/serveraddealindia-lab/primeacademy_frontend.git
# Or update if exists:
# git remote set-url origin https://github.com/serveraddealindia-lab/primeacademy_frontend.git

# Add all files
git add .

# Commit
git commit -m "Initial commit: Prime Academy Frontend with all features"

# Push
git branch -M main
git push -u origin main
```

## GitHub Authentication

When prompted for credentials:
- **Username:** Your GitHub username
- **Password:** Use a **Personal Access Token** (NOT your GitHub password)

To create a Personal Access Token:
1. Go to GitHub → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token
4. Select `repo` scope
5. Copy the token and use it as password

## Verify Upload

After pushing, check:
- Backend: https://github.com/serveraddealindia-lab/primeacademy_backend
- Frontend: https://github.com/serveraddealindia-lab/primeacademy_frontend

## Next: Deploy to VPS

After code is on GitHub, follow `GITHUB_DEPLOYMENT_GUIDE.md` to deploy to VPS.


