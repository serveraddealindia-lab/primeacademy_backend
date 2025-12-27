# GitHub Setup for Backend

## Part 1: Add Backend to GitHub

### Step 1: Initialize Git (if not already done)

```bash
# Navigate to backend directory
cd C:\Users\ADDEAL\Primeacademy\backend

# Initialize git repository (if not already initialized)
git init

# Check current status
git status
```

### Step 2: Create .gitignore (if not exists)

```bash
# Create .gitignore file
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build output
dist/
build/

# Environment variables
.env
.env.local
.env.production
.env.development

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Uploads (if you don't want to track uploaded files)
uploads/*
!uploads/.gitkeep

# Database
*.sql
*.db

# Temporary files
tmp/
temp/
EOF
```

### Step 3: Add Files and Commit

```bash
# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Prime Academy Backend"

# Check if commit was successful
git log --oneline
```

### Step 4: Create Repository on GitHub

1. Go to https://github.com
2. Click "New repository"
3. Name it: `primeacademy-backend` (or your preferred name)
4. **Don't** initialize with README, .gitignore, or license
5. Click "Create repository"

### Step 5: Add Remote and Push

```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/primeacademy-backend.git

# Or if using SSH:
# git remote add origin git@github.com:YOUR_USERNAME/primeacademy-backend.git

# Verify remote was added
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

**If you get authentication error:**
- Use Personal Access Token instead of password
- Or set up SSH keys

## Part 2: Setup on VPS

### Step 1: Clone Repository on VPS

```bash
# SSH into VPS
ssh root@your-vps-ip

# Navigate to web directory
cd /var/www

# Clone repository
git clone https://github.com/YOUR_USERNAME/primeacademy-backend.git

# Or if using SSH:
# git clone git@github.com:YOUR_USERNAME/primeacademy-backend.git

# Rename if needed (if you want it in primeacademy_backend folder)
mv primeacademy-backend primeacademy_backend
```

### Step 2: Setup Environment

```bash
# Navigate to backend
cd /var/www/primeacademy_backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env 2>/dev/null || touch .env

# Edit .env with your production values
nano .env
```

**Add to .env:**
```
NODE_ENV=production
PORT=3001
DB_NAME=primeacademy_db
DB_USER=primeacademy_user
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=3306
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://crm.prashantthakar.com,http://crm.prashantthakar.com
```

### Step 3: Build and Start

```bash
# Build the project
npm run build

# Start with PM2
pm2 start dist/index.js --name backend-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs

# Check status
pm2 list
pm2 logs backend-api
```

## Part 3: Update Workflow

### On Local Machine (After Making Changes)

```bash
cd C:\Users\ADDEAL\Primeacademy\backend

# Check what changed
git status

# Add changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push origin main
```

### On VPS (Pull Latest Changes)

```bash
# SSH into VPS
ssh root@your-vps-ip

# Navigate to backend
cd /var/www/primeacademy_backend

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild
npm run build

# Restart backend
pm2 restart backend-api

# Check logs
pm2 logs backend-api
```

## Quick Update Script for VPS

Create a script to automate updates:

```bash
# On VPS, create update script
cat > /var/www/primeacademy_backend/update.sh << 'EOF'
#!/bin/bash
cd /var/www/primeacademy_backend
echo "Pulling latest changes..."
git pull origin main
echo "Installing dependencies..."
npm install
echo "Building..."
npm run build
echo "Restarting backend..."
pm2 restart backend-api
echo "Done! Check logs with: pm2 logs backend-api"
EOF

chmod +x /var/www/primeacademy_backend/update.sh
```

**Then just run:**
```bash
/var/www/primeacademy_backend/update.sh
```

