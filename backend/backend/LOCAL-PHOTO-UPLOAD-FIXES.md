# Photo Upload Local Fixes - DO NOT UPLOAD TO GITHUB YET

## Files Modified for Local Testing

### 1. Frontend Files

#### `frontend/src/utils/imageUtils.ts`
- **Fixed:** Simplified `getApiBaseUrl()` to always return `http://localhost:3001/api` for local development
- **Fixed:** Simplified URL construction for local development (lines 285-296)
- **Result:** For local, URLs will be: `http://localhost:3001/uploads/general/filename.jpg`

#### `frontend/src/hooks/usePhotoUpload.ts`
- **Already has:** Comprehensive logging for debugging
- **Status:** Ready for testing

#### `frontend/src/pages/FacultyEdit.tsx`
- **Already has:** Photo upload handler with logging
- **Status:** Ready for testing

#### `frontend/src/pages/EmployeeEdit.tsx`
- **Already has:** Photo upload handler with logging
- **Status:** Ready for testing

#### `frontend/src/pages/StudentEdit.tsx`
- **Already has:** Photo upload handler with logging
- **Status:** Ready for testing

### 2. Backend Files

#### `backend/src/controllers/upload.controller.ts`
- **Fixed:** Uses `process.cwd()` to find `backend/uploads` directory
- **Fixed:** Better path calculation for Windows/Unix compatibility
- **Result:** Files saved to: `backend/uploads/general/filename.jpg`

#### `backend/src/index.ts`
- **Fixed:** Static file serving uses `process.cwd()` to find uploads directory
- **Result:** Files served from: `backend/uploads` via `/uploads` route

## Local Testing Steps

### Step 1: Ensure Backend is Running
```powershell
cd backend
npm run dev
# Should see: "Serving uploads from: C:\Users\ADDEAL\Primeacademy\backend\uploads"
```

### Step 2: Ensure Frontend is Running
```powershell
cd frontend
npm run dev
# Should run on http://localhost:5173
```

### Step 3: Test Photo Upload
1. Open browser to `http://localhost:5173`
2. Login to the system
3. Navigate to Faculty/Employee/Student Edit page
4. Open Browser DevTools (F12)
5. Go to Console tab
6. Click "Upload Photo"
7. Select an image file

### Step 4: Check Console Logs
You should see:
```
Photo upload initiated: { fileName: "...", fileType: "image/jpeg", fileSize: ... }
Starting photo upload: { name: "...", type: "image/jpeg", size: ... }
Upload response received: { status: "success", ... }
Uploaded file data: { url: "/uploads/general/...", ... }
Photo upload successful: { url: "/uploads/general/..." }
```

### Step 5: Check Network Tab
1. Look for POST `/api/upload` - should return 200
2. Look for GET `/uploads/general/...` - should return 200 with image

### Step 6: Verify Image Displays
- Photo should appear in the preview
- Image URL should be: `http://localhost:3001/uploads/general/filename.jpg`

## Expected File Locations

**Backend uploads directory:**
- `C:\Users\ADDEAL\Primeacademy\backend\uploads\general\`

**Backend should log:**
- `Serving uploads from: C:\Users\ADDEAL\Primeacademy\backend\uploads`
- `File uploaded: [filename]`
- `File saved to: [full path]`
- `Final URL: /uploads/general/[filename]`

## Common Issues

### Issue: Upload returns 401
**Solution:** Make sure you're logged in

### Issue: Upload returns 400
**Solution:** Check file type (must be image) and size (< 10MB)

### Issue: Image shows 404
**Solution:** 
- Check backend logs for "Serving uploads from: ..."
- Verify file exists in `backend/uploads/general/`
- Check that backend is serving `/uploads` route

### Issue: Image URL is wrong
**Solution:**
- Check console for constructed URL
- Should be: `http://localhost:3001/uploads/general/filename.jpg`
- If it has `/api` in path, that's wrong

## Files Changed (DO NOT COMMIT YET)

1. `frontend/src/utils/imageUtils.ts` - Simplified local URL construction
2. `backend/src/controllers/upload.controller.ts` - Fixed path calculation
3. `backend/src/index.ts` - Fixed static file serving path

## Next Steps After Local Testing

1. Test photo upload in Faculty Edit
2. Test photo upload in Employee Edit
3. Test photo upload in Student Edit
4. Verify images display correctly
5. Check browser console for any errors
6. Check network tab for successful requests

**ONLY AFTER LOCAL TESTING IS SUCCESSFUL:**
- Then we can commit and push to GitHub
- Then we can deploy to VPS

