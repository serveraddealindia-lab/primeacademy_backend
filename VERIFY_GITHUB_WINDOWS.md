# Verify Code on GitHub (Windows PowerShell)

## ✅ PowerShell-Compatible Commands

### Step 1: Check Git Remote
```powershell
cd frontend
git remote -v
```
Should show: `https://github.com/serveraddealindia-lab/primeacademy_frontend.git`

### Step 2: Check Git Status
```powershell
git status
```
Should show: `working tree clean` (no uncommitted changes)

### Step 3: Check Last Commit
```powershell
git log -1 --oneline
```
Shows your last commit message

### Step 4: Check if Pushed to GitHub
```powershell
git fetch origin
git status
```
Should NOT say "ahead of origin/main"

### Step 5: Check New Files (PowerShell way)
```powershell
# Check for Certificate files
git ls-files | Select-String -Pattern "Certificate"

# Check for BatchDetails
git ls-files | Select-String -Pattern "BatchDetails"

# Check for certificate API
git ls-files | Select-String -Pattern "certificate.api"
```

### Step 6: Compare Local vs Remote
```powershell
# Check remote commit
git log origin/main -1 --oneline

# Compare with local
git log -1 --oneline

# If they match, code is on GitHub ✅
```

---

## 🎯 Quick Verification (PowerShell)

Run this complete check:

```powershell
cd frontend

Write-Host "=== 1. Git Remote ===" -ForegroundColor Cyan
git remote -v

Write-Host "`n=== 2. Git Status ===" -ForegroundColor Cyan
git status

Write-Host "`n=== 3. Last Commit ===" -ForegroundColor Cyan
git log -1 --oneline

Write-Host "`n=== 4. Fetch and Check Push Status ===" -ForegroundColor Cyan
git fetch origin
git status

Write-Host "`n=== 5. Check New Files ===" -ForegroundColor Cyan
Write-Host "CertificateManagement:" -ForegroundColor Yellow
git ls-files | Select-String -Pattern "CertificateManagement"
Write-Host "BatchDetails:" -ForegroundColor Yellow
git ls-files | Select-String -Pattern "BatchDetails"
Write-Host "certificate.api:" -ForegroundColor Yellow
git ls-files | Select-String -Pattern "certificate.api"

Write-Host "`n=== 6. Compare Local vs Remote ===" -ForegroundColor Cyan
$local = git rev-parse HEAD
$remote = git rev-parse origin/main 2>&1
if ($local -eq $remote) {
    Write-Host "✅ Local and remote match - code is on GitHub!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Local and remote differ - need to push!" -ForegroundColor Red
    Write-Host "Local:  $local" -ForegroundColor Yellow
    Write-Host "Remote: $remote" -ForegroundColor Yellow
}
```

---

## ✅ Verification Checklist

After running checks:

- [ ] Remote is GitHub: `git remote -v` shows GitHub URL
- [ ] Code is committed: `git status` shows "working tree clean"
- [ ] Code is pushed: `git status` doesn't say "ahead of origin"
- [ ] New files exist: `Select-String` finds new files
- [ ] Commits match: Local and remote commits are the same

---

## 🚀 If Code is NOT on GitHub

If verification shows code needs to be pushed:

```powershell
cd frontend

# Check what needs to be committed
git status

# Add all files
git add .

# Commit
git commit -m "Add certificate management and latest features"

# Push to GitHub
git push origin main

# Verify
git log origin/main -1 --oneline
```

---

## 🌐 Verify on GitHub Website

1. Visit: https://github.com/serveraddealindia-lab/primeacademy_frontend
2. Check if you can see:
   - `src/pages/CertificateManagement.tsx`
   - `src/pages/BatchDetails.tsx`
   - `src/api/certificate.api.ts`
3. Check the latest commit matches your local commit

---

## 📝 Summary

**PowerShell Commands:**
- Use `Select-String` instead of `grep`
- Use `Write-Host` for colored output
- Use backticks `` ` `` for newlines in PowerShell

**To verify code is on GitHub:**
1. Check remote: `git remote -v`
2. Check status: `git status`
3. Check push: `git fetch origin && git status`
4. Check files: `git ls-files | Select-String -Pattern "Certificate"`
5. Check website: Visit GitHub and see files




