# Deploy Updated Code to VPS

## Step 1: Push to GitLab

```bash
# Check current branch
git branch

# Push to GitLab (replace 'upload' with your branch name if different)
git push origin upload

# Or if you want to push to main/master:
# git checkout main
# git merge upload
# git push origin main
```

## Step 2: Connect to VPS and Deploy

### Option A: SSH into VPS and Pull Updates

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to your project directory
cd /path/to/your/project

# Pull latest changes
git pull origin upload  # or 'main' depending on your branch

# Install/update dependencies
cd backend
npm install

cd ../frontend
npm install

# Build frontend
npm run build

# Restart backend service (adjust based on your setup)
# If using PM2:
pm2 restart all

# If using systemd:
sudo systemctl restart your-backend-service

# If using npm directly:
# Stop current process (Ctrl+C) and restart:
cd backend
npm start
```

### Option B: Using Deployment Script

Create a deployment script on your VPS:

```bash
#!/bin/bash
# deploy.sh

cd /path/to/your/project
git pull origin upload

# Backend
cd backend
npm install
npm run build  # if you have a build step

# Frontend
cd ../frontend
npm install
npm run build

# Restart services
pm2 restart all
# or
sudo systemctl restart your-backend-service
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run it:
```bash
./deploy.sh
```

## Step 3: Verify Deployment

1. Check backend is running:
   ```bash
   curl http://localhost:3000/api/health
   # or check your backend endpoint
   ```

2. Check frontend is accessible:
   - Visit your domain in browser
   - Check browser console for errors

3. Test certificate generation:
   - Login to admin panel
   - Navigate to Certificate Management
   - Create a test certificate
   - Verify PDF is generated correctly

## Important Notes

1. **Database Migrations**: If you added new migrations, run them:
   ```bash
   cd backend
   npm run migrate
   # or your migration command
   ```

2. **Environment Variables**: Make sure `.env` files are updated on VPS with:
   - Database credentials
   - JWT secrets
   - Backend URL
   - Any new environment variables

3. **File Permissions**: Ensure certificates directory exists and is writable:
   ```bash
   mkdir -p backend/certificates
   chmod 755 backend/certificates
   ```

4. **Nginx Configuration**: If you changed API routes, update nginx config:
   ```bash
   sudo nano /etc/nginx/sites-available/your-site
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Troubleshooting

### If backend fails to start:
- Check logs: `pm2 logs` or `journalctl -u your-service`
- Verify all dependencies installed: `npm install`
- Check environment variables are set correctly
- Verify database connection

### If frontend shows errors:
- Clear browser cache
- Check browser console for errors
- Verify API endpoints are correct
- Check nginx configuration

### If certificate generation fails:
- Check `backend/certificates/` directory exists and is writable
- Verify pdfmake is installed: `npm list pdfmake`
- Check backend logs for errors

