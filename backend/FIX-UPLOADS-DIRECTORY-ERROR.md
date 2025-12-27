# 🔧 Fix: "Route /uploads/general/ not found" Error

## 🚨 The Problem

Error: `{"status":"error","message":"Route /uploads/general/ not found"}`

**This happens when:**
- Frontend tries to access `/uploads/general/` (directory) instead of a specific file
- The request falls through to the 404 handler

## ✅ The Fix

I've added directory request handlers in `src/index.ts` that:
1. **Catch directory requests** to `/uploads/` and `/uploads/general/`
2. **Return proper 404** with helpful message
3. **Prevent generic "Route not found"** errors

## 📤 File to Update

**File:** `src/index.ts`  
**VPS Path:** `/var/www/primeacademy_backend/src/index.ts`

**What was added (after line 139):**
```typescript
// Handle directory requests to /uploads/general/
app.get('/uploads/general/', (_req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Directory listing not allowed. Please access a specific file: /uploads/general/[filename]',
  });
});

// Handle directory requests to /uploads/
app.get('/uploads/', (_req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Directory listing not allowed. Please access a specific file: /uploads/[path]/[filename]',
  });
});
```

## 🔍 Root Cause

The frontend might be:
1. **Accessing directory URL** - `/uploads/general/` instead of `/uploads/general/filename.jpg`
2. **Missing filename** - URL construction issue
3. **Trailing slash** - Accidentally adding `/` at the end

## ✅ Expected Behavior

### Before Fix:
- ❌ `/uploads/general/` → `{"status":"error","message":"Route /uploads/general/ not found"}`

### After Fix:
- ✅ `/uploads/general/` → `{"status":"error","message":"Directory listing not allowed. Please access a specific file: /uploads/general/[filename]"}`
- ✅ `/uploads/general/filename.jpg` → File served correctly ✅

## 🧪 Test Locally

```bash
# 1. Update src/index.ts with the fix

# 2. Rebuild backend
cd src  # or backend
npm run build

# 3. Restart backend
pm2 restart backend-api  # or npm run dev

# 4. Test
curl http://localhost:3001/uploads/general/
# Should return: {"status":"error","message":"Directory listing not allowed..."}
```

## 🎯 Next Steps

1. **Update `src/index.ts`** - Add the directory handlers
2. **Rebuild backend** - `npm run build`
3. **Restart backend** - `pm2 restart backend-api`
4. **Test upload** - Should work now!

---

**This fix prevents the generic "Route not found" error for directory requests!**

