# ✅ Complete Photo Upload Fix - Ready to Deploy

## 🎯 Summary

Fixed the photo upload issue for students, employees, and faculty. The problem was the axios interceptor setting `Content-Type: application/json` for all requests, which broke file uploads.

## 📤 Files to Upload

### Frontend (1 file)

**1. `frontend/src/api/axios.ts`**
   - **Local Path:** `frontend/src/api/axios.ts`
   - **VPS Path:** `/var/www/primeacademy_frontend/src/api/axios.ts`
   - **What it fixes:** Removes Content-Type header for FormData requests, allowing browser to set correct multipart/form-data with boundary

## ⚡ Quick Deploy Steps

### On VPS:

```bash
# 1. Upload the file
# Use WinSCP, SCP, or direct edit:
# frontend/src/api/axios.ts → /var/www/primeacademy_frontend/src/api/axios.ts

# 2. Rebuild frontend
cd /var/www/primeacademy_frontend
npm run build

# 3. Reload nginx (if needed)
sudo systemctl reload nginx

# 4. Clear browser cache
# Press Ctrl+Shift+Delete or use DevTools → Application → Clear Storage
```

## ✅ Verification

After deploying, test:

1. **Student Photo Upload**
   - Go to Student Enrollment or Student Edit
   - Click "Upload Photo"
   - Select an image file
   - Should upload successfully ✅

2. **Employee Photo Upload**
   - Go to Employee Registration or Employee Edit
   - Click "Upload Photo"
   - Select an image file
   - Should upload successfully ✅

3. **Faculty Photo Upload**
   - Go to Faculty Registration or Faculty Edit
   - Click "Upload Photo"
   - Select an image file
   - Should upload successfully ✅

## 🔍 If Still Not Working

### Check 1: Browser Console
```javascript
// Open DevTools (F12) → Console
// Look for errors when uploading
```

### Check 2: Network Tab
```javascript
// Open DevTools (F12) → Network
// Try uploading → Check the request:
// - Status code should be 200
// - Content-Type should be "multipart/form-data; boundary=..."
```

### Check 3: Backend Logs
```bash
pm2 logs backend-api --lines 50
# Look for upload-related errors
```

### Check 4: Upload Directory
```bash
# On VPS
ls -la /var/www/primeacademy_backend/uploads/general
# Should show uploaded files
```

### Check 5: File Permissions
```bash
# On VPS
cd /var/www/primeacademy_backend
chmod -R 755 uploads
# Make sure directory is writable
```

## 📝 What Was Fixed

### Before:
```typescript
// axios interceptor set Content-Type: application/json for ALL requests
// This broke file uploads which need multipart/form-data
```

### After:
```typescript
// axios interceptor now skips Content-Type for FormData
// Browser automatically sets: multipart/form-data; boundary=...
// File uploads work correctly ✅
```

## 🎉 Expected Result

After deploying this fix:
- ✅ Photo uploads work for students
- ✅ Photo uploads work for employees  
- ✅ Photo uploads work for faculty
- ✅ Files are saved to `/uploads/general/`
- ✅ Files are accessible via `/uploads/...` URLs
- ✅ No more "Failed to upload" errors

---

**This is the complete fix. Upload the file and rebuild frontend!**

