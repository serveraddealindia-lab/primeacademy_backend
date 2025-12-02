# Verify Frontend Code is on GitHub

## 🔍 Step 1: Check Local Git Status

```bash
cd frontend

# Check current branch
git branch

# Check remote
git remote -v

# Should show:
# origin  https://github.com/serveraddealindia-lab/primeacademy_frontend.git
```

---

## ✅ Step 2: Check if Code is Committed Locally

```bash
cd frontend

# Check git status
git status

# Should show: "nothing to commit, working tree clean"
# If you see uncommitted changes, commit them first
```

---

## 📤 Step 3: Check if Code is Pushed to GitHub

```bash
cd frontend

# Check last commit
git log -1 --oneline

# Check if local is ahead of remote
git status

# If it says "Your branch is ahead of 'origin/main'", you need to push
```

---

## 🚀 Step 4: Push to GitHub (if not pushed)

```bash
cd frontend

# Push to GitHub
git push origin main

# If you get error, check remote
git remote -v

# If remote is wrong, set it:
# git remote set-url origin https://github.com/serveraddealindia-lab/primeacademy_frontend.git
```

---

## ✅ Step 5: Verify Code is on GitHub

### Option A: Check via Command Line

```bash
cd frontend

# Fetch from GitHub
git fetch origin

# Compare local vs remote
git log HEAD..origin/main --oneline

# If empty, local and remote match ✅
# If you see commits, remote has code you don't have locally

# Check remote commit
git log origin/main -1 --oneline
```

### Option B: Check via GitHub Website

1. Visit: https://github.com/serveraddealindia-lab/primeacademy_frontend
2. Check if you can see:
   - `src/pages/CertificateManagement.tsx`
   - `src/pages/BatchDetails.tsx`
   - `src/api/certificate.api.ts`
   - Other new files you added

### Option C: Check Specific Files

```bash
cd frontend

# Check if new files exist in git
git ls-files | grep -i certificate
git ls-files | grep -i batchdetails

# Check if files are tracked
git ls-files src/pages/CertificateManagement.tsx
git ls-files src/pages/BatchDetails.tsx
git ls-files src/api/certificate.api.ts

# If files are listed, they're in git
```

---

## 🔍 Complete Verification Script

Run this to check everything:

```bash
#!/bin/bash
cd frontend

echo "=== 1. Git Remote ==="
git remote -v

echo ""
echo "=== 2. Current Branch ==="
git branch

echo ""
echo "=== 3. Git Status ==="
git status

echo ""
echo "=== 4. Last Commit ==="
git log -1 --oneline

echo ""
echo "=== 5. Check if Pushed ==="
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "none")

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Local and remote match - code is on GitHub!"
else
    echo "⚠️  Local and remote differ"
    echo "Local:  $LOCAL"
    echo "Remote: $REMOTE"
    echo ""
    echo "Commits on local but not remote:"
    git log origin/main..HEAD --oneline
fi

echo ""
echo "=== 6. Check New Files ==="
echo "CertificateManagement.tsx:"
git ls-files src/pages/CertificateManagement.tsx && echo "✅ Found" || echo "❌ Not found"

echo ""
echo "BatchDetails.tsx:"
git ls-files src/pages/BatchDetails.tsx && echo "✅ Found" || echo "❌ Not found"

echo ""
echo "certificate.api.ts:"
git ls-files src/api/certificate.api.ts && echo "✅ Found" || echo "❌ Not found"

echo ""
echo "=== 7. Recent Commits ==="
git log --oneline -5
```

---

## 🎯 Quick Check Commands

Run these one by one:

```bash
# 1. Check remote
cd frontend
git remote -v

# 2. Check status
git status

# 3. Check last commit
git log -1 --oneline

# 4. Check if pushed
git fetch origin
git status

# 5. If not pushed, push it
git push origin main

# 6. Verify on GitHub
git log origin/main -1 --oneline
```

---

## ✅ Verification Checklist

- [ ] Remote is set to GitHub: `git remote -v` shows GitHub URL
- [ ] Code is committed: `git status` shows "working tree clean"
- [ ] Code is pushed: `git status` doesn't say "ahead of origin"
- [ ] New files exist: `git ls-files` shows new files
- [ ] GitHub has latest: Visit GitHub website and see new files

---

## 🚀 If Code is NOT on GitHub

If verification shows code is not on GitHub:

```bash
cd frontend

# 1. Check what needs to be committed
git status

# 2. Add all files
git add .

# 3. Commit
git commit -m "Add certificate management and latest features"

# 4. Push to GitHub
git push origin main

# 5. Verify
git log origin/main -1 --oneline
```

---

## 📝 Summary

**To verify code is on GitHub:**

1. Check remote: `git remote -v` → Should show GitHub URL
2. Check status: `git status` → Should be clean and up to date
3. Check push: `git fetch origin && git status` → Should not say "ahead"
4. Check files: `git ls-files | grep Certificate` → Should show new files
5. Check website: Visit GitHub and see files

**If everything checks out, code is on GitHub! ✅**




