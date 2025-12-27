# 📋 Complete Faculty Files List for VPS Upload

## ✅ Files to Upload (In Order)

### 🔴 PRIORITY 1: Backend Files (Upload First)

Upload these files to your VPS backend directory:

#### 1. **faculty.controller.ts**
   - **Local Path:** `src/controllers/faculty.controller.ts` OR `backend/src/controllers/faculty.controller.ts`
   - **VPS Path:** `/var/www/primeacademy_backend/src/controllers/faculty.controller.ts`
   - **What it does:** Contains `getFacultyProfile` function and JSON parsing

#### 2. **faculty.routes.ts**
   - **Local Path:** `src/routes/faculty.routes.ts` OR `backend/src/routes/faculty.routes.ts`
   - **VPS Path:** `/var/www/primeacademy_backend/src/routes/faculty.routes.ts`
   - **What it does:** Defines GET `/api/faculty/:userId` route

#### 3. **user.controller.ts**
   - **Local Path:** `src/controllers/user.controller.ts` OR `backend/src/controllers/user.controller.ts`
   - **VPS Path:** `/var/www/primeacademy_backend/src/controllers/user.controller.ts`
   - **What it does:** JSON parsing for faculty profile fields when fetching users

#### 4. **index.ts** (Check/Update)
   - **Local Path:** `src/index.ts` OR `backend/src/index.ts`
   - **VPS Path:** `/var/www/primeacademy_backend/src/index.ts`
   - **What to verify:** Should have `app.use('/api/faculty', facultyRoutes);`

---

### 🟡 PRIORITY 2: Frontend Files (Upload Second)

Upload these files to your VPS frontend directory:

#### 5. **FacultyRegistration.tsx**
   - **Local Path:** `frontend/src/pages/FacultyRegistration.tsx`
   - **VPS Path:** `/var/www/primeacademy_frontend/src/pages/FacultyRegistration.tsx`
   - **What it fixes:** 
     - Date of Birth field sync with state
     - Step-by-step validation
     - Next button works correctly
     - Form data persistence

#### 6. **FacultyEdit.tsx**
   - **Local Path:** `frontend/src/pages/FacultyEdit.tsx`
   - **VPS Path:** `/var/www/primeacademy_frontend/src/pages/FacultyEdit.tsx`
   - **What it fixes:**
     - All form fields populate correctly
     - Date of Birth displays
     - Expertise and availability parse correctly

#### 7. **FacultyManagement.tsx**
   - **Local Path:** `frontend/src/pages/FacultyManagement.tsx`
   - **VPS Path:** `/var/www/primeacademy_frontend/src/pages/FacultyManagement.tsx`
   - **What it fixes:**
     - View modal shows ALL faculty details
     - JSON fields parse correctly
     - No React errors

#### 8. **imageUtils.ts**
   - **Local Path:** `frontend/src/utils/imageUtils.ts`
   - **VPS Path:** `/var/www/primeacademy_frontend/src/utils/imageUtils.ts`
   - **What it fixes:** Image URL handling improvements

---

## 📤 Upload Methods

### Method 1: Using SCP (Secure Copy)

**From your local machine, run these commands:**

```bash
# Backend Files
scp src/controllers/faculty.controller.ts user@your-vps-ip:/var/www/primeacademy_backend/src/controllers/
scp src/routes/faculty.routes.ts user@your-vps-ip:/var/www/primeacademy_backend/src/routes/
scp src/controllers/user.controller.ts user@your-vps-ip:/var/www/primeacademy_backend/src/controllers/
scp src/index.ts user@your-vps-ip:/var/www/primeacademy_backend/src/

# Frontend Files
scp frontend/src/pages/FacultyRegistration.tsx user@your-vps-ip:/var/www/primeacademy_frontend/src/pages/
scp frontend/src/pages/FacultyEdit.tsx user@your-vps-ip:/var/www/primeacademy_frontend/src/pages/
scp frontend/src/pages/FacultyManagement.tsx user@your-vps-ip:/var/www/primeacademy_frontend/src/pages/
scp frontend/src/utils/imageUtils.ts user@your-vps-ip:/var/www/primeacademy_frontend/src/utils/
```

### Method 2: Direct File Edit on VPS

**SSH into VPS and edit files directly:**

```bash
ssh user@your-vps-ip
cd /var/www/primeacademy_backend/src/controllers
nano faculty.controller.ts
# Copy-paste the content from your local file
# Save: Ctrl+X, Y, Enter
```

### Method 3: Using WinSCP or FileZilla

1. Connect to your VPS using WinSCP/FileZilla
2. Navigate to the file paths listed above
3. Upload each file one by one
4. Replace existing files when prompted

---

## 🔧 After Uploading - Run These Commands on VPS

### Backend:
```bash
cd /var/www/primeacademy_backend
npm run build
pm2 restart backend-api
pm2 logs backend-api --lines 20
```

### Frontend:
```bash
cd /var/www/primeacademy_frontend
npm run build
# Or if using nginx to serve static files:
sudo systemctl reload nginx
```

---

## ✅ Verification Checklist

After uploading all files:

- [ ] Backend builds without errors (`npm run build`)
- [ ] Backend restarts successfully (`pm2 restart backend-api`)
- [ ] Faculty registration form works (all 7 steps)
- [ ] Date of Birth field saves and displays
- [ ] Next button works on all steps
- [ ] Faculty view shows all details
- [ ] Faculty edit form populates all fields
- [ ] Faculty edit saves changes
- [ ] No console errors in browser
- [ ] No errors in backend logs

---

## 🚨 If Files Don't Match Paths

If your local file structure is different, find the files using:

**On Windows (PowerShell):**
```powershell
Get-ChildItem -Recurse -Filter "FacultyRegistration.tsx"
Get-ChildItem -Recurse -Filter "faculty.controller.ts"
```

**On Linux/Mac:**
```bash
find . -name "FacultyRegistration.tsx"
find . -name "faculty.controller.ts"
```

Then use the actual paths you find.

---

## 📝 Quick Reference

**Total Files to Upload: 8 files**
- 4 Backend files
- 4 Frontend files

**Estimated Time:** 5-10 minutes

**Critical Files (Must Upload):**
1. faculty.controller.ts
2. faculty.routes.ts
3. FacultyRegistration.tsx
4. FacultyEdit.tsx
5. FacultyManagement.tsx

