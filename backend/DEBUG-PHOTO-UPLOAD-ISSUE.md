# 🔍 Debug: Why Photo Upload Is Not Working

## 🚨 Step-by-Step Debugging

### Step 1: Check Browser Console (MOST IMPORTANT)

1. **Open DevTools:** Press `F12` or `Ctrl+Shift+I`
2. **Go to Console tab**
3. **Try uploading a photo**
4. **Look for errors** - What do you see?

**Common Errors:**
- ❌ `401 Unauthorized` → Authentication issue
- ❌ `404 Not Found` → Wrong API endpoint
- ❌ `413 Payload Too Large` → File too big
- ❌ `500 Internal Server Error` → Backend error
- ❌ `Network Error` → Backend not running or CORS issue
- ❌ `Content-Type` error → Axios interceptor issue

### Step 2: Check Network Tab

1. **Open DevTools** → **Network tab**
2. **Try uploading a photo**
3. **Find the request:** Look for `POST /api/upload` or `/upload`
4. **Click on it** and check:

**Request Headers:**
- ✅ `Authorization: Bearer YOUR_TOKEN` (should be present)
- ✅ `Content-Type: multipart/form-data; boundary=...` (should have boundary)
- ❌ `Content-Type: application/json` (WRONG - this breaks uploads)

**Response:**
- ✅ Status: `200 OK` → Upload successful
- ❌ Status: `400/401/500` → Check response body for error message

**Request Payload:**
- Should show `FormData` with file

### Step 3: Check Backend Logs

**On Local:**
```bash
# Check backend terminal for errors
# Look for:
# - "File uploaded: [filename]"
# - "File saved to: [path]"
# - Any error messages
```

**On VPS:**
```bash
pm2 logs backend-api --lines 50
# Look for upload-related errors
```

### Step 4: Verify Files Are Updated

**Check these files have the fixes:**

1. **`frontend/src/api/axios.ts`**
   - Should have: `if (config.data instanceof FormData) { delete config.headers['Content-Type']; }`

2. **`frontend/src/api/upload.api.ts`**
   - Should NOT set `Content-Type` header

3. **`frontend/src/pages/FacultyEdit.tsx`** (or EmployeeEdit/StudentEdit)
   - Should have cache-busting in image display

### Step 5: Test Upload Endpoint Directly

**In Browser Console (F12):**
```javascript
// Test if endpoint is accessible
fetch('http://localhost:3001/api/upload', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Upload endpoint is working",
  "endpoint": "POST /api/upload"
}
```

### Step 6: Check Upload Directory

**On Local:**
```bash
# Check if directory exists
ls -la src/uploads/general
# or
ls -la backend/uploads/general

# Check permissions
# Should be writable
```

**On VPS:**
```bash
cd /var/www/primeacademy_backend
ls -la uploads/general
# Should show uploaded files

# Check permissions
chmod -R 755 uploads
```

### Step 7: Verify Authentication

**In Browser Console:**
```javascript
// Check if token exists
console.log('Token:', localStorage.getItem('token'));

// Check if token is valid
// Try making any API call - if it fails with 401, token is expired
```

## 🔧 Common Issues & Fixes

### Issue 1: "401 Unauthorized"
**Cause:** Token expired or not sent
**Fix:** Logout and login again

### Issue 2: "404 Not Found"
**Cause:** Wrong endpoint URL
**Fix:** Check `frontend/src/api/upload.api.ts` - should call `/upload` (axios baseURL includes `/api`)

### Issue 3: "413 Payload Too Large"
**Cause:** File too big
**Fix:** 
- Backend limit: 10MB
- Nginx limit: 50MB
- Try smaller file (< 5MB)

### Issue 4: "Content-Type: application/json" in Request
**Cause:** Axios interceptor not removing Content-Type
**Fix:** Verify `frontend/src/api/axios.ts` has the FormData check

### Issue 5: Upload Success But Image Not Showing
**Cause:** Browser cache
**Fix:** Already fixed with cache-busting - verify files are updated

### Issue 6: "Network Error" or CORS Error
**Cause:** Backend not running or CORS misconfigured
**Fix:** 
- Check backend is running
- Check CORS settings in `src/index.ts`

### Issue 7: "No files uploaded"
**Cause:** Multer not receiving files
**Fix:** Check request is sending FormData correctly

## 📋 Quick Checklist

- [ ] Backend is running (localhost:3001 or VPS)
- [ ] Frontend is running (localhost:5173 or VPS)
- [ ] Logged in (token exists)
- [ ] Browser console shows no errors
- [ ] Network tab shows 200 OK response
- [ ] Request has `multipart/form-data` Content-Type
- [ ] Files are updated (axios.ts, upload.api.ts)
- [ ] Upload directory exists and is writable
- [ ] File size is under 10MB

## 🎯 Most Likely Issues

1. **Axios interceptor not updated** - Check `frontend/src/api/axios.ts`
2. **Backend not running** - Check backend terminal/VPS
3. **Token expired** - Logout and login again
4. **File too large** - Try smaller file
5. **Wrong endpoint** - Check network tab for actual URL called

## 📤 What to Share

If still not working, share:
1. **Browser Console errors** (screenshot or copy text)
2. **Network tab** - Request and Response (screenshot)
3. **Backend logs** (if available)
4. **Which page** you're trying to upload from (Faculty/Employee/Student)
5. **File size** you're trying to upload

---

**Start with Step 1 (Browser Console) - that will tell us exactly what's wrong!**

