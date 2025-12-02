# Verify GitHub Code is on VPS

## 🔴 Problem
- New code uploaded to GitHub ✅
- But VPS still showing old code ❌
- **Need to pull code from GitHub to VPS**

---

## 🔍 Step 1: Check if Code is Pulled from GitHub

```bash
cd /var/www/primeacademy_frontend

# Check current commit
git log -1 --oneline

# Check remote
git remote -v

# Check if there are updates on GitHub
git fetch origin

# Compare local vs remote
git status

# See what commits are on GitHub but not on VPS
git log HEAD..origin/main --oneline
```

**If you see commits listed, they're on GitHub but NOT on VPS!**

---

## ✅ Step 2: Pull Latest Code from GitHub

```bash
cd /var/www/primeacademy_frontend

# Pull latest code
git pull origin main

# If you get "unrelated histories" error:
# git pull origin main --allow-unrelated-histories

# Verify new code is there
git log -1 --oneline
```

---

## 🔄 Step 3: Rebuild After Pulling

```bash
cd /var/www/primeacademy_frontend

# Install any new dependencies
npm install

# Rebuild frontend
npm run build

# Verify new build
ls -lth dist/assets/ | head -3
# Should show CURRENT timestamp
```

---

## 🚀 Complete Update Sequence

Run this complete sequence:

```bash
#!/bin/bash
echo "=== STEP 1: Check Current Code ==="
cd /var/www/primeacademy_frontend
echo "Current commit:"
git log -1 --oneline
echo ""
echo "Remote:"
git remote -v

echo ""
echo "=== STEP 2: Check for Updates ==="
git fetch origin
echo ""
echo "Commits on GitHub but not on VPS:"
git log HEAD..origin/main --oneline

if [ -z "$(git log HEAD..origin/main --oneline)" ]; then
    echo "✅ VPS is up to date with GitHub"
else
    echo "⚠️  VPS is behind GitHub - need to pull!"
fi

echo ""
echo "=== STEP 3: Pull Latest Code ==="
git pull origin main

echo ""
echo "=== STEP 4: Install Dependencies ==="
npm install

echo ""
echo "=== STEP 5: Rebuild ==="
npm run build

echo ""
echo "=== STEP 6: Verify Build ==="
ls -lth dist/assets/ | head -3
stat dist/index.html

echo ""
echo "=== STEP 7: Fix Permissions ==="
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist

echo ""
echo "=== STEP 8: Restart Nginx ==="
sudo systemctl restart nginx

echo ""
echo "=== STEP 9: Verify ==="
echo "New commit:"
git log -1 --oneline
echo ""
echo "Server Last-Modified:"
curl -I https://crm.prashantthakar.com 2>/dev/null | grep Last-Modified

echo ""
echo "✅ Done! Test in browser with Ctrl+Shift+R"
```

---

## 🎯 Quick Fix (Most Likely Solution)

```bash
cd /var/www/primeacademy_frontend && \
git fetch origin && \
git pull origin main && \
npm install && \
npm run build && \
sudo chown -R www-data:www-data dist && \
sudo systemctl restart nginx && \
echo "New commit:" && git log -1 --oneline
```

---

## 🔍 Verify Code is Updated

### Check 1: Compare Commits
```bash
cd /var/www/primeacademy_frontend

# Local commit
echo "Local commit:"
git log -1 --oneline

# Remote commit (on GitHub)
echo ""
echo "GitHub commit:"
git fetch origin
git log origin/main -1 --oneline

# If they're different, pull needed!
```

### Check 2: Check Specific Files
```bash
# Check if new files exist
cd /var/www/primeacademy_frontend

# Look for new files you added
ls -la src/pages/CertificateManagement.tsx
ls -la src/pages/BatchDetails.tsx
ls -la src/api/certificate.api.ts

# If files don't exist, code wasn't pulled
```

### Check 3: Check File Content
```bash
# Check if new code is in files
cd /var/www/primeacademy_frontend

# Example: Check certificate management exists
grep -r "CertificateManagement" src/ 2>/dev/null

# If nothing found, code wasn't pulled
```

---

## 🐛 Troubleshooting

### Issue: Git Pull Fails
```bash
# Check for uncommitted changes
git status

# If you have local changes, stash them
git stash

# Then pull
git pull origin main

# Restore stashed changes if needed
git stash pop
```

### Issue: "Unrelated Histories"
```bash
# If you get this error, use:
git pull origin main --allow-unrelated-histories

# Or reset and pull fresh
git fetch origin
git reset --hard origin/main
```

### Issue: Pulled But Still Old Code
```bash
# Make sure you rebuilt after pulling
cd /var/www/primeacademy_frontend
npm run build

# Check build timestamp
ls -lth dist/assets/ | head -3

# Restart nginx
sudo systemctl restart nginx
```

### Issue: Remote Not Set
```bash
# Check remote
git remote -v

# If not set to GitHub, set it:
git remote set-url origin https://github.com/serveraddealindia-lab/primeacademy_frontend.git

# Verify
git remote -v
```

---

## ✅ Complete Verification Checklist

After pulling and rebuilding:

- [ ] Code pulled: `git log -1` shows latest commit from GitHub
- [ ] Dependencies updated: `npm install` completed
- [ ] Build is new: `ls -lth dist/assets/` shows current timestamp
- [ ] Permissions correct: `ls -la dist/` shows www-data ownership
- [ ] Nginx restarted: `sudo systemctl status nginx` shows active
- [ ] Server serving new: `curl -I` shows current Last-Modified
- [ ] Browser shows new: Hard refresh (`Ctrl+Shift+R`) shows new code

---

## 📝 Quick Diagnostic

Run this to see everything:

```bash
cd /var/www/primeacademy_frontend

echo "=== Local Commit ==="
git log -1 --oneline

echo ""
echo "=== Fetch from GitHub ==="
git fetch origin

echo ""
echo "=== GitHub Commit ==="
git log origin/main -1 --oneline

echo ""
echo "=== Commits on GitHub but not VPS ==="
git log HEAD..origin/main --oneline

echo ""
echo "=== Build Timestamp ==="
ls -lth dist/assets/ | head -3

echo ""
echo "=== Server Last-Modified ==="
curl -I https://crm.prashantthakar.com 2>/dev/null | grep Last-Modified

echo ""
if [ -z "$(git log HEAD..origin/main --oneline)" ]; then
    echo "✅ Code is up to date"
else
    echo "⚠️  Need to pull: git pull origin main"
fi
```

---

## 🎯 Most Likely Issue

**You uploaded to GitHub but didn't pull on VPS!**

**Fix:**
```bash
cd /var/www/primeacademy_frontend
git pull origin main
npm install
npm run build
sudo systemctl restart nginx
```

Then test in browser with `Ctrl+Shift+R`!




