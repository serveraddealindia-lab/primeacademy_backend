# IMMEDIATE FIX - Backend Restart Guide

## ⚡ QUICK FIX - Copy & Paste These Commands

### **Step 1: Stop Everything**
```powershell
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
```

### **Step 2: Rebuild**
```powershell
cd c:\Users\Admin\Downloads\Primeacademynew
npm run build
```

Wait for "Build completed successfully"

### **Step 3: Start Backend**
```powershell
npm start
```

Wait for "Server running on port 3001"

---

## 🎯 What's Wrong

Your backend is running OLD code from `dist/` folder without the new routes.

**Current situation:**
- ✅ Frontend code is correct
- ✅ Source code (`src/`) has all routes
- ❌ Compiled code (`dist/`) is outdated
- ❌ Server running old code = 404 errors

**Solution:** REBUILD + RESTART

---

## 🔍 How to Know It's Working

### **After Running `npm start`, You Should See:**

```
> primeacademy@1.0.0 start
> node dist/index.js

Server running on port 3001
Database connected successfully
```

If you see this, routes are now registered! ✅

---

### **Test in Browser:**

1. Open `http://localhost:5173`
2. Go to Reports page
3. Click "Batch Attendance"
4. Select batch and dates
5. Click "Generate Report"

**Expected:** Data loads successfully (no 404 error) ✅

---

## 🐛 If Build Fails

### **Error: Unused Variable**

If you see:
```
error TS6133: 'X' is declared but its value is never read
```

**Fix:** Remove the unused variable or add underscore prefix:
```typescript
// Change this:
const unusedVariable = something;

// To this:
const _unusedVariable = something;
// Or just remove it if not needed
```

Then rebuild:
```bash
npm run build
```

---

### **Error: Port 3001 Already in Use**

If you see:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Fix:**
```powershell
# Kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# Or kill all node processes
Stop-Process -Name node -Force

# Then restart
npm start
```

---

## 📋 Complete Command Sequence

Copy and paste this entire block into PowerShell:

```powershell
# Stop all node processes
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Wait 2 seconds
Start-Sleep -Seconds 2

# Navigate to project
cd c:\Users\Admin\Downloads\Primeacademynew

# Rebuild TypeScript
npm run build

# Start server
npm start
```

---

## ✅ Success Checklist

After restart, verify:

- [ ] Backend terminal shows "Server running on port 3001"
- [ ] No TypeScript errors during build
- [ ] Database connected successfully
- [ ] Test All Analysis report → Works (no 404)
- [ ] Test Batch Attendance → Loads data
- [ ] Test Students Without Batch → Shows students
- [ ] Download CSV buttons appear after data loads

---

## 🎯 Why This Keeps Happening

Every time you change `.ts` files in `src/`:

1. TypeScript must recompile: `npm run build`
2. Server must restart: `npm start`

**Think of it like this:**
- `src/` = Your recipe book (you make changes here)
- `dist/` = The actual dish being served (needs to be remade)
- Server = The waiter serving the dish

If you change the recipe but don't remake the dish, customers still get the old version!

---

## 🚀 One-Command Fix

Paste this ONE command and wait:

```powershell
cd c:\Users\Admin\Downloads\Primeacademynew; Stop-Process -Name node -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2; npm run build; npm start
```

This does everything automatically:
1. ✅ Stops Node processes
2. ✅ Waits 2 seconds
3. ✅ Rebuilds TypeScript
4. ✅ Starts fresh server

---

## 📞 When to Ask for Help

If after rebuilding and restarting you still see 404 errors:

1. Check backend terminal output
2. Look for any error messages during build
3. Verify "Server running on port 3001" appears
4. Share the exact error message you're seeing

---

**Ready? Copy the one-command fix above and paste it in your terminal!** 🚀
