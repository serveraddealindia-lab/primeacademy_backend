# Update Certificate Code on VPS

**Fix:** Change `req.user.userId` to `req.user.userId || req.user.id` and add `required: false` to associations

---

## Step 1: Update Code on VPS

```bash
cd /var/www/primeacademy_backend

# Edit certificate controller
nano src/controllers/certificate.controller.ts
```

**Find line 362** (around line 362):
```typescript
issuedBy: req.user.userId,
```

**Change to:**
```typescript
issuedBy: req.user.userId || req.user.id,
```

**Find lines 369-373** (the include section):
```typescript
include: [
  { model: db.User, as: 'student', attributes: ['id', 'name', 'email'] },
  { model: db.User, as: 'issuer', attributes: ['id', 'name', 'email'] },
],
```

**Change to:**
```typescript
include: [
  { model: db.User, as: 'student', attributes: ['id', 'name', 'email'], required: false },
  { model: db.User, as: 'issuer', attributes: ['id', 'name', 'email'], required: false },
],
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 2: Rebuild and Restart

```bash
cd /var/www/primeacademy_backend

# Rebuild TypeScript
npm run build

# Restart backend
pm2 restart primeacademy-backend

# Check logs
pm2 logs primeacademy-backend --lines 30
```

---

## Step 3: Test Certificate Creation

Try creating a certificate in the browser and check if it works.

---

## Alternative: Update via GitHub

If the fix is already in GitHub:

```bash
cd /var/www/primeacademy_backend

# Pull latest code
git pull origin main

# Rebuild
npm run build

# Restart
pm2 restart primeacademy-backend
```

---

## Quick Fix Script

```bash
cd /var/www/primeacademy_backend

# Backup original file
cp src/controllers/certificate.controller.ts src/controllers/certificate.controller.ts.backup

# Use sed to fix (if available)
sed -i 's/issuedBy: req\.user\.userId,/issuedBy: req.user.userId || req.user.id,/g' src/controllers/certificate.controller.ts

# Rebuild
npm run build

# Restart
pm2 restart primeacademy-backend

# Check logs
pm2 logs primeacademy-backend --lines 20
```

---

**After updating the code, certificates should work!** ✅


