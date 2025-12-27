# Photo Upload Local Testing Guide

## Steps to Test Photo Upload Locally

### 1. Backend Setup
1. Make sure backend is running on `http://localhost:3001`
2. Check that `backend/uploads/general` directory exists
3. Backend should serve static files from `/uploads` route

### 2. Frontend Setup
1. Make sure frontend is running on `http://localhost:5173` (or your dev port)
2. Check browser console for any errors

### 3. Test Photo Upload

#### Step 1: Open Browser Console
- Press F12 to open DevTools
- Go to Console tab
- Go to Network tab

#### Step 2: Upload a Photo
1. Navigate to Faculty/Employee/Student Edit page
2. Click "Upload Photo" button
3. Select an image file (JPG, PNG, WEBP, or GIF)
4. Watch the console logs

#### Step 3: Check Console Logs
You should see:
```
Photo upload initiated: { fileName: "...", fileType: "image/jpeg", fileSize: ... }
Starting photo upload: { name: "...", type: "image/jpeg", size: ... }
Upload response received: { status: "success", data: { files: [...] } }
Uploaded file data: { url: "/uploads/general/...", ... }
Photo upload successful: { url: "/uploads/general/..." }
Photo uploaded successfully, updating state: { url: "/uploads/general/..." }
Updating avatarUrl in database: /uploads/general/...
AvatarUrl updated successfully
```

#### Step 4: Check Network Tab
1. Look for POST request to `/api/upload`
   - Should return 200 status
   - Response should have: `{ status: "success", data: { files: [{ url: "/uploads/general/..." }] } }`

2. Look for GET request to `/uploads/general/...`
   - Should return 200 status
   - Response should be the image file
   - If 404, static file serving is not working

### 4. Common Issues and Fixes

#### Issue: Upload returns 401 (Unauthorized)
**Fix:** Make sure you're logged in and token is valid

#### Issue: Upload returns 400 (Bad Request)
**Fix:** Check file type and size (must be image, < 10MB)

#### Issue: Image shows 404
**Fix:** 
- Check backend logs for "Serving uploads from: ..."
- Verify file exists in `backend/uploads/general/`
- Check backend static file serving configuration

#### Issue: Image URL is wrong
**Fix:**
- Check console for the constructed URL
- Should be: `http://localhost:3001/uploads/general/filename.jpg`
- If it has `/api` in it, that's the problem

### 5. Expected Behavior

**After successful upload:**
- Photo should appear in the preview
- Photo URL should be stored in database
- Photo should be accessible at: `http://localhost:3001/uploads/general/filename.jpg`
- Image should display correctly in the form

### 6. Debugging Commands

**Check if uploads directory exists:**
```powershell
cd backend
Test-Path "uploads\general"
```

**List files in uploads directory:**
```powershell
Get-ChildItem "uploads\general"
```

**Check backend logs:**
- Look for: "Serving uploads from: ..."
- Look for: "File uploaded: ..."
- Look for: "Final URL: ..."

