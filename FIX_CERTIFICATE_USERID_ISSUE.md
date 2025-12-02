# Fix Certificate userId Issue

**Problem:** Code uses `req.user.userId` but might need `req.user.id`  
**Fix:** Use `req.user.id || req.user.userId` to handle both cases

---

## The Issue

Line 362 in certificate.controller.ts:
```typescript
issuedBy: req.user.userId,
```

But `req.user` might have `id` instead of `userId`, or `userId` might be undefined.

---

## Step 1: Check What req.user Actually Contains

```bash
cd /var/www/primeacademy_backend

# Check auth middleware
grep -n "req.user\|decoded\|userId" src/middleware/auth.middleware.ts

# Check JWT token creation
grep -n "jwt.sign\|userId" src/controllers/auth.controller.ts | head -10
```

---

## Step 2: Fix the Code

The fix is to use `req.user.id || req.user.userId` to handle both cases:

```bash
cd /var/www/primeacademy_backend

# Check current code
grep -n "issuedBy: req.user" src/controllers/certificate.controller.ts
```

**The fix:** Change line 362 from:
```typescript
issuedBy: req.user.userId,
```

To:
```typescript
issuedBy: req.user.id || req.user.userId,
```

---

## Step 3: Update Code on VPS

Since you need to update the code on the VPS, you have two options:

### Option A: Update via GitHub (Recommended)

```bash
cd /var/www/primeacademy_backend

# Pull latest code
git pull origin main

# If fix is in GitHub, rebuild and restart
npm run build
pm2 restart primeacademy-backend
```

### Option B: Manual Fix on VPS

```bash
cd /var/www/primeacademy_backend

# Edit the file
nano src/controllers/certificate.controller.ts

# Find line 362 (around line 362)
# Change: issuedBy: req.user.userId,
# To: issuedBy: req.user.id || req.user.userId,

# Save: Ctrl+X, Y, Enter

# Rebuild
npm run build

# Restart
pm2 restart primeacademy-backend
```

---

## Step 4: Alternative - Check Database First

Before fixing code, check if `issuedBy` is NULL in database:

```bash
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SELECT id, certificateNumber, issuedBy FROM certificates ORDER BY id DESC LIMIT 5;"
```

If `issuedBy` is NULL, that confirms the issue.

---

## Complete Fix Script

```bash
cd /var/www/primeacademy_backend

# 1. Check current code
echo "Current code:"
grep -n "issuedBy: req.user" src/controllers/certificate.controller.ts

# 2. Check database
echo "Database check:"
mysql -u primeacademy_user -p'Prime@89' primeacademy_db -e "SELECT id, issuedBy FROM certificates ORDER BY id DESC LIMIT 3;"

# 3. Fix the code (manual edit needed)
echo "Please edit src/controllers/certificate.controller.ts"
echo "Change line 362 from: issuedBy: req.user.userId,"
echo "To: issuedBy: req.user.id || req.user.userId,"

# 4. After editing, rebuild and restart
# npm run build
# pm2 restart primeacademy-backend
```

---

**The fix is simple: change `req.user.userId` to `req.user.id || req.user.userId` in the certificate controller!** ✅


