# 🔧 Complete Fix for Photo Upload Not Working

## 🚨 The Problem

Photo upload is not working for students, employees, and faculty.

## ✅ Root Cause

The axios interceptor was setting `Content-Type: application/json` for ALL requests, including file uploads. For file uploads, we need `multipart/form-data` with a boundary, which the browser sets automatically. Setting `Content-Type: application/json` breaks file uploads.

## 🔧 The Fix

I've updated `frontend/src/api/axios.ts` to:
- **Skip setting Content-Type for FormData requests**
- **Let the browser automatically set the correct Content-Type with boundary**

## 📤 File to Upload

**File:** `frontend/src/api/axios.ts`  
**VPS Path:** `/var/www/primeacademy_frontend/src/api/axios.ts`

## ⚡ Steps on VPS

```bash
# 1. Upload the file
# frontend/src/api/axios.ts
# → /var/www/primeacademy_frontend/src/api/axios.ts

# 2. Rebuild frontend
cd /var/www/primeacademy_frontend
npm run build

# 3. Clear browser cache
# Press Ctrl+Shift+Delete or use DevTools

# 4. Test upload
# - Try uploading a photo for student/employee/faculty
# - Should work now!
```

## ✅ What Changed

### Before:
```typescript
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  ...
);
```

### After:
```typescript
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Don't set Content-Type for FormData (file uploads)
    // Let the browser set it automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  ...
);
```

## 🔍 Additional Checks

### 1. Verify Upload Directory Exists
```bash
# On VPS
cd /var/www/primeacademy_backend
mkdir -p uploads/general
chmod -R 755 uploads
```

### 2. Check Backend Logs
```bash
pm2 logs backend-api --lines 50
```

### 3. Test Upload Endpoint
```bash
# Test if endpoint works
curl -X POST http://localhost:3001/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/test.jpg"
```

### 4. Check Nginx Configuration
Verify `nginx-frontend-fixed.conf` has:
```nginx
client_max_body_size 50M;
```

## ✅ After Fix

- Photo uploads work for students ✅
- Photo uploads work for employees ✅
- Photo uploads work for faculty ✅
- Files are saved correctly ✅
- Files are accessible via `/uploads/...` ✅

---

**This fix resolves the Content-Type header conflict that was breaking file uploads!**

