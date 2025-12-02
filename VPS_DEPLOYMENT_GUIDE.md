# Complete VPS Deployment Guide

## 📦 Step 1: Push Code to GitHub

### Backend
```bash
cd backend
git push -u origin main
```

### Frontend
```bash
cd frontend
git push -u origin main
```

---

## 🖥️ Step 2: Deploy on VPS

### A. Connect to VPS
```bash
ssh user@your-vps-ip
# Replace 'user' with your VPS username and 'your-vps-ip' with your VPS IP address
```

### B. Navigate to Project Directory
```bash
cd /var/www/primeacademy
# Or wherever your project is located
```

### C. Pull Latest Code

#### Option 1: If you have separate repos (recommended)
```bash
# Backend
cd backend
git pull origin main
# or if first time:
# git clone https://github.com/serveraddealindia-lab/primeacademy_backend.git backend

# Frontend
cd ../frontend
git pull origin main
# or if first time:
# git clone https://github.com/serveraddealindia-lab/primeacademy_frontend.git frontend
```

#### Option 2: If you have single repo
```bash
git pull origin upload
# or your branch name
```

---

## 🔧 Step 3: Install Dependencies

### Backend
```bash
cd backend
npm install

# Install new dependencies (pdfmake, etc.)
npm install pdfmake pdfkit @types/pdfkit
```

### Frontend
```bash
cd frontend
npm install
```

---

## 🏗️ Step 4: Build Frontend

```bash
cd frontend
npm run build

# This creates the 'dist' folder with production build
```

---

## 🗄️ Step 5: Database Setup

### Run Migrations (if needed)
```bash
cd backend

# If you have a migration script:
npm run migrate

# Or manually run migrations:
# Check your package.json for migration commands
```

### Create Required Directories
```bash
# Create certificates directory
mkdir -p backend/certificates
chmod 755 backend/certificates

# Create uploads directory
mkdir -p backend/uploads/general
chmod 755 backend/uploads/general
```

---

## ⚙️ Step 6: Environment Variables

### Backend (.env)
```bash
cd backend
nano .env
```

Make sure these are set:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=production
BACKEND_URL=http://your-domain.com

# File Uploads
UPLOAD_DIR=/var/www/primeacademy/backend/uploads
```

### Frontend (.env.production)
```bash
cd frontend
nano .env.production
```

```env
VITE_API_URL=http://your-domain.com/api
# or
VITE_API_URL=https://api.your-domain.com
```

---

## 🚀 Step 7: Restart Services

### Option A: Using PM2 (Recommended)
```bash
# Install PM2 if not installed
npm install -g pm2

# Start/Restart backend
cd backend
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
# or if using compiled JS:
pm2 start dist/index.js --name primeacademy-backend

# Restart if already running
pm2 restart primeacademy-backend

# Check status
pm2 status
pm2 logs primeacademy-backend
```

### Option B: Using systemd
```bash
sudo systemctl restart primeacademy-backend
sudo systemctl status primeacademy-backend
```

### Option C: Manual Start
```bash
cd backend
npm start
# or
node dist/index.js
```

---

## 🌐 Step 8: Configure Nginx

### Backend API Configuration
```bash
sudo nano /etc/nginx/sites-available/primeacademy-api
```

```nginx
server {
    listen 80;
    server_name api.your-domain.com;  # or your-domain.com

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
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Serve uploaded files
    location /uploads {
        alias /var/www/primeacademy/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Frontend Configuration
```bash
sudo nano /etc/nginx/sites-available/primeacademy-frontend
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or www.your-domain.com

    root /var/www/primeacademy/frontend/dist;
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

### Enable Sites and Reload
```bash
# Enable sites
sudo ln -s /etc/nginx/sites-available/primeacademy-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/primeacademy-frontend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 🔒 Step 9: SSL Certificate (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal is set up automatically
```

---

## ✅ Step 10: Verify Deployment

### Check Backend
```bash
# Test API health endpoint
curl http://localhost:3000/api/health
# or
curl http://your-domain.com/api/health

# Check backend logs
pm2 logs primeacademy-backend
# or
journalctl -u primeacademy-backend -f
```

### Check Frontend
1. Visit your domain in browser: `http://your-domain.com`
2. Open browser console (F12) and check for errors
3. Test login functionality
4. Test certificate generation

### Check Services
```bash
# PM2 status
pm2 status

# Nginx status
sudo systemctl status nginx

# Database connection
# Test from backend or use mysql client
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs primeacademy-backend
# or
cd backend
npm start  # Run directly to see errors

# Check environment variables
cat backend/.env

# Check port is available
netstat -tulpn | grep 3000

# Check database connection
mysql -u your_user -p -h localhost primeacademy_db
```

### Frontend shows errors
```bash
# Rebuild frontend
cd frontend
rm -rf dist node_modules
npm install
npm run build

# Check API URL in .env.production
cat frontend/.env.production

# Check browser console for errors
```

### Certificate generation fails
```bash
# Check certificates directory exists and is writable
ls -la backend/certificates
chmod 755 backend/certificates

# Check pdfmake is installed
cd backend
npm list pdfmake

# Check backend logs
pm2 logs primeacademy-backend | grep certificate
```

### Nginx 502 Bad Gateway
```bash
# Check backend is running
pm2 status

# Check backend port
netstat -tulpn | grep 3000

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### File upload fails
```bash
# Check uploads directory
ls -la backend/uploads/general
chmod 755 backend/uploads/general

# Check disk space
df -h
```

---

## 📝 Quick Deployment Script

Create a deployment script on your VPS:

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting deployment..."

# Backend
echo "📦 Updating backend..."
cd /var/www/primeacademy/backend
git pull origin main
npm install
pm2 restart primeacademy-backend

# Frontend
echo "📦 Updating frontend..."
cd /var/www/primeacademy/frontend
git pull origin main
npm install
npm run build

echo "✅ Deployment complete!"
echo "🔍 Check services: pm2 status"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run it:
```bash
./deploy.sh
```

---

## 🔄 Regular Updates

For future updates, simply run:
```bash
# Pull latest code
cd backend && git pull origin main
cd ../frontend && git pull origin main

# Install new dependencies
cd backend && npm install
cd ../frontend && npm install

# Rebuild frontend
cd frontend && npm run build

# Restart backend
pm2 restart primeacademy-backend
```

---

## 📞 Support

If you encounter issues:
1. Check logs: `pm2 logs` or `journalctl -u service-name`
2. Verify environment variables are set
3. Check file permissions
4. Verify database connection
5. Check nginx configuration




