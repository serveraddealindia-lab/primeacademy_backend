# Deploy Faculty Registration Fixes to VPS

## ✅ Code Successfully Pushed to GitHub
All changes have been committed and pushed to `main` branch.

## Deployment Steps

### Step 1: Deploy Backend

SSH into your VPS and run:

```bash
# Navigate to backend directory
cd /var/www/primeacademy_backend

# Pull latest changes from GitHub
git fetch origin
git pull origin main

# Install any new dependencies (if any)
npm install

# Build TypeScript code
npm run build

# Restart backend service
pm2 restart backend-api

# Check if it's running
pm2 status
pm2 logs backend-api --lines 50
```

### Step 2: Deploy Frontend

```bash
# Navigate to frontend directory (on your local machine or VPS)
cd /path/to/frontend

# Pull latest changes
git fetch origin
git pull origin main

# Install dependencies (if needed)
npm install

# Build production version
npm run build

# The build output will be in frontend/dist/
# Upload the dist folder to your VPS frontend directory
```

**If frontend is on VPS:**
```bash
cd /var/www/primeacademy_frontend
git pull origin main
npm install
npm run build
# Restart nginx or your frontend server
sudo systemctl reload nginx
```

**If frontend is separate (local build):**
```bash
# On your local machine, after building:
# Upload dist folder to VPS
scp -r frontend/dist/* user@your-vps:/var/www/primeacademy_frontend/
```

### Step 3: Verify Deployment

1. **Test Faculty Registration:**
   - Go to Faculty Registration page
   - Fill in all steps
   - Verify dateOfBirth field works
   - Verify Next button works on all steps
   - Complete registration

2. **Test Faculty View:**
   - Go to Faculty Management
   - Click View on any faculty
   - Verify all details are displayed

3. **Test Faculty Edit:**
   - Click Edit on any faculty
   - Verify all fields are populated
   - Make changes and save
   - Verify changes are saved

4. **Test Student Registration:**
   - Try to register a student without deal amount
   - Should show error
   - Add deal amount and verify it works

## Rollback (If Needed)

If something goes wrong, you can rollback:

```bash
# Backend
cd /var/www/primeacademy_backend
git log --oneline -5  # Find previous commit
git reset --hard <previous-commit-hash>
npm run build
pm2 restart backend-api

# Frontend
cd /var/www/primeacademy_frontend
git log --oneline -5  # Find previous commit
git reset --hard <previous-commit-hash>
npm run build
sudo systemctl reload nginx
```

## What Was Changed

### Backend:
- `backend/src/controllers/student.controller.ts` - Added compulsory deal amount validation

### Frontend:
- `frontend/src/pages/FacultyRegistration.tsx` - Fixed form validation and step navigation
- `frontend/src/pages/StudentEnrollment.tsx` - Added compulsory deal amount requirement
- `frontend/src/api/student.api.ts` - Made deal amount required in interface
- `frontend/src/pages/EmployeeManagement.tsx` - Fixed employee address display
- `frontend/src/pages/EmployeeRegistration.tsx` - Fixed employee address saving
- `frontend/src/utils/imageUtils.ts` - Improved image URL handling

## Notes

- ✅ All changes are backward compatible
- ✅ No database migrations required
- ✅ No breaking changes to existing functionality
- ✅ Only adds validation and fixes bugs

## Troubleshooting

If you encounter issues:

1. **Backend not starting:**
   ```bash
   pm2 logs backend-api --lines 100
   # Check for TypeScript errors
   cd /var/www/primeacademy_backend
   npm run build
   ```

2. **Frontend not loading:**
   ```bash
   # Check nginx logs
   sudo tail -f /var/log/nginx/error.log
   # Reload nginx
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **Form not working:**
   - Clear browser cache
   - Check browser console for errors
   - Verify API endpoints are accessible

## Success Checklist

- [ ] Backend pulled and built successfully
- [ ] Backend restarted with PM2
- [ ] Frontend built successfully
- [ ] Frontend deployed to VPS
- [ ] Faculty registration works (all steps)
- [ ] Faculty view shows all details
- [ ] Faculty edit populates all fields
- [ ] Student registration requires deal amount
- [ ] No errors in browser console
- [ ] No errors in backend logs

