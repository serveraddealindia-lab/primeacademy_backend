# Update VPS with New Code from GitHub

## 🎯 Your Current Setup
- **Frontend**: https://crm.prashantthakar.com
- **Backend API**: https://api.prashantthakar.com
- **Status**: Working with old code
- **New Code**: Available on GitHub

---

## 📋 Step-by-Step Update Process

### Step 1: Connect to VPS
```bash
ssh user@your-vps-ip
# Replace with your actual VPS credentials
```

### Step 2: Navigate to Project Directory
```bash
# Find your project location (common locations)
cd /var/www/primeacademy
# or
cd /home/user/primeacademy
# or wherever your project is located

# Verify you're in the right place
ls -la
# You should see 'backend' and 'frontend' directories
```

### Step 3: Backup Current Code (Safety First!)
```bash
# Create backup directory
mkdir -p ~/backups/primeacademy-$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=~/backups/primeacademy-$(date +%Y%m%d-%H%M%S)

# Backup backend
cp -r backend $BACKUP_DIR/backend-backup

# Backup frontend
cp -r frontend $BACKUP_DIR/frontend-backup

# Backup environment files
cp backend/.env $BACKUP_DIR/backend.env 2>/dev/null || true
cp frontend/.env.production $BACKUP_DIR/frontend.env.production 2>/dev/null || true

echo "✅ Backup created at: $BACKUP_DIR"
```

### Step 4: Update Backend

```bash
cd backend

# Check current remote
git remote -v

# If remote is not set to GitHub, update it:
# git remote set-url origin https://github.com/serveraddealindia-lab/primeacademy_backend.git

# Pull latest code
git pull origin main

# If you get "unrelated histories" error:
# git pull origin main --allow-unrelated-histories

# Install/update dependencies
npm install

# Verify new dependencies are installed (pdfmake, etc.)
npm list pdfmake pdfkit
```

### Step 5: Update Frontend

```bash
cd ../frontend

# Check current remote
git remote -v

# If remote is not set to GitHub, update it:
# git remote set-url origin https://github.com/serveraddealindia-lab/primeacademy_frontend.git

# Pull latest code
git pull origin main

# If you get "unrelated histories" error:
# git pull origin main --allow-unrelated-histories

# Install/update dependencies
npm install

# Build production version
npm run build

# Verify build was successful
ls -la dist/
```

### Step 6: Create Required Directories

```bash
# Go back to project root
cd ..

# Create certificates directory (for PDF generation)
mkdir -p backend/certificates
chmod 755 backend/certificates

# Create uploads directory (for file uploads)
mkdir -p backend/uploads/general
chmod 755 backend/uploads/general

# Verify directories exist
ls -la backend/certificates
ls -la backend/uploads/general
```

### Step 7: Update Environment Variables

#### Backend Environment
```bash
cd backend
nano .env
```

**Important**: Make sure these are set correctly:
```env
# Database (keep your existing values)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT (keep your existing secret)
JWT_SECRET=your_existing_jwt_secret
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=production

# Backend URL (important for certificate PDFs)
BACKEND_URL=https://api.prashantthakar.com

# File Uploads
UPLOAD_DIR=/var/www/primeacademy/backend/uploads
# or your actual path
```

#### Frontend Environment
```bash
cd ../frontend
nano .env.production
```

**Important**: Make sure API URL is correct:
```env
VITE_API_URL=https://api.prashantthakar.com/api
```

### Step 8: Run Database Migrations (if needed)

```bash
cd ../backend

# Check if you have a migration script
cat package.json | grep migrate

# If migrations are needed, run them:
# Option 1: If you have a migrate script
npm run migrate

# Option 2: Manual migration (if using Sequelize CLI)
npx sequelize-cli db:migrate

# Option 3: Check if migrations run automatically on startup
# (Some setups run migrations in index.ts)
```

### Step 9: Restart Backend Service

#### Option A: Using PM2 (Recommended)
```bash
# Check current PM2 processes
pm2 list

# Restart backend
pm2 restart primeacademy-backend
# or whatever your backend process name is

# Check logs
pm2 logs primeacademy-backend --lines 50

# If backend is not in PM2, start it:
cd backend
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
# or if using compiled JS:
pm2 start dist/index.js --name primeacademy-backend

# Save PM2 configuration
pm2 save
```

#### Option B: Using systemd
```bash
sudo systemctl restart primeacademy-backend
sudo systemctl status primeacademy-backend
```

#### Option C: Manual Restart
```bash
# Stop current process (find and kill)
ps aux | grep node
kill <process_id>

# Start new process
cd backend
npm start
# or
node dist/index.js
```

### Step 10: Update Nginx Configuration (if needed)

```bash
# Check current nginx config
sudo nano /etc/nginx/sites-available/api.prashantthakar.com
# or
sudo nano /etc/nginx/sites-available/default
```

**Make sure these routes are configured:**

```nginx
# Backend API
server {
    listen 80;
    server_name api.prashantthakar.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve certificate PDFs
    location /certificates {
        alias /var/www/primeacademy/backend/certificates;
        # or your actual path
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Serve uploaded files
    location /uploads {
        alias /var/www/primeacademy/backend/uploads;
        # or your actual path
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# Frontend
server {
    listen 80;
    server_name crm.prashantthakar.com;

    root /var/www/primeacademy/frontend/dist;
    # or your actual path
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Test and reload nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 11: Verify Deployment

#### Check Backend
```bash
# Test API endpoint
curl https://api.prashantthakar.com/api/health
# or
curl http://localhost:3000/api/health

# Check backend logs
pm2 logs primeacademy-backend --lines 20
# or
journalctl -u primeacademy-backend -n 20
```

#### Check Frontend
1. Visit: https://crm.prashantthakar.com
2. Open browser console (F12)
3. Check for any errors
4. Try logging in
5. Test new features (certificate generation, etc.)

#### Check Services
```bash
# PM2 status
pm2 status

# Nginx status
sudo systemctl status nginx

# Check ports
netstat -tulpn | grep 3000
```

---

## 🔄 Quick Update Script

Create this script for future updates:

```bash
#!/bin/bash
# update-vps.sh

set -e

echo "🚀 Starting VPS update..."

# Backup
echo "📦 Creating backup..."
BACKUP_DIR=~/backups/primeacademy-$(date +%Y%m%d-%H%M%S)
mkdir -p $BACKUP_DIR
cp -r backend $BACKUP_DIR/backend-backup
cp -r frontend $BACKUP_DIR/frontend-backup
cp backend/.env $BACKUP_DIR/backend.env 2>/dev/null || true
cp frontend/.env.production $BACKUP_DIR/frontend.env.production 2>/dev/null || true

# Backend
echo "📦 Updating backend..."
cd backend
git pull origin main
npm install
cd ..

# Frontend
echo "📦 Updating frontend..."
cd frontend
git pull origin main
npm install
npm run build
cd ..

# Create directories
mkdir -p backend/certificates backend/uploads/general
chmod 755 backend/certificates backend/uploads/general

# Restart services
echo "🔄 Restarting services..."
pm2 restart primeacademy-backend
sudo systemctl reload nginx

echo "✅ Update complete!"
echo "🔍 Check status: pm2 status"
```

Make it executable:
```bash
chmod +x update-vps.sh
```

Run it:
```bash
./update-vps.sh
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs primeacademy-backend

# Check if port is in use
netstat -tulpn | grep 3000

# Check environment variables
cat backend/.env

# Try starting manually to see errors
cd backend
npm start
```

### Frontend shows old version
```bash
# Clear nginx cache
sudo systemctl reload nginx

# Rebuild frontend
cd frontend
rm -rf dist
npm run build

# Check nginx is serving correct directory
ls -la /var/www/primeacademy/frontend/dist
```

### Certificate generation fails
```bash
# Check certificates directory
ls -la backend/certificates
chmod 755 backend/certificates

# Check pdfmake is installed
cd backend
npm list pdfmake

# Check backend logs
pm2 logs primeacademy-backend | grep certificate
```

### API returns 502 Bad Gateway
```bash
# Check backend is running
pm2 status

# Check backend logs
pm2 logs primeacademy-backend

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Database connection errors
```bash
# Verify database credentials in .env
cat backend/.env | grep DB_

# Test database connection
mysql -u your_user -p -h localhost primeacademy_db
```

---

## ✅ Verification Checklist

After update, verify:

- [ ] Backend API is accessible: https://api.prashantthakar.com/api/health
- [ ] Frontend loads: https://crm.prashantthakar.com
- [ ] Login works
- [ ] Certificate generation works (if applicable)
- [ ] File uploads work
- [ ] All new features are accessible
- [ ] No errors in browser console
- [ ] No errors in backend logs

---

## 📞 Quick Commands Reference

```bash
# View backend logs
pm2 logs primeacademy-backend

# Restart backend
pm2 restart primeacademy-backend

# Check PM2 status
pm2 status

# Reload nginx
sudo systemctl reload nginx

# Check nginx status
sudo systemctl status nginx

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
```




