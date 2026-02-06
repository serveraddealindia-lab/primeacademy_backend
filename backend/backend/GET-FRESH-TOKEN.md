# How to Get a Fresh Token

## The Problem:
Your token is expired or invalid. You need to get a fresh one.

## Solution:

### Step 1: Login Again
1. Open your application: `http://localhost:5173`
2. **Logout** (if you're logged in)
3. **Login again** with your credentials
4. This creates a fresh token

### Step 2: Get the New Token
1. While still on your application page, press **F12**
2. Go to **Console** tab
3. Type this exactly:
   ```javascript
   localStorage.getItem('token')
   ```
4. Press **Enter**
5. You'll see a long string - that's your new token
6. **Right-click** on it → **Copy**

### Step 3: Set Token in Test Page
1. Go back to your test page (`test-photo-upload.html`)
2. Find the input box: "Paste your token here"
3. **Paste** the token (Ctrl+V)
4. Click **"Set Token"**
5. You should see: ✅ Token saved!

### Step 4: Test Again
1. Click **"Check Token"** - should show ✅
2. Click **"Test Endpoint"** - should now work!
3. Try uploading a photo

## Why This Happens:
- Tokens expire after some time
- If you restarted backend, old tokens might not work
- Getting a fresh token by logging in again solves this

## Quick Check:
After setting the token, click "Check Token" - it should show:
✅ Token found!
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

If it shows this, your token is set correctly!

