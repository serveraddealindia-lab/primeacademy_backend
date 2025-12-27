# Troubleshoot Faculty Not Working in Live

## 🔍 Quick Checks on VPS

### Step 1: Verify Backend Files Are Updated

```bash
cd /var/www/primeacademy_backend

# Check if faculty routes file has GET route
grep -n "GET\|getFacultyProfile" src/routes/faculty.routes.ts

# Check if faculty controller has getFacultyProfile function
grep -n "getFacultyProfile" src/controllers/faculty.controller.ts

# Check if index.ts has faculty routes registered
grep -n "facultyRoutes\|/api/faculty" src/index.ts
```

### Step 2: Rebuild Backend

```bash
cd /var/www/primeacademy_backend
npm run build
pm2 restart backend-api
pm2 logs backend-api --lines 50
```

### Step 3: Check Backend Logs for Errors

```bash
pm2 logs backend-api --lines 100 | grep -i "faculty\|error"
```

### Step 4: Test API Endpoint Directly

```bash
# Test if faculty endpoint is accessible
curl -X GET http://localhost:3001/api/faculty/247 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Step 5: Verify Frontend Files

```bash
cd /var/www/primeacademy_frontend

# Check if files are updated
ls -la src/pages/Faculty*.tsx
ls -la src/utils/imageUtils.ts

# Rebuild frontend
npm run build

# Clear nginx cache
sudo systemctl reload nginx
```

### Step 6: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to view/edit faculty
4. Check for failed API calls
5. Check Console tab for errors

### Step 7: Check Database

```bash
# Connect to MySQL
mysql -u your_user -p primeacademy

# Check if faculty_profiles table has data
SELECT id, userId, dateOfBirth, 
       JSON_EXTRACT(documents, '$.personalInfo.dateOfBirth') as dob_in_doc
FROM faculty_profiles 
LIMIT 5;

# Check column types
DESCRIBE faculty_profiles;
```

---

## 🐛 Common Issues

### Issue 1: Missing GET Route
**Symptom:** 404 error when trying to view faculty

**Fix:** Add GET route to `faculty.routes.ts`:
```typescript
// GET /api/faculty/:userId - Get faculty profile by user ID
router.get(
  '/:userId',
  verifyTokenMiddleware,
  facultyController.getFacultyProfile
);
```

### Issue 2: Backend Not Rebuilt
**Symptom:** Old code still running

**Fix:**
```bash
cd /var/www/primeacademy_backend
npm run build
pm2 restart backend-api
```

### Issue 3: Frontend Not Rebuilt
**Symptom:** Old frontend code cached

**Fix:**
```bash
cd /var/www/primeacademy_frontend
npm run build
# Clear browser cache (Ctrl+Shift+Delete)
```

### Issue 4: JSON Fields Not Parsed
**Symptom:** Fields showing as strings instead of objects

**Fix:** Verify `user.controller.ts` has JSON parsing code

### Issue 5: CORS or Nginx Issues
**Symptom:** API calls failing

**Fix:** Check nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

---

## ✅ Complete Fix Checklist

- [ ] Backend files uploaded
- [ ] Backend rebuilt (`npm run build`)
- [ ] Backend restarted (`pm2 restart backend-api`)
- [ ] Frontend files uploaded
- [ ] Frontend rebuilt (`npm run build`)
- [ ] Nginx reloaded (`sudo systemctl reload nginx`)
- [ ] Browser cache cleared
- [ ] API endpoints tested
- [ ] Database checked
- [ ] No errors in logs

