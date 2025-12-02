# 🚀 Deploy to Live VPS - Complete Guide

## 📋 Step 1: Commit and Push Changes (Local Machine)

### Check Current Status
```bash
cd C:\Users\ADDEAL\Primeacademy
git status
```

### Add All Changes
```bash
# Add all changes
git add .

# Or add specific files
git add frontend/src/
git add backend/src/
```

### Commit Changes
```bash
git commit -m "Add serial numbers, scrollbars, date formatting, and payment plan fixes"
```

### Push to Repository
```bash
# If using main branch
git push origin main

# Or if using a different branch
git push origin upload
```

**Verify:** Check GitHub/GitLab to confirm your changes are pushed.

---

## 🖥️ Step 2: Connect to VPS

### SSH into VPS
```bash
ssh root@your_vps_ip
# Or
ssh user@your_vps_ip
```

### Navigate to Project Directory
```bash
# Common locations:
cd /var/www/primeacademy
# OR
cd /var/www/primeacademy_frontend  # if separate repos
cd /var/www/primeacademy_backend
```

---

## 🔄 Step 3: Pull Latest Code

### If Single Repository
```bash
cd /var/www/primeacademy
git pull origin main
# or
git pull origin upload
```

### If Separate Repositories
```bash
# Backend
cd /var/www/primeacademy_backend
git pull origin main

# Frontend
cd /var/www/primeacademy_frontend
git pull origin main
```

**Verify:** Check that new code was pulled
```bash
git log -1 --oneline
```

---

## 🔨 Step 4: Backend Deployment

### Navigate to Backend
```bash
cd /var/www/primeacademy/backend
# OR
cd /var/www/primeacademy_backend
```

### Install/Update Dependencies
```bash
npm install
```

### Build Backend (if TypeScript)
```bash
npm run build
```

### Run Database Migrations (if needed)
```bash
# Check if you have migration scripts
npm run migrate
# OR manually run SQL files if needed
```

### Restart Backend Service

#### If using PM2:
```bash
pm2 restart all
# OR
pm2 restart primeacademy-backend
```

#### If using systemd:
```bash
sudo systemctl restart primeacademy-backend
# OR
sudo systemctl restart nodejs
```

#### If running directly:
```bash
# Stop current process (Ctrl+C) and restart
npm start
```

**Verify Backend:**
```bash
# Check if backend is running
curl http://localhost:3000/api/health
# OR
pm2 status
# OR
sudo systemctl status primeacademy-backend
```

---

## 🎨 Step 5: Frontend Deployment

### Navigate to Frontend
```bash
cd /var/www/primeacademy/frontend
# OR
cd /var/www/primeacademy_frontend
```

### Clean Old Build
```bash
rm -rf dist node_modules .vite
```

### Clear npm Cache
```bash
npm cache clean --force
```

### Install Dependencies
```bash
npm install
```

### Build Frontend
```bash
npm run build
```

**Wait for build to complete** - Should show "✓ built in X.XXs"

### Fix Permissions
```bash
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist
```

### Restart Nginx
```bash
sudo systemctl restart nginx
```

**Verify Frontend:**
```bash
# Check build files
ls -lth dist/assets/ | head -5

# Check Nginx status
sudo systemctl status nginx
```

---

## 🔍 Step 6: Verify Deployment

### Check Backend API
```bash
curl http://localhost:3000/api/health
```

### Check Frontend Build
```bash
ls -lth dist/assets/ | head -3
# Should show recent files
```

### Test in Browser
1. **Clear browser cache:** `Ctrl+Shift+Delete` → Clear cached images and files
2. **Or use Incognito/Private window**
3. Visit: `https://crm.prashantthakar.com`
4. **Check browser console (F12)** for errors
5. **Test payment plan tab** in student view

---

## 🐛 Troubleshooting Payment Plan Issue

### Issue: Payment Plan Tab Not Working in Live VPS

#### 1. Check Browser Console
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed API calls

#### 2. Check Backend Logs
```bash
# If using PM2
pm2 logs primeacademy-backend

# If using systemd
sudo journalctl -u primeacademy-backend -f

# Check for errors related to:
# - Student profile API
# - Documents field parsing
# - JSON parsing errors
```

#### 3. Verify Database Data
```bash
# Connect to database
mysql -u your_user -p your_database

# Check student_profiles table
SELECT id, userId, documents FROM student_profiles LIMIT 5;

# Check if documents field has enrollmentMetadata
SELECT id, userId, JSON_EXTRACT(documents, '$.enrollmentMetadata') as metadata 
FROM student_profiles 
WHERE documents IS NOT NULL 
LIMIT 5;
```

#### 4. Test API Endpoint Directly
```bash
# Test student profile API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://crm.prashantthakar.com/api/users/STUDENT_ID

# Check if documents field is returned correctly
```

#### 5. Common Issues and Fixes

**Issue: Documents field is null or empty**
- **Fix:** Ensure enrollment data was saved with enrollmentMetadata
- **Check:** Verify `completeEnrollment` API saves data correctly

**Issue: JSON parsing error**
- **Fix:** Check database column type is JSON (not TEXT)
- **SQL Fix:**
```sql
ALTER TABLE student_profiles 
MODIFY COLUMN documents JSON;
```

**Issue: API not returning documents**
- **Fix:** Check backend controller includes documents field
- **Verify:** Check `getUserById` in `user.controller.ts` includes studentProfile

**Issue: CORS or Network errors**
- **Fix:** Check Nginx configuration
- **Verify:** Check API base URL in frontend `.env` file

#### 6. Rebuild and Clear Cache
```bash
# On VPS - Frontend
cd /var/www/primeacademy_frontend
rm -rf dist node_modules .vite
npm cache clean --force
npm install
npm run build
sudo chown -R www-data:www-data dist
sudo systemctl restart nginx

# Clear browser cache completely
```

---

## 🚀 Quick Deployment Script (Copy-Paste)

```bash
#!/bin/bash
# Quick deploy script for VPS

echo "🚀 Starting deployment..."

# Backend
echo "📦 Updating backend..."
cd /var/www/primeacademy/backend
git pull origin main
npm install
npm run build
pm2 restart all

# Frontend
echo "🎨 Updating frontend..."
cd /var/www/primeacademy/frontend
git pull origin main
rm -rf dist node_modules .vite
npm cache clean --force
npm install
npm run build
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist
sudo systemctl restart nginx

echo "✅ Deployment complete!"
echo "📋 Verifying..."
ls -lth dist/assets/ | head -3
pm2 status
```

**Save as `deploy.sh` and make executable:**
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 📝 Deployment Checklist

### Before Deployment:
- [ ] All changes committed locally
- [ ] Changes pushed to repository
- [ ] Build successful locally
- [ ] No TypeScript/compilation errors

### On VPS:
- [ ] Pulled latest code from repository
- [ ] Backend dependencies installed
- [ ] Backend built (if TypeScript)
- [ ] Backend service restarted
- [ ] Frontend dependencies installed
- [ ] Frontend built successfully
- [ ] Permissions fixed (www-data)
- [ ] Nginx restarted
- [ ] Build files are recent

### After Deployment:
- [ ] Browser cache cleared
- [ ] Tested in incognito window
- [ ] No console errors
- [ ] Payment plan tab working
- [ ] All features tested

---

## 🔧 Payment Plan Specific Fixes

### If Payment Plan Still Not Working:

1. **Check API Response:**
   - Open browser DevTools → Network tab
   - Click on a student to view profile
   - Find the API call to `/api/users/:id`
   - Check response - does it include `documents.enrollmentMetadata`?

2. **Add Debug Logging:**
   - Check browser console for any errors
   - Add temporary console.log in StudentManagement.tsx to debug

3. **Verify Database:**
   - Check if `student_profiles.documents` column exists
   - Check if data is stored correctly
   - Verify JSON structure matches expected format

4. **Check Environment Variables:**
   - Verify API base URL is correct
   - Check CORS settings
   - Verify authentication tokens

---

## 📞 Need Help?

If payment plan still doesn't work after deployment:

1. **Check browser console** for specific error messages
2. **Check backend logs** for API errors
3. **Verify database** has correct data structure
4. **Test API endpoint** directly with curl/Postman
5. **Compare** local vs production database structure

---

## ✅ Success Indicators

- ✅ Build completes without errors
- ✅ No console errors in browser
- ✅ Payment plan tab shows data (or shows "-" if no data)
- ✅ All other features working
- ✅ API calls returning correct data

---

**After successful deployment, payment plan should work correctly!** 🎉

