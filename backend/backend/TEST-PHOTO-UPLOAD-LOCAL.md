# 🧪 Test Photo Upload Fix Locally

## ✅ Fix Applied

The fix has been applied to `frontend/src/api/axios.ts`:
- Removed `Content-Type: application/json` header for FormData requests
- Browser will now automatically set `multipart/form-data` with boundary

## 🧪 Local Testing Steps

### Step 1: Start Backend
```bash
cd backend  # or src if that's your backend directory
npm run dev
# Backend should be running on http://localhost:3001
```

### Step 2: Start Frontend
```bash
cd frontend
npm run dev
# Frontend should be running on http://localhost:5173 (or your port)
```

### Step 3: Test Photo Upload

#### Test 1: Student Photo Upload
1. Open browser: `http://localhost:5173`
2. Login to your account
3. Go to **Student Enrollment** or **Student Edit**
4. Find the "Upload Photo" section
5. Click "Choose File" or "Upload Photo"
6. Select an image file (JPG, PNG)
7. **Expected:** Photo uploads successfully, shows preview, no errors

#### Test 2: Employee Photo Upload
1. Go to **Employee Registration** or **Employee Edit**
2. Find the "Upload Photo" section
3. Click "Choose File"
4. Select an image file
5. **Expected:** Photo uploads successfully ✅

#### Test 3: Faculty Photo Upload
1. Go to **Faculty Registration** or **Faculty Edit**
2. Find the "Upload Photo" section
3. Click "Choose File"
4. Select an image file
5. **Expected:** Photo uploads successfully ✅

## 🔍 Debugging in Browser

### Open DevTools (F12)

#### Console Tab
- Look for any errors when uploading
- Should see: "Photo uploaded successfully!" message
- No red errors ✅

#### Network Tab
1. Click "Upload Photo"
2. Find the request to `/api/upload`
3. Check:
   - **Status:** Should be `200 OK` ✅
   - **Request Headers:** 
     - `Content-Type` should be `multipart/form-data; boundary=...` ✅
     - Should NOT be `application/json` ❌
   - **Response:** Should have `status: "success"` ✅

#### Example of Correct Request:
```
POST /api/upload
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
Authorization: Bearer YOUR_TOKEN
```

## ✅ Success Indicators

1. **No Console Errors** - No red errors in browser console
2. **200 Status** - Network request returns 200 OK
3. **Success Message** - Alert shows "Photo uploaded successfully!"
4. **Preview Shows** - Image preview appears after upload
5. **File Saved** - Check `backend/uploads/general/` folder for uploaded file

## ❌ If Still Not Working

### Check 1: Verify Fix is Applied
Open `frontend/src/api/axios.ts` and verify it has:
```typescript
// Don't set Content-Type for FormData (file uploads)
if (config.data instanceof FormData) {
  delete config.headers['Content-Type'];
}
```

### Check 2: Backend Logs
```bash
# In backend terminal, look for:
# "File uploaded: [filename]"
# "File saved to: [path]"
# "Final URL: /uploads/general/..."
```

### Check 3: Network Request Details
In DevTools → Network → Click on `/api/upload` request:
- **Payload tab:** Should show FormData with file
- **Headers tab:** Content-Type should be multipart/form-data

### Check 4: File Size
- Try a small image first (under 1MB)
- Backend limit: 10MB
- Nginx limit: 50MB (not relevant for local)

## 📝 Expected Behavior

### Before Fix:
- ❌ Request fails
- ❌ Console error about Content-Type
- ❌ "Failed to upload photo" alert

### After Fix:
- ✅ Request succeeds (200 OK)
- ✅ No console errors
- ✅ "Photo uploaded successfully!" alert
- ✅ Image preview appears
- ✅ File saved to `uploads/general/`

## 🎯 Test Checklist

- [ ] Backend running on localhost:3001
- [ ] Frontend running on localhost:5173
- [ ] Logged in with valid token
- [ ] Student photo upload works
- [ ] Employee photo upload works
- [ ] Faculty photo upload works
- [ ] No console errors
- [ ] Files appear in `backend/uploads/general/`
- [ ] Images display correctly after upload

---

**Once all tests pass locally, then upload to GitHub and deploy to VPS!**

