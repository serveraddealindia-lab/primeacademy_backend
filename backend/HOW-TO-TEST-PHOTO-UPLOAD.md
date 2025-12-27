# How to Test Photo Upload - Simple Guide

## Easy Way: Use the Test Page

### Step 1: Open the Test Page
1. Make sure your backend is running on `http://localhost:3001`
2. Open your application in browser and **login first** (this saves your token)
3. Open a new tab and go to: `file:///C:/Users/ADDEAL/Primeacademy/test-photo-upload.html`
   - Or just double-click the file `test-photo-upload.html` in your file explorer

### Step 2: Run the Tests
The page has 6 tests. Click each button one by one:

1. **Check Token** - Should show ✅ if you're logged in
2. **Test Endpoint** - Should show ✅ if backend is running
3. **Test Static Serving** - Should show ✅ if file serving works
4. **Test URL Construction** - Should show ✅ if URLs are correct
5. **Upload Photo** - Select a file and click "Upload Photo"
6. **Test Image Display** - Enter the URL and test if image shows

### Step 3: Check Results
- ✅ Green = Working
- ❌ Red = Not working (shows what's wrong)
- ⏳ Blue = In progress

---

## What Each Test Checks

### Test 1: Authentication Token
- Checks if you have a login token
- **If fails:** Login to your application first

### Test 2: Upload Endpoint
- Checks if backend is running
- Checks if `/api/upload` endpoint is accessible
- **If fails:** Start your backend server

### Test 3: Static File Serving
- Checks if files can be served from `/uploads`
- Shows where files are stored
- **If fails:** Check backend logs

### Test 4: URL Construction
- Checks if URLs are built correctly
- Should NOT contain `/api` in the path
- **If wrong:** URL construction code needs fixing

### Test 5: Upload Photo
- Actually uploads a file
- Shows the URL returned
- Shows image preview
- **If fails:** Check the error message

### Test 6: Test Image Display
- Tests if an image URL actually works
- Shows the image if it loads
- **If fails:** File might not exist or URL is wrong

---

## What to Look For

### ✅ Good Results:
- All tests show ✅ (green)
- Upload shows: "Upload successful!"
- Image preview shows your photo
- URL looks like: `http://localhost:3001/uploads/general/filename.jpg`

### ❌ Bad Results:
- Any test shows ❌ (red)
- Upload shows error message
- Image preview is broken/blank
- URL contains `/api` like: `http://localhost:3001/api/uploads/...`

---

## Common Issues & Quick Fixes

### Issue: "No token found"
**Fix:** 
1. Open your application
2. Login
3. Come back to test page
4. Click "Check Token" again

### Issue: "Cannot connect to backend"
**Fix:**
1. Make sure backend is running
2. Check terminal/console where backend is running
3. Should see: "Server running on port 3001"

### Issue: "Upload failed - 401 Unauthorized"
**Fix:**
1. Login again to get fresh token
2. Or check if token expired

### Issue: "Upload successful but image doesn't show"
**Fix:**
1. Check backend logs for "File saved to: ..."
2. Check if file exists at that path
3. Check if URL is correct (should NOT have `/api`)

### Issue: "Static file serving error"
**Fix:**
1. Check backend logs for "Serving uploads from: ..."
2. Make sure that directory exists
3. Check if `backend/uploads/general` folder exists

---

## Manual Check (If Test Page Doesn't Work)

### Check 1: Is Backend Running?
Open browser and go to: `http://localhost:3001/uploads/test`
- Should see JSON with uploads path
- If error: Backend is not running

### Check 2: Can You Access Upload Endpoint?
1. Login to your application
2. Open browser DevTools (F12)
3. Go to Network tab
4. Try uploading a photo
5. Look for: `POST /api/upload`
   - Should be 200 (green)
   - If 401: Not logged in
   - If 404: Endpoint not found

### Check 3: Does File Get Saved?
1. After upload, check backend console
2. Should see: "File saved to: ..."
3. Go to that path in file explorer
4. File should be there

### Check 4: Can You View the Image?
1. Copy the URL from upload response
2. Should be like: `/uploads/general/filename.jpg`
3. Open in browser: `http://localhost:3001/uploads/general/filename.jpg`
4. Should see the image
5. If 404: File not found or path wrong

---

## Still Not Working?

1. **Check Backend Logs:**
   - Look for errors in backend console
   - Check for "Serving uploads from: ..."
   - Check for "File saved to: ..."

2. **Check File Exists:**
   - Go to: `C:\Users\ADDEAL\Primeacademy\backend\uploads\general\`
   - Should see uploaded files there

3. **Check URL:**
   - URL should be: `http://localhost:3001/uploads/general/filename.jpg`
   - Should NOT be: `http://localhost:3001/api/uploads/...`

4. **Check Browser Console:**
   - Press F12
   - Go to Console tab
   - Look for any red errors

---

## Need More Help?

Share these details:
1. Screenshot of test page results
2. Backend console logs (when uploading)
3. Browser console errors (F12 → Console)
4. Network tab screenshot (F12 → Network → Upload request)

