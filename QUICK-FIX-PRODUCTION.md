# Quick Fix for Production Data Loading Issues

## If data is still blank after uploading code, follow these steps:

### Step 1: Verify Backend Code is Updated

```bash
# SSH into VPS
cd /var/www/primeacademy_backend

# Pull latest code
git pull origin main

# Verify the fix is in the code
grep -n "Parse documents if it's a string" src/controllers/user.controller.ts
# Should show line numbers (around line 422, 459)

# If not found, the code wasn't updated properly
```

### Step 2: Rebuild and Restart Backend

```bash
cd /var/www/primeacademy_backend

# Rebuild TypeScript
npm run build

# Restart backend (choose one method)
# Method 1: PM2
pm2 restart backend-api
pm2 logs backend-api --lines 30

# Method 2: Systemd
sudo systemctl restart primeacademy-backend
sudo journalctl -u primeacademy-backend -n 30
```

### Step 3: Rebuild Frontend

```bash
cd /var/www/Primeacademy/frontend

# Pull latest code
git pull origin main

# Rebuild
npm run build

# Deploy
sudo cp -r dist/* /var/www/crm.prashantthakar.com/

# Clear nginx cache (if any)
sudo systemctl reload nginx
```

### Step 4: Clear Browser Cache

1. Open browser DevTools (F12)
2. Right-click on refresh button
3. Select "Empty Cache and Hard Reload"
4. Or use: Ctrl+Shift+Delete to clear cache

### Step 5: Test API Directly

```bash
# Get a faculty/employee user ID from database
# Get your JWT token from browser (Network tab > Request Headers)

# Test the API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.prashantthakar.com/api/users/USER_ID \
  | jq '.data.user.facultyProfile.documents'

# If output shows a string like "{\"personalInfo\":...}" 
#   → Backend parsing is NOT working
# If output shows an object {...}
#   → Backend parsing IS working
```

### Step 6: Check Backend Logs

```bash
# Watch logs in real-time
pm2 logs backend-api

# Look for:
# - "Failed to parse documents JSON" → Parsing is failing
# - "Fetching user X with includes" → Query is running
# - Any errors about JSON parsing
```

## Common Issues and Solutions

### Issue: Backend shows old code
**Solution:**
```bash
cd /var/www/primeacademy_backend
git fetch origin
git reset --hard origin/main
npm run build
pm2 restart backend-api
```

### Issue: Frontend shows old code
**Solution:**
```bash
cd /var/www/Primeacademy/frontend
git fetch origin
git reset --hard origin/main
npm run build
sudo rm -rf /var/www/crm.prashantthakar.com/*
sudo cp -r dist/* /var/www/crm.prashantthakar.com/
```

### Issue: Documents field is still a string in API response
**Check:**
1. Verify backend code has the parsing logic (line 422, 459 in user.controller.ts)
2. Check if backend was restarted after code update
3. Check backend logs for parsing errors
4. Verify database column type is JSON, not TEXT

### Issue: Form fields still blank
**Check:**
1. Browser console for errors
2. Network tab - check API response structure
3. Verify frontend code has proper form keys
4. Try hard refresh (Ctrl+Shift+R)

## Verification Checklist

- [ ] Backend code pulled from GitHub
- [ ] Backend rebuilt (`npm run build`)
- [ ] Backend restarted (PM2 or systemd)
- [ ] Frontend code pulled from GitHub
- [ ] Frontend rebuilt (`npm run build`)
- [ ] Frontend deployed to web directory
- [ ] Browser cache cleared
- [ ] API response shows objects (not strings) for documents/expertise/availability
- [ ] Form fields populate when editing
- [ ] View modal shows all information

## Still Not Working?

1. **Check Database:**
   ```sql
   -- Verify data exists
   SELECT * FROM faculty_profiles WHERE userId = YOUR_ID;
   SELECT * FROM employee_profiles WHERE userId = YOUR_ID;
   ```

2. **Check API Response Structure:**
   - Open browser DevTools > Network
   - Click Edit on faculty/employee
   - Check the `/api/users/{id}` response
   - Verify structure matches expected format

3. **Check Backend Version:**
   ```bash
   cd /var/www/primeacademy_backend
   git log --oneline -5
   # Should see commits with "parse JSON fields"
   ```

4. **Contact Support:**
   - Share backend logs
   - Share API response from Network tab
   - Share browser console errors

