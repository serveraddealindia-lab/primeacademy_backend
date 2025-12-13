# GitHub Push Commands for Backend

## Step 1: Check Current Status
```bash
cd backend
git status
```

## Step 2: Add All Changes
```bash
git add .
```

## Step 3: Commit Changes
```bash
git commit -m "Add rupee symbol to PDF receipts, fix migration duplicate index errors"
```

## Step 4: Push to GitHub
```bash
git push origin main
```

**Or if your branch is named differently:**
```bash
git push origin master
# or
git push origin develop
```

## Complete Command Sequence:
```bash
cd backend
git add .
git commit -m "Add rupee symbol to PDF receipts, fix migration duplicate index errors"
git push origin main
```

## If You Need to Set Up Remote (First Time):
```bash
git remote add origin https://github.com/serveraddealindia-lab/primeacademy_backend.git
git branch -M main
git push -u origin main
```

## If You Get Authentication Error:
```bash
# Use personal access token instead of password
# Or set up SSH key
```

## Check What Branch You're On:
```bash
git branch
```

## If You Need to Pull First:
```bash
git pull origin main
```

