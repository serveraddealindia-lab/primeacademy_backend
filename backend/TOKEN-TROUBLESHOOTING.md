# Token Troubleshooting Guide

## Common Token Issues

### Issue 1: Token Has Quotes
When you copy token from console, it might include quotes:
```
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Solution:** The test page now automatically removes quotes. But if still having issues:
1. Make sure you copy ONLY the token string
2. Don't copy the quotes
3. Or the test page will remove them automatically

### Issue 2: Token Has Extra Spaces
Sometimes token has spaces before/after:
```
 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... 
```

**Solution:** The test page now trims spaces automatically.

### Issue 3: Token Format Wrong
JWT token should have 3 parts separated by dots:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AcHJhc2hhbnR0aGFrYXIuY29tIn0.signature
```

**Check:** After setting token, it should show "Token length: ~200-500 characters"

### Issue 4: Token Expired
Tokens expire after 24 hours (default).

**Solution:** 
1. Logout from your application
2. Login again
3. Get fresh token
4. Set it in test page

### Issue 5: JWT Secret Mismatch
If backend was restarted with different JWT_SECRET, old tokens won't work.

**Solution:**
1. Make sure backend is using same JWT_SECRET
2. Get fresh token by logging in again

## How to Get Token Correctly

### Method 1: Console (Recommended)
1. In your application, press F12
2. Go to Console tab
3. Type: `localStorage.getItem('token')`
4. Press Enter
5. You'll see the token (might have quotes)
6. **Right-click on the token value** → Copy
7. Paste in test page

### Method 2: Application Tab
1. Press F12
2. Go to Application tab (or Storage)
3. Click Local Storage → `http://localhost:5173`
4. Find `token` row
5. **Double-click the value** to select and copy
6. Paste in test page

## Verify Token is Correct

After setting token, check:
1. Token length should be 200-500 characters
2. Token should have 3 parts when split by `.`
3. Should start with `eyJ` (base64 encoded JWT header)

## Test Token Manually

You can test if token works by opening this in browser:
```
http://localhost:3001/api/upload
```

With Authorization header (use browser extension or Postman):
```
Authorization: Bearer YOUR_TOKEN_HERE
```

Should return: `{"status":"success","message":"Upload endpoint is working",...}`

## Still Not Working?

1. **Check backend logs** when you try to upload
   - Should see error message about token
   - Might show: "Invalid or expired token" or "User not found"

2. **Verify JWT_SECRET** in backend `.env` file
   - Should match the secret used when token was created

3. **Check user exists** in database
   - Token might be valid but user was deleted

4. **Try different user** - Login with different account and get new token

