# Debug Upload Path Issue

## Problem:
- Upload returns success ✅
- File URL: `/uploads/general/1766769564638-2fd2289a-85db-414c-ac33-431722003c2a.png`
- But file doesn't exist at: `backend/uploads/general/1766769564638-2fd2289a-85db-414c-ac33-431722003c2a.png`

## What to Check:

### 1. Check Backend Logs
When you upload, look for these lines in backend console:
```
File uploaded: dgdg.png
File saved to: C:\Users\ADDEAL\Primeacademy\backend\uploads\general\1766769564638-2fd2289a-85db-414c-ac33-431722003c2a.png
Uploads root: C:\Users\ADDEAL\Primeacademy\backend\uploads
Relative path: general\1766769564638-2fd2289a-85db-414c-ac33-431722003c2a.png
Final URL: /uploads/general/1766769564638-2fd2289a-85db-414c-ac33-431722003c2a.png
```

And:
```
Serving uploads from: C:\Users\ADDEAL\Primeacademy\backend\uploads
Backend root (process.cwd()): C:\Users\ADDEAL\Primeacademy\backend
```

### 2. Verify Paths Match
- **File saved to:** Should be `C:\Users\ADDEAL\Primeacademy\backend\uploads\general\...`
- **Serving from:** Should be `C:\Users\ADDEAL\Primeacademy\backend\uploads`

If they don't match, that's the problem!

### 3. Check if File Actually Exists
After upload, check if file exists:
```powershell
Test-Path "C:\Users\ADDEAL\Primeacademy\backend\uploads\general\1766769564638-2fd2289a-85db-414c-ac33-431722003c2a.png"
```

### 4. Check File Permissions
Make sure the backend has write permissions to:
- `C:\Users\ADDEAL\Primeacademy\backend\uploads\general\`

## Most Likely Issues:

### Issue 1: process.cwd() is Wrong
If backend is running from a different directory, `process.cwd()` will be wrong.

**Solution:** 
- Make sure you run `npm run dev` from the `backend` folder
- Check backend logs for "Backend root (process.cwd()): ..."

### Issue 2: File Saved But Wrong Path
File might be saved to a different location than where static serving looks.

**Solution:**
- Check backend logs for "File saved to: ..."
- Check backend logs for "Serving uploads from: ..."
- They should match!

### Issue 3: File Not Actually Saved
Multer might fail silently.

**Solution:**
- Check backend console for any errors
- Check if `generalUploadDir` exists and is writable

## Quick Fix Test:

1. **Check backend logs** when uploading
2. **Note the "File saved to:" path**
3. **Check if that file actually exists** in File Explorer
4. **Compare with "Serving uploads from:" path**

If paths don't match, that's the issue!

