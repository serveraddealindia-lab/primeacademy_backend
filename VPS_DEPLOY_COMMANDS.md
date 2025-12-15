# VPS Deployment Commands

## Step 1: SSH into VPS
```bash
ssh root@your-vps-ip
# or
ssh your-username@your-vps-ip
```

## Step 2: Navigate to Backend Directory
```bash
cd /path/to/primeacademy_backend
# Common paths:
# cd /var/www/primeacademy_backend
# cd /home/username/primeacademy_backend
# cd ~/primeacademy_backend
```

## Step 3: Pull Latest Code from GitHub
```bash
git pull origin main
```

## Step 4: Install Dependencies (if package.json changed)
```bash
npm install
```

## Step 5: Build TypeScript Code
```bash
npm run build
```

## Step 6: Restart Server

### If using PM2:
```bash
pm2 restart primeacademy-backend
# or
pm2 restart all
```

### If using systemd:
```bash
sudo systemctl restart primeacademy-backend
```

### If running manually:
```bash
# Stop current process (Ctrl+C or kill)
npm start
```

## Complete Deployment Sequence:
```bash
# 1. SSH into VPS
ssh root@your-vps-ip

# 2. Navigate to backend
cd /path/to/primeacademy_backend

# 3. Pull latest code
git pull origin main

# 4. Install dependencies (if needed)
npm install

# 5. Build code
npm run build

# 6. Restart server
pm2 restart primeacademy-backend

# 7. Check logs
pm2 logs primeacademy-backend
```

## Check Server Status:
```bash
pm2 status
pm2 logs primeacademy-backend --lines 50
```

## If Build Fails:
```bash
# Check for errors
npm run build

# Check Node version
node --version
# Should be >= 18.0.0

# Check npm version
npm --version
```

## Verify Rupee Symbol File:
```bash
# Check if rupee files exist
ls -la rupee.*
# Should show: rupee.svg, rupee.jpg, or rupee.png

# If missing, copy from local or download
```

## Check Receipt Generation:
```bash
# Check logs when generating receipt
pm2 logs primeacademy-backend | grep -i rupee
# Should show: "✅ Rupee image loaded successfully"
```

## Troubleshooting:

### If git pull fails:
```bash
git stash
git pull origin main
git stash pop
```

### If npm install fails:
```bash
rm -rf node_modules
npm install
```

### If build fails:
```bash
npm run build
# Check error messages
```

### If PM2 not found:
```bash
npm install -g pm2
pm2 start dist/index.js --name primeacademy-backend
```

