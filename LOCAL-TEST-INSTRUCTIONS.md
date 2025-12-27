# 🧪 Local Testing Instructions - Photo Upload Fix

## ✅ Fix Applied

Two files have been updated:

1. **`frontend/src/api/axios.ts`** - Removes Content-Type for FormData
2. **`frontend/src/api/upload.api.ts`** - Removed explicit Content-Type header

## 🚀 Test Locally Now

### Step 1: Start Backend
```bash
# Open terminal 1
cd src  # or backend, depending on your structure
npm run dev
# Should start on http://localhost:3001
```

### Step 2: Start Frontend
```bash
# Open terminal 2
cd frontend
npm run dev
# Should start on http://localhost:5173 (or your port)
```

### Step 3: Test Photo Upload

1. **Open Browser:** `http://localhost:5173`
2. **Login** with your credentials
3. **Test Student Photo:**
   - Go to Student Enrollment or Student Edit
   - Click "Upload Photo"
   - Select an image (JPG/PNG)
   - **Expected:** ✅ Success message, preview shows

4. **Test Employee Photo:**
   - Go to Employee Registration or Employee Edit
   - Click "Upload Photo"
   - Select an image
   - **Expected:** ✅ Success message

5. **Test Faculty Photo:**
   - Go to Faculty Registration or Faculty Edit
   - Click "Upload Photo"
   - Select an image
   - **Expected:** ✅ Success message

## 🔍 Verify in Browser DevTools

### Open DevTools (F12)

#### Console Tab:
- Should see: "Photo uploaded successfully!"
- **NO red errors** ✅

#### Network Tab:
1. Click "Upload Photo"
2. Find request: `POST /api/upload`
3. Check:
   - **Status:** `200 OK` ✅
   - **Request Headers:**
     - `Content-Type`: `multipart/form-data; boundary=----WebKitFormBoundary...` ✅
     - Should **NOT** be `application/json` ❌
   - **Response:**
     ```json
     {
       "status": "success",
       "message": "1 file(s) uploaded successfully",
       "data": {
         "files": [...]
       }
     }
     ```

## ✅ Success Checklist

- [ ] Backend running (localhost:3001)
- [ ] Frontend running (localhost:5173)
- [ ] Logged in successfully
- [ ] Student photo upload works
- [ ] Employee photo upload works
- [ ] Faculty photo upload works
- [ ] No console errors
- [ ] Network request shows 200 OK
- [ ] Content-Type is `multipart/form-data; boundary=...`
- [ ] File appears in `src/uploads/general/` or `backend/uploads/general/`

## ❌ If Not Working

### Check 1: Verify Files
```bash
# Check axios.ts has the FormData check
grep -A 3 "FormData" frontend/src/api/axios.ts

# Check upload.api.ts doesn't set Content-Type
grep "Content-Type" frontend/src/api/upload.api.ts
# Should return nothing or only comments
```

### Check 2: Backend Logs
Look for:
```
File uploaded: [filename]
File saved to: [path]
Final URL: /uploads/general/...
```

### Check 3: Network Request
- Check if request is being sent
- Check response status code
- Check error message if any

## 📝 What to Look For

### ✅ Good Signs:
- Request succeeds (200 OK)
- Content-Type includes boundary
- Success message appears
- Image preview shows
- File saved to uploads folder

### ❌ Bad Signs:
- Request fails (400, 500, etc.)
- Content-Type is `application/json`
- Console errors
- "Failed to upload" message
- No file in uploads folder

---

**Once all tests pass locally, then commit and push to GitHub!**

