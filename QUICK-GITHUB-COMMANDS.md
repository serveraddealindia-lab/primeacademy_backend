# Quick GitHub Commands for Backend

## Part 1: Add Backend to GitHub (Local Machine)

### Windows PowerShell Commands:

```powershell
# Navigate to backend
cd C:\Users\ADDEAL\Primeacademy\backend

# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Prime Academy Backend"

# Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/primeacademy-backend.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**If authentication fails:**
- Use Personal Access Token (Settings > Developer settings > Personal access tokens)
- Or setup SSH keys

## Part 2: Setup on VPS

### SSH into VPS and Run:

```bash
# Clone repository
cd /var/www
git clone https://github.com/YOUR_USERNAME/primeacademy-backend.git primeacademy_backend

# Navigate to backend
cd primeacademy_backend

# Install dependencies
npm install

# Create .env file
nano .env
# Add your production values (DB credentials, JWT_SECRET, etc.)

# Build
npm run build

# Start with PM2
pm2 start dist/index.js --name backend-api
pm2 save
pm2 startup

# Check status
pm2 list
pm2 logs backend-api
```

## Part 3: Update Workflow

### After Making Changes Locally:

```powershell
cd C:\Users\ADDEAL\Primeacademy\backend
git add .
git commit -m "Description of changes"
git push origin main
```

### Pull Updates on VPS:

```bash
cd /var/www/primeacademy_backend
git pull origin main
npm install
npm run build
pm2 restart backend-api
```

## One-Liner Update Script for VPS

```bash
# Create update script
cat > /var/www/primeacademy_backend/update.sh << 'EOF'
#!/bin/bash
cd /var/www/primeacademy_backend
git pull origin main
npm install
npm run build
pm2 restart backend-api
echo "Update complete!"
EOF

chmod +x /var/www/primeacademy_backend/update.sh

# Then just run:
/var/www/primeacademy_backend/update.sh
```

