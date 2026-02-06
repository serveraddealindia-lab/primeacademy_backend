# ⚡ Quick Photo Upload Test

## 🧪 Test in 30 Seconds

### 1. Open Browser DevTools
Press `F12`

### 2. Go to Console Tab
Clear console (click 🚫 icon)

### 3. Try Uploading a Photo
- Go to Faculty/Employee/Student Edit
- Click "Upload Photo"
- Select a small image file (< 1MB)

### 4. Check Console
**What do you see?**

#### ✅ If you see:
```
Photo uploaded successfully!
```
**Then upload worked!** Check if image displays.

#### ❌ If you see an error:
**Copy the error message** - that tells us what's wrong!

### 5. Check Network Tab
1. Click **Network** tab
2. Find request: `POST /api/upload` or `/upload`
3. Click on it
4. Check:
   - **Status:** Should be `200`
   - **Request Headers:** Should have `multipart/form-data`
   - **Response:** Should have `"status": "success"`

## 🔍 Common Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| `401 Unauthorized` | Token expired | Logout & login |
| `404 Not Found` | Wrong endpoint | Check API URL |
| `413 Payload Too Large` | File too big | Use smaller file |
| `Network Error` | Backend not running | Start backend |
| `Content-Type` error | Axios issue | Check axios.ts |

## ✅ Quick Fixes

### If "401 Unauthorized":
```javascript
// In console, check token
localStorage.getItem('token')
// If null or expired, logout and login
```

### If "404 Not Found":
```javascript
// Check what URL is being called
// Should be: http://localhost:3001/api/upload
// or: https://api.prashantthakar.com/api/upload
```

### If "Network Error":
```bash
# Check backend is running
# Local: Check backend terminal
# VPS: pm2 status
```

---

**Run this test and tell me what error you see!**

