# Faculty Files to Upload to VPS

## ✅ Complete List of Files for Faculty Functionality

Since faculty is working perfectly in local, upload these files to your VPS:

### Frontend Files (Upload to: `/var/www/primeacademy_frontend/src/` or build and upload `dist/`)

1. **`frontend/src/pages/FacultyRegistration.tsx`**
   - Fixed dateOfBirth field sync with state
   - Fixed step-by-step validation
   - Fixed Next button to use type="submit"
   - Fixed form data persistence across steps

2. **`frontend/src/pages/FacultyManagement.tsx`**
   - Fixed view modal to show all faculty details
   - Fixed JSON parsing for expertise and availability
   - Fixed React error #31 (object rendering)

3. **`frontend/src/pages/FacultyEdit.tsx`**
   - Fixed form fields populating with data
   - Fixed dateOfBirth field
   - Fixed JSON parsing for expertise and availability
   - Added proper form keys for re-rendering

4. **`frontend/src/api/faculty.api.ts`** (if modified)
   - Check if this file has any changes

5. **`frontend/src/utils/imageUtils.ts`**
   - Fixed image URL handling
   - Better URL cleaning for malformed paths

### Backend Files (Upload to: `/var/www/primeacademy_backend/src/`)

6. **`backend/src/controllers/faculty.controller.ts`**
   - Added `getFacultyProfile` function
   - Added JSON parsing for documents, expertise, availability

7. **`backend/src/routes/faculty.routes.ts`**
   - Added GET route: `/api/faculty/:userId`
   - Fixed route structure

8. **`backend/src/controllers/user.controller.ts`**
   - Added JSON parsing for faculty profile fields
   - Fixed faculty profile data retrieval

9. **`backend/src/index.ts`**
   - Verify faculty routes are registered: `app.use('/api/faculty', facultyRoutes);`

### Optional Files (If you want to include student deal amount fix)

10. **`backend/src/controllers/student.controller.ts`**
    - Fixed totalDealNum scope issue
    - Made totalDeal required

11. **`frontend/src/pages/StudentEnrollment.tsx`**
    - Added compulsory deal amount requirement

12. **`frontend/src/api/student.api.ts`**
    - Made totalDeal required in interface

---

## 📋 Upload Instructions

### Option 1: Upload Individual Files (Recommended)

**For Frontend:**
```bash
# On your local machine, copy files to VPS
scp frontend/src/pages/FacultyRegistration.tsx user@vps:/var/www/primeacademy_frontend/src/pages/
scp frontend/src/pages/FacultyManagement.tsx user@vps:/var/www/primeacademy_frontend/src/pages/
scp frontend/src/pages/FacultyEdit.tsx user@vps:/var/www/primeacademy_frontend/src/pages/
scp frontend/src/utils/imageUtils.ts user@vps:/var/www/primeacademy_frontend/src/utils/
```

**For Backend:**
```bash
scp backend/src/controllers/faculty.controller.ts user@vps:/var/www/primeacademy_backend/src/controllers/
scp backend/src/routes/faculty.routes.ts user@vps:/var/www/primeacademy_backend/src/routes/
scp backend/src/controllers/user.controller.ts user@vps:/var/www/primeacademy_backend/src/controllers/
scp backend/src/index.ts user@vps:/var/www/primeacademy_backend/src/
```

### Option 2: Build Frontend and Upload Dist

**On Local Machine:**
```bash
cd frontend
npm run build
# Upload entire dist folder to VPS
scp -r dist/* user@vps:/var/www/primeacademy_frontend/
```

**On VPS (Backend):**
```bash
cd /var/www/primeacademy_backend
# Upload files manually or use git pull
npm run build
pm2 restart backend-api
```

### Option 3: Use Git (Easiest)

**On VPS:**
```bash
# Backend
cd /var/www/primeacademy_backend
git pull origin main
npm run build
pm2 restart backend-api

# Frontend (if using git)
cd /var/www/primeacademy_frontend
git pull origin main
npm install
npm run build
# Restart nginx or frontend server
sudo systemctl reload nginx
```

---

## ✅ Verification Checklist

After uploading, verify:

- [ ] Faculty registration form works (all 7 steps)
- [ ] Date of Birth field saves and displays correctly
- [ ] Next button works on all steps
- [ ] Faculty view shows all details (not just basic)
- [ ] Faculty edit form populates all fields correctly
- [ ] Faculty edit saves changes successfully
- [ ] No console errors in browser
- [ ] No errors in backend logs

---

## 🔧 If Something Doesn't Work

1. **Check file paths match exactly**
2. **Verify file permissions on VPS**
3. **Clear browser cache**
4. **Check backend logs:** `pm2 logs backend-api`
5. **Check nginx logs:** `sudo tail -f /var/log/nginx/error.log`
6. **Rebuild frontend:** `cd frontend && npm run build`
7. **Restart services:** `pm2 restart backend-api && sudo systemctl reload nginx`

---

## 📝 File Priority (Upload in this order)

**Critical (Must Upload):**
1. `faculty.controller.ts` (Backend)
2. `faculty.routes.ts` (Backend)
3. `user.controller.ts` (Backend)
4. `FacultyRegistration.tsx` (Frontend)
5. `FacultyEdit.tsx` (Frontend)
6. `FacultyManagement.tsx` (Frontend)

**Important:**
7. `index.ts` (Backend - verify routes)
8. `imageUtils.ts` (Frontend)

**Optional:**
9. Student-related files (if you want deal amount requirement)

