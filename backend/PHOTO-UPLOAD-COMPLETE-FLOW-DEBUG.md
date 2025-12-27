# Photo Upload Complete Flow & Debugging Guide

## Complete Code Flow Analysis

### 1. FRONTEND: User Selects File

**Location:** `frontend/src/pages/EmployeeManagement.tsx` (or Faculty/Student)
```typescript
// User clicks "Upload Photo" → File input onChange triggers
handleImageUpload(e: React.ChangeEvent<HTMLInputElement>)
```

**What happens:**
1. File is selected from input
2. FileReader creates data URL preview (immediate)
3. `uploadAPI.uploadFile(file)` is called

---

### 2. FRONTEND: API Call Setup

**Location:** `frontend/src/api/upload.api.ts`
```typescript
uploadFile: async (file: File) => {
  const formData = new FormData();
  formData.append('files', file);  // ← KEY: Field name is 'files'
  const response = await api.post('/upload', formData);
  return response.data;
}
```

**What happens:**
- Creates FormData
- Appends file with field name `'files'` (plural - important!)
- Calls `api.post('/upload', formData)`

---

### 3. FRONTEND: Axios Request Interceptor

**Location:** `frontend/src/api/axios.ts`
```typescript
api.interceptors.request.use((config) => {
  // Add auth token
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // CRITICAL: Remove Content-Type for FormData
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];  // ← Browser sets it with boundary
  }
  
  return config;
});
```

**What happens:**
- Adds Authorization header (Bearer token)
- **Removes Content-Type header** (browser will set `multipart/form-data` with boundary)
- Base URL: `http://localhost:3001/api` (local)
- Final URL: `http://localhost:3001/api/upload`

**Potential Issues:**
- ❌ No token → 401 Unauthorized
- ❌ Content-Type manually set → Upload fails (boundary missing)

---

### 4. BACKEND: Route Registration

**Location:** `backend/src/index.ts`
```typescript
app.use('/api/upload', uploadRoutes);  // Line 465
```

**What happens:**
- Routes `/api/upload` to `uploadRoutes`
- Must be registered AFTER static file serving

---

### 5. BACKEND: Upload Route Handler

**Location:** `backend/src/routes/upload.routes.ts`
```typescript
router.post(
  '/',
  verifyTokenMiddleware,  // ← Checks auth token
  (req, res, next) => {
    uploadMiddleware.array('files', 10)(req, res, (err) => {  // ← Field name 'files'
      if (err) {
        return res.status(400).json({ status: 'error', message: err.message });
      }
      return next();
    });
  },
  uploadFiles  // ← Controller function
);
```

**What happens:**
1. `verifyTokenMiddleware` checks Authorization header
2. `uploadMiddleware.array('files', 10)` processes FormData
   - Field name must be `'files'` (matches frontend)
   - Max 10 files
   - Validates file type and size
3. Calls `uploadFiles` controller

**Potential Issues:**
- ❌ Invalid/expired token → 401
- ❌ Field name mismatch → No files in req.files
- ❌ File type not allowed → 400 error
- ❌ File too large (>10MB) → 400 error

---

### 6. BACKEND: Multer Configuration

**Location:** `backend/src/controllers/upload.controller.ts`
```typescript
const backendRoot = process.cwd();  // Should be: C:\Users\ADDEAL\Primeacademy\backend
const uploadsRoot = path.join(backendRoot, 'uploads');
const generalUploadDir = path.join(uploadsRoot, 'general');
// Result: C:\Users\ADDEAL\Primeacademy\backend\uploads\general

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDirExists(generalUploadDir);
    cb(null, generalUploadDir);  // ← Saves to backend/uploads/general
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `${Date.now()}-${randomUUID()}${ext}`;
    cb(null, uniqueName);  // ← e.g., "1735123456789-abc123.jpg"
  },
});
```

**What happens:**
- File saved to: `backend/uploads/general/1735123456789-abc123.jpg`
- Directory created if doesn't exist

**Potential Issues:**
- ❌ `process.cwd()` is wrong directory → Files saved to wrong location
- ❌ No write permissions → Save fails
- ❌ Disk full → Save fails

---

### 7. BACKEND: Upload Controller

**Location:** `backend/src/controllers/upload.controller.ts`
```typescript
export const uploadFiles = async (req: AuthRequest, res: Response) => {
  // 1. Check authentication
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Authentication required' });
  }

  // 2. Check files exist
  const files = Array.isArray(req.files) ? req.files : req.files.files || [];
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ status: 'error', message: 'No files uploaded' });
  }

  // 3. Calculate URL path
  const uploadedFiles = files.map((file: Express.Multer.File) => {
    const normalizedFilepath = path.normalize(file.path);
    const normalizedUploadsRoot = path.normalize(uploadsRoot);
    
    // Get relative path: general/filename.jpg
    let relativePath = path.relative(normalizedUploadsRoot, normalizedFilepath);
    
    // Fallback if path calculation fails
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      const uploadsIndex = normalizedFilepath.toLowerCase().indexOf('uploads');
      if (uploadsIndex !== -1) {
        relativePath = normalizedFilepath.substring(uploadsIndex + 'uploads'.length);
        relativePath = relativePath.replace(/^[\\/]+/, '');
      } else {
        relativePath = path.join('general', path.basename(normalizedFilepath));
      }
    }
    
    // Convert to URL: /uploads/general/filename.jpg
    const urlPath = relativePath.replace(/\\/g, '/');
    const url = `/uploads/${urlPath}`;
    
    return {
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: url,  // ← Returns: /uploads/general/1735123456789-abc123.jpg
      path: file.path,
    };
  });

  // 4. Return response
  res.status(200).json({
    status: 'success',
    message: `${uploadedFiles.length} file(s) uploaded successfully`,
    data: {
      files: uploadedFiles,
      urls: urls,
      count: uploadedFiles.length,
    },
  });
};
```

**What happens:**
1. Validates authentication
2. Extracts files from `req.files`
3. Calculates relative path from `uploadsRoot` to file
4. Constructs URL: `/uploads/general/filename.jpg`
5. Returns JSON response

**Potential Issues:**
- ❌ Path calculation fails → Wrong URL returned
- ❌ File saved but URL wrong → Image won't display

---

### 8. BACKEND: Static File Serving

**Location:** `backend/src/index.ts`
```typescript
const backendRoot = process.cwd();  // Should be: C:\Users\ADDEAL\Primeacademy\backend
let uploadsStaticPath = path.join(backendRoot, 'uploads');
// Result: C:\Users\ADDEAL\Primeacademy\backend\uploads

// Serve files at /uploads route
app.use('/uploads', express.static(uploadsStaticPath, {
  setHeaders: (res, filePath) => {
    // Set Content-Type based on file extension
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
    // ... other types
  },
}));
```

**What happens:**
- Serves files from `backend/uploads` directory
- URL `/uploads/general/filename.jpg` → Serves `backend/uploads/general/filename.jpg`
- Sets proper Content-Type headers

**Potential Issues:**
- ❌ `process.cwd()` is wrong → Can't find files
- ❌ Route registered after auth middleware → 401 errors
- ❌ CORS not configured → Browser blocks request

---

### 9. FRONTEND: Response Handling

**Location:** `frontend/src/hooks/usePhotoUpload.ts`
```typescript
const uploadResponse = await uploadAPI.uploadFile(file);
// Response: { status: 'success', data: { files: [{ url: '/uploads/general/...' }] } }

const uploadedFile = uploadResponse.data.files[0];
const photoData = {
  name: uploadedFile.originalName,
  url: uploadedFile.url,  // ← /uploads/general/filename.jpg
  size: uploadedFile.size,
};

return photoData;
```

**What happens:**
- Receives response with URL
- Extracts file data
- Returns photo data with relative URL

---

### 10. FRONTEND: URL Construction for Display

**Location:** `frontend/src/utils/imageUtils.ts`
```typescript
export const getImageUrl = (imageUrl: string) => {
  // Input: /uploads/general/filename.jpg
  
  // For local development:
  if (window.location.hostname === 'localhost') {
    const apiBase = 'http://localhost:3001/api';
    let baseUrl = apiBase.replace('/api', '');  // → http://localhost:3001
    const relativePath = '/uploads/general/filename.jpg';
    return `${baseUrl}${relativePath}`;
    // Result: http://localhost:3001/uploads/general/filename.jpg
  }
};
```

**What happens:**
- Takes relative URL: `/uploads/general/filename.jpg`
- Constructs full URL: `http://localhost:3001/uploads/general/filename.jpg`
- Returns full URL for `<img src>`

**Potential Issues:**
- ❌ URL construction wrong → 404 when loading image
- ❌ Adds `/api` to path → Wrong URL

---

## Common Issues & Solutions

### Issue 1: Upload Returns 401 Unauthorized

**Symptoms:**
- Console: `401 Unauthorized`
- Network tab: POST `/api/upload` → 401

**Causes:**
- No token in localStorage
- Token expired
- Token not sent in request

**Debug:**
```javascript
// In browser console:
console.log('Token:', localStorage.getItem('token'));
```

**Solution:**
- Login again to get new token
- Check `verifyTokenMiddleware` is working

---

### Issue 2: Upload Returns 400 Bad Request

**Symptoms:**
- Console: `400 Bad Request`
- Error message: "No files uploaded" or "File type not allowed"

**Causes:**
- Field name mismatch (frontend sends `'files'`, backend expects `'files'`)
- File type not in allowed list
- File too large (>10MB)

**Debug:**
```javascript
// Check FormData in Network tab → Payload
// Should see: files: [File object]
```

**Solution:**
- Verify field name is `'files'` (plural)
- Check file type is image/jpeg, image/png, etc.
- Check file size < 10MB

---

### Issue 3: Upload Succeeds But Image Doesn't Display

**Symptoms:**
- Upload returns 200 success
- Image URL returned: `/uploads/general/filename.jpg`
- But image shows broken/404

**Causes:**
- File saved to wrong location
- Static file serving path wrong
- URL construction wrong

**Debug Steps:**

1. **Check backend logs:**
   ```
   File uploaded: test.jpg
   File saved to: C:\Users\ADDEAL\Primeacademy\backend\uploads\general\1735123456789-abc123.jpg
   Uploads root: C:\Users\ADDEAL\Primeacademy\backend\uploads
   Relative path: general\1735123456789-abc123.jpg
   URL path: general/1735123456789-abc123.jpg
   Final URL: /uploads/general/1735123456789-abc123.jpg
   ```

2. **Check file exists:**
   ```powershell
   # In backend directory
   Test-Path "uploads\general\1735123456789-abc123.jpg"
   # Should return: True
   ```

3. **Check static serving:**
   ```
   # Visit in browser:
   http://localhost:3001/uploads/test
   # Should return JSON with uploadsPath
   ```

4. **Check image URL:**
   ```
   # Visit in browser:
   http://localhost:3001/uploads/general/1735123456789-abc123.jpg
   # Should display image
   ```

5. **Check frontend URL construction:**
   ```javascript
   // In browser console after upload:
   console.log('Image URL:', getImageUrl('/uploads/general/filename.jpg'));
   // Should return: http://localhost:3001/uploads/general/filename.jpg
   ```

**Solution:**
- Verify `process.cwd()` returns correct backend directory
- Verify file is saved to `backend/uploads/general/`
- Verify static serving path matches save path
- Verify URL construction removes `/api` from base URL

---

### Issue 4: Path Calculation Fails

**Symptoms:**
- File saved successfully
- But URL returned is wrong (e.g., `../general/filename.jpg`)

**Causes:**
- `path.relative()` fails on Windows
- Different drive letters
- Path normalization issues

**Debug:**
```typescript
// Check in upload.controller.ts logs:
logger.info(`File path: ${file.path}`);
logger.info(`Uploads root: ${uploadsRoot}`);
logger.info(`Relative path: ${relativePath}`);
```

**Solution:**
- Fallback logic should handle this
- Check logs to see which path calculation method is used

---

## Step-by-Step Debugging Checklist

### ✅ Step 1: Verify Backend is Running
```powershell
# Check backend is running on port 3001
netstat -ano | findstr :3001
```

### ✅ Step 2: Verify Uploads Directory Exists
```powershell
cd backend
Test-Path "uploads\general"
# Should return: True
```

### ✅ Step 3: Test Upload Endpoint
```powershell
# In browser console or Postman:
# GET http://localhost:3001/api/upload
# Should return: { status: 'success', message: 'Upload endpoint is working' }
```

### ✅ Step 4: Test Static File Serving
```powershell
# In browser:
# GET http://localhost:3001/uploads/test
# Should return JSON with uploadsPath
```

### ✅ Step 5: Check Backend Logs
```powershell
# When uploading, check backend console for:
# - "Serving uploads from: ..."
# - "File uploaded: ..."
# - "File saved to: ..."
# - "Final URL: ..."
```

### ✅ Step 6: Check Browser Console
```javascript
// Should see:
// "Starting photo upload: { name: '...', type: 'image/jpeg', size: ... }"
// "Upload response received: { status: 'success', ... }"
// "Uploaded file data: { url: '/uploads/general/...', ... }"
// "Photo upload successful: { url: '/uploads/general/...' }"
```

### ✅ Step 7: Check Network Tab
1. Open DevTools → Network tab
2. Upload photo
3. Look for:
   - **POST `/api/upload`** → Should be 200
   - **GET `/uploads/general/...`** → Should be 200 (image)

### ✅ Step 8: Verify Image URL
```javascript
// In browser console:
const url = '/uploads/general/filename.jpg';
const fullUrl = getImageUrl(url);
console.log('Full URL:', fullUrl);
// Should be: http://localhost:3001/uploads/general/filename.jpg

// Test in browser:
// Visit: http://localhost:3001/uploads/general/filename.jpg
// Should display image
```

---

## Expected File Paths (Local)

### Backend Directory Structure:
```
C:\Users\ADDEAL\Primeacademy\backend\
├── src\
│   ├── controllers\
│   │   └── upload.controller.ts  (saves files)
│   ├── routes\
│   │   └── upload.routes.ts
│   └── index.ts  (serves files)
└── uploads\
    └── general\
        └── 1735123456789-abc123.jpg  (uploaded files)
```

### process.cwd() Should Return:
```
C:\Users\ADDEAL\Primeacademy\backend
```

### File Save Path:
```
C:\Users\ADDEAL\Primeacademy\backend\uploads\general\1735123456789-abc123.jpg
```

### Static Serving Path:
```
C:\Users\ADDEAL\Primeacademy\backend\uploads
```

### URL Paths:
- Upload endpoint: `http://localhost:3001/api/upload`
- Static files: `http://localhost:3001/uploads/general/filename.jpg`
- Image display: `http://localhost:3001/uploads/general/filename.jpg`

---

## Quick Test Script

Run this in browser console after uploading:

```javascript
// Test 1: Check token
console.log('Token exists:', !!localStorage.getItem('token'));

// Test 2: Test upload endpoint
fetch('http://localhost:3001/api/upload', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(console.log);

// Test 3: Test static serving
fetch('http://localhost:3001/uploads/test')
.then(r => r.json())
.then(console.log);

// Test 4: Test image URL construction
const testUrl = '/uploads/general/test.jpg';
const fullUrl = getImageUrl(testUrl);
console.log('Image URL:', fullUrl);
// Should be: http://localhost:3001/uploads/general/test.jpg
```

---

## Most Likely Issues

Based on the code flow, the most common issues are:

1. **process.cwd() returns wrong directory**
   - Solution: Check backend logs for "Backend root (process.cwd()): ..."
   - Should be: `C:\Users\ADDEAL\Primeacademy\backend`

2. **File saved but URL wrong**
   - Solution: Check logs for "Final URL: ..."
   - Should be: `/uploads/general/filename.jpg`

3. **Static serving path doesn't match save path**
   - Solution: Check logs for "Serving uploads from: ..."
   - Should match where files are saved

4. **URL construction adds /api**
   - Solution: Check `getImageUrl()` removes `/api` from base URL
   - Should construct: `http://localhost:3001/uploads/...` (not `http://localhost:3001/api/uploads/...`)

