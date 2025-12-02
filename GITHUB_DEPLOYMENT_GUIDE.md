# GitHub to VPS Deployment Guide

This guide will help you upload your code to GitHub and then deploy it to your VPS.

**For detailed step-by-step VPS deployment instructions, see: `VPS_STEP_BY_STEP_GUIDE.md`**

---

## Part 1: Upload to GitHub

### Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name:** `primeacademy-crm` (or your preferred name)
   - **Description:** Prime Academy CRM System
   - **Visibility:** Private (recommended) or Public
   - **DO NOT** initialize with README, .gitignore, or license (we'll add these)
4. Click **"Create repository"**

### Step 2: Initialize Git in Your Project

Open terminal/command prompt in your project root directory:

```bash
# Navigate to your project
cd C:\Users\ADDEAL\Primeacademy

# Initialize Git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Prime Academy CRM"
```

### Step 3: Create .gitignore File

Create `.gitignore` in the project root:

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.production
.env.development

# Build outputs
dist/
build/
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
desktop.ini

# Logs
logs/
*.log

# Uploads and generated files (keep structure, ignore content)
uploads/**/*
!uploads/**/.gitkeep
orientations/*.pdf
receipts/*.pdf
certificates/*.pdf

# Database
*.sql
*.db
*.sqlite

# Temporary files
tmp/
temp/
*.tmp
```

### Step 4: Add Remote and Push to GitHub

```bash
# Add GitHub remote
git remote add origin https://github.com/serveraddealindia-lab/primeacademy_backend.git

# Or if using SSH:
# git remote add origin git@github.com:YOUR_USERNAME/primeacademy-crm.git

# Rename default branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

If prompted for credentials:
- **Username:** Your GitHub username
- **Password:** Use a Personal Access Token (not your GitHub password)
  - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  - Generate new token with `repo` scope
  - Use this token as password

### Step 5: Verify Upload

1. Go to your GitHub repository
2. Verify all files are uploaded
3. Check that `.env` files are NOT uploaded (they should be in .gitignore)

---

## Part 2: Deploy from GitHub to VPS

### Step 1: Connect to Your VPS

```bash
ssh user@your-vps-ip
# Or
ssh root@your-vps-ip
```

### Step 2: Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y

# Install Nginx
sudo apt install nginx -y

# Install PM2
sudo npm install -g pm2

# Install Git (if not already installed)
sudo apt install git -y
```

### Step 3: Setup Database

```bash
# Secure MySQL
sudo mysql_secure_installation

# Create database
sudo mysql -u root -p
```

In MySQL:
```sql
CREATE DATABASE primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 4: Clone Repository

```bash
# Create project directory
sudo mkdir -p /var/www/primeacademy
sudo chown $USER:$USER /var/www/primeacademy
cd /var/www/primeacademy

# Clone from GitHub (Backend)
git clone https://github.com/serveraddealindia-lab/primeacademy_backend.git backend

# Clone Frontend separately
cd ..
git clone https://github.com/serveraddealindia-lab/primeacademy_frontend.git frontend

# Or if using SSH key:
# git clone git@github.com:YOUR_USERNAME/primeacademy-crm.git .
```

### Step 5: Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create .env file
nano .env
```

Add to `.env`:
```env
NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=primeacademy_user
DB_PASSWORD=your_strong_password_here

JWT_SECRET=your_super_secret_jwt_key_min_32_chars

FRONTEND_URL=https://yourdomain.com,http://yourdomain.com
BACKEND_URL=https://yourdomain.com
```

Generate JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 6: Create Required Directories

```bash
cd /var/www/primeacademy/backend

# Create directories
mkdir -p uploads/general uploads/attendance orientations receipts certificates

# Set permissions
chmod -R 755 uploads orientations receipts certificates
```

### Step 7: Copy Orientation PDFs

```bash
# Upload your PDF files to VPS first (using SCP or SFTP)
# Then copy them:
cp /path/to/Student_Orientation_English.pdf orientations/Student_Orientation_English.pdf
cp /path/to/Student_Orientation_Gujarati.pdf orientations/Student_Orientation_Gujarati.pdf

# Or if you uploaded them to /tmp:
# cp /tmp/Student_Orientation_*.pdf orientations/
```

### Step 8: Run Database Migrations

```bash
cd /var/www/primeacademy/backend

# Run migrations (if you have a migration script)
npm run migrate

# Or manually run SQL setup
mysql -u primeacademy_user -p primeacademy_db < ../VPS_DATABASE_SETUP.sql
```

### Step 9: Start Backend with PM2

```bash
cd /var/www/primeacademy/backend

# Start application
pm2 start dist/index.js --name primeacademy-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it provides
```

### Step 10: Setup Frontend

```bash
cd /var/www/primeacademy/frontend

# Install dependencies
npm install

# Create .env file
nano .env
```

Add to `.env`:
```env
VITE_API_BASE_URL=https://yourdomain.com
```

```bash
# Build frontend
npm run build
```

### Step 11: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/primeacademy
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    root /var/www/primeacademy/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
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

    # Static files
    location /uploads {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /orientations {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /receipts {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /certificates {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/primeacademy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 12: Install SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Step 13: Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Part 3: Update Deployment Script

Create a deployment script on VPS for easy updates:

```bash
nano /var/www/primeacademy/deploy.sh
```

Add:
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Prime Academy CRM..."

cd /var/www/primeacademy

# Pull latest code
git pull origin main

# Backend
cd backend
npm install
npm run build
pm2 restart primeacademy-backend

# Frontend
cd ../frontend
npm install
npm run build

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x /var/www/primeacademy/deploy.sh
```

---

## Part 4: Future Updates

When you make changes:

1. **On Local Machine:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **On VPS:**
   ```bash
   cd /var/www/primeacademy
   ./deploy.sh
   ```

Or manually:
```bash
cd /var/www/primeacademy
git pull origin main
cd backend && npm install && npm run build && pm2 restart primeacademy-backend
cd ../frontend && npm install && npm run build
```

---

## Troubleshooting

### GitHub Authentication Issues

If you get authentication errors:
1. Use Personal Access Token instead of password
2. Or setup SSH keys:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   cat ~/.ssh/id_ed25519.pub
   # Copy and add to GitHub → Settings → SSH Keys
   ```

### Git Pull Issues on VPS

If you get "working directory is dirty":
```bash
cd /var/www/primeacademy
git stash
git pull origin main
git stash pop
```

### PM2 Not Starting

Check logs:
```bash
pm2 logs primeacademy-backend
pm2 restart primeacademy-backend
```

---

## Security Notes

1. **Never commit `.env` files** - They're in .gitignore
2. **Use strong passwords** for database and JWT
3. **Keep GitHub repository private** if it contains sensitive info
4. **Use SSH keys** instead of passwords for GitHub
5. **Regular backups** of database and files

---

## Quick Reference

```bash
# Local: Push to GitHub
git add .
git commit -m "Update message"
git push origin main

# VPS: Pull and deploy
cd /var/www/primeacademy
git pull origin main
cd backend && npm install && npm run build && pm2 restart primeacademy-backend
cd ../frontend && npm install && npm run build

# Check status
pm2 status
pm2 logs primeacademy-backend
```

Good luck with your deployment! 🚀

