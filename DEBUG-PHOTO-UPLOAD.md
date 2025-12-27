# 🔍 Debug Photo Upload - Image Not Displaying

## Issue
Photo upload shows "successfully" but image doesn't display (showing placeholder with "er.na").

## Quick Debug Steps

### 1. Check Browser Console
Open browser DevTools (F12) → Console tab, then:
- Upload a photo
- Look for console logs starting with "Faculty Management -" or "Local image URL constructed:"
- Check for any CORS errors or 404 errors

### 2. Check Backend Logs
In your backend terminal, look for:
- `=== UPLOAD DEBUG INFO ===`
- `File exists after save: true/false`
- `Final URL: /uploads/general/...`

### 3. Test Image URL Directly
After upload, copy the image URL from console logs and:
1. Open a new browser tab
2. Paste the URL (should be like `http://localhost:3001/uploads/general/filename.jpg`)
3. If image loads → URL is correct, issue is in React component
4. If 404 → Backend not serving files correctly
5. If CORS error → Backend CORS configuration issue

### 4. Check File Actually Exists
```powershell
# In PowerShell
cd backend
Get-ChildItem "uploads\general" -File | Select-Object -First 5 Name, Length, LastWriteTime
```

### 5. Common Issues & Fixes

#### Issue: URL is `/uploads/general/...` but should be `http://localhost:3001/uploads/general/...`
**Fix:** `getImageUrl()` should convert relative URLs to full URLs for local development.

#### Issue: CORS error in console
**Fix:** Backend CORS headers need to allow `localhost:5173` origin.

#### Issue: 404 Not Found
**Fix:** 
- Check file exists in `backend/uploads/general/`
- Check backend static file serving is configured correctly
- Check path in URL matches actual file path

#### Issue: Image loads in new tab but not in React component
**Fix:** 
- Check React component `key` prop is unique
- Check cache-busting parameter is added
- Check `onError` handler isn't hiding the image

## Expected Console Logs

After upload, you should see:
```
Faculty Management - Upload response: { ... }
Faculty Management - URL processing: { original: "/uploads/general/...", fullImageUrl: "http://localhost:3001/uploads/general/...", cacheBustedUrl: "http://localhost:3001/uploads/general/...?t=..." }
Local image URL constructed: { original: "/uploads/general/...", cleaned: "/uploads/general/...", relativePath: "/uploads/general/...", baseUrl: "http://localhost:3001", fullUrl: "http://localhost:3001/uploads/general/..." }
Faculty Management - Set imagePreview to: http://localhost:3001/uploads/general/...?t=...
```

## Test Direct Image Access

1. Upload a photo
2. Copy the `fullUrl` from console logs
3. Open in new tab: `http://localhost:3001/uploads/general/[filename]`
4. If it works → React component issue
5. If it doesn't → Backend serving issue

