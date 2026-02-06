# 🔧 Production Document View & Download Fix

## ✅ Fixed Issues

### 1. **Production URL Construction** (`frontend/src/utils/imageUtils.ts`)
- **Problem**: Document URLs were not correctly constructed for production environment
- **Fix**: Updated `getImageUrl()` function to:
  - Detect production environment (when hostname is not `localhost`)
  - Use `getApiBaseUrl()` to get the correct API base URL (`https://api.prashantthakar.com/api`)
  - Remove `/api` to get base server URL (`https://api.prashantthakar.com`)
  - Construct full URLs like: `https://api.prashantthakar.com/uploads/general/filename.pdf`
  - Preserve filename during URL construction
  - Add filename recovery if filename is lost during processing

### 2. **Backend CORS Configuration** (`backend/src/index.ts`)
- **Status**: ✅ Already configured correctly
- CORS allows:
  - `https://crm.prashantthakar.com` (frontend)
  - `https://api.prashantthakar.com` (backend)
  - Static file serving allows all origins (`*`)

### 3. **Static File Serving** (`backend/src/index.ts`)
- **Status**: ✅ Already configured correctly
- Serves files from `/uploads` directory
- Sets proper CORS headers for all origins
- Sets correct Content-Type headers (PDF, images, etc.)

## 📋 Files Changed

1. **`frontend/src/utils/imageUtils.ts`**
   - Enhanced production URL construction
   - Added filename preservation and recovery
   - Improved error handling

## 🚀 Deployment Steps

### Frontend Deployment

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Upload the `dist` folder** to your VPS at the frontend location

3. **Ensure environment variable is set** (if using `.env`):
   ```env
   VITE_API_BASE_URL=https://api.prashantthakar.com/api
   ```

### Backend Deployment

1. **Upload the updated backend files:**
   - `backend/src/utils/imageUtils.ts` (if any backend changes)
   - `backend/src/index.ts` (already has correct CORS)

2. **Restart the backend service:**
   ```bash
   # If using PM2
   pm2 restart backend
   
   # Or if using systemd
   sudo systemctl restart backend
   ```

3. **Verify backend is running:**
   - Check: `https://api.prashantthakar.com/uploads/test`
   - Should return JSON with status: "Static file serving is working"

## 🧪 Testing in Production

### Test Document View:
1. Go to Faculty/Employee/Student Management
2. Click on any record to view details
3. Scroll to "Documents" section
4. Click "👁️ View" on any document
5. Document should open in new tab at: `https://api.prashantthakar.com/uploads/general/filename.pdf`

### Test Document Download:
1. Go to Faculty/Employee/Student Management
2. Click on any record to view details
3. Scroll to "Documents" section
4. Click "⬇️ Download" on any document
5. Document should download with correct filename

### Test Photo Display:
1. Go to Faculty/Employee/Student Management
2. Photos should display correctly
3. Click "Update Photo" and upload a new photo
4. Photo should display immediately after upload

## 🔍 Troubleshooting

### Issue: Documents not loading (404 error)
**Solution:**
- Check if files exist in `backend/uploads/general/` on VPS
- Verify backend is serving static files: `https://api.prashantthakar.com/uploads/test`
- Check backend logs for errors

### Issue: CORS error in browser console
**Solution:**
- Verify `FRONTEND_URL` environment variable includes `https://crm.prashantthakar.com`
- Check backend CORS configuration in `backend/src/index.ts`
- Restart backend after changes

### Issue: Documents load but download doesn't work
**Solution:**
- Check browser console for errors
- Verify `handleDownload` function in `StudentManagement.tsx` uses `getImageUrl()`
- Check if Authorization token is being sent (for protected files)

## 📝 Notes

- **Document URLs** are constructed as: `https://api.prashantthakar.com/uploads/general/filename.pdf`
- **Image URLs** are constructed as: `https://api.prashantthakar.com/uploads/general/filename.jpg`
- **All static files** are served directly from backend, not through `/api` route
- **CORS** is configured to allow requests from `https://crm.prashantthakar.com`

## ✅ Verification Checklist

- [ ] Frontend built and deployed
- [ ] Backend restarted
- [ ] Test document view works
- [ ] Test document download works
- [ ] Test photo display works
- [ ] Test photo upload works
- [ ] No CORS errors in browser console
- [ ] No 404 errors for documents

