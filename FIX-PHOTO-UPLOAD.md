# 🔧 Fix Photo Upload Not Working

## 🚨 The Problem

Photo upload is not working for students, employees, and faculty. This could be due to:

1. **API endpoint mismatch** - Frontend calling wrong endpoint
2. **File size limits** - Nginx or backend rejecting large files
3. **CORS issues** - Cross-origin requests blocked
4. **Authentication issues** - Token not being sent
5. **Directory permissions** - Upload directory not writable
6. **Nginx configuration** - Missing proxy settings for uploads

## ✅ Quick Checks

### 1. Check Browser Console
Open DevTools (F12) → Console tab → Try uploading a photo → Check for errors

### 2. Check Network Tab
Open DevTools (F12) → Network tab → Try uploading → Check:
- Is the request being sent?
- What's the response status code?
- What's the error message?

### 3. Check Backend Logs
```bash
pm2 logs backend-api --lines 50
```

### 4. Check Upload Directory
```bash
# On VPS
ls -la /var/www/primeacademy_backend/uploads/general
# Check if directory exists and is writable
```

## 🔧 Common Fixes

### Fix 1: Verify API Endpoint

**Check:** `frontend/src/api/upload.api.ts` calls `/upload`
**Should be:** `/api/upload` (if axios baseURL doesn't include `/api`)

**File:** `frontend/src/api/upload.api.ts`

**Current:**
```typescript
const response = await api.post<UploadResponse>('/upload', formData, {
```

**If axios baseURL is `/api`, this is correct.**
**If axios baseURL is empty, change to:**
```typescript
const response = await api.post<UploadResponse>('/api/upload', formData, {
```

### Fix 2: Check Nginx File Size Limit

**File:** `nginx-frontend-fixed.conf`

**Current:** `client_max_body_size 50M;` ✅ (This is good)

**If missing, add:**
```nginx
client_max_body_size 50M;
```

### Fix 3: Check Backend File Size Limit

**File:** `src/controllers/upload.controller.ts`

**Current:** `fileSize: 10 * 1024 * 1024` (10 MB) ✅

### Fix 4: Check Upload Directory Permissions

```bash
# On VPS
cd /var/www/primeacademy_backend
mkdir -p uploads/general
chmod -R 755 uploads
chown -R www-data:www-data uploads  # Or your user:group
```

### Fix 5: Check CORS Configuration

**File:** `src/index.ts`

Verify CORS is configured to allow file uploads from frontend domain.

### Fix 6: Verify Route Registration

**File:** `src/index.ts`

Should have:
```typescript
app.use('/api/upload', uploadRoutes);
```

## 📤 Files to Check/Update

1. **`frontend/src/api/upload.api.ts`** - Verify endpoint path
2. **`src/controllers/upload.controller.ts`** - Verify upload logic
3. **`src/routes/upload.routes.ts`** - Verify route registration
4. **`src/index.ts`** - Verify route and static file serving
5. **`nginx-frontend-fixed.conf`** - Verify file size limit

## 🔍 Debugging Steps

### Step 1: Test Upload Endpoint Directly

```bash
# On VPS, test if endpoint is accessible
curl -X POST http://localhost:3001/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/test.jpg"
```

### Step 2: Check Backend Logs

```bash
pm2 logs backend-api --lines 100 | grep -i "upload\|error"
```

### Step 3: Check Nginx Logs

```bash
sudo tail -f /var/log/nginx/crm.prashantthakar.com.error.log
```

### Step 4: Test Static File Serving

```bash
# Create a test file
echo "test" > /var/www/primeacademy_backend/uploads/general/test.txt

# Test access
curl http://localhost:3001/uploads/general/test.txt
```

## ⚡ Most Common Issues

1. **Axios baseURL mismatch** - Check if `/api` is in baseURL
2. **File size too large** - Check Nginx and backend limits
3. **Directory permissions** - Upload directory not writable
4. **CORS blocking** - Frontend domain not allowed
5. **Authentication token** - Token expired or not sent

---

**Please check browser console and network tab first to see the exact error!**

