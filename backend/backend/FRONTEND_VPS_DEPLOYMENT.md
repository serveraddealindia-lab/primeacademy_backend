# Frontend VPS Deployment Guide

## Step 1: Update Environment Variable Locally

Create `.env.production` file in `frontend/` directory:

```env
VITE_API_BASE_URL=https://api.prashantthakar.com/api
```

## Step 2: Build Frontend Locally (Optional - can also build on VPS)

```bash
cd frontend
npm install
npm run build
```

This creates a `dist/` folder with production-ready files.

## Step 3: Upload to GitHub

```bash
# From project root
git add frontend/.env.production
git add frontend/dist/
git commit -m "feat: update frontend API URL for production"
git push origin main
```

## Step 4: Deploy on VPS

### Option A: Build on VPS (Recommended)

```bash
# SSH into VPS
ssh username@your-vps-ip

# Navigate to project
cd /var/www/Primeacademy

# Pull latest code
git pull origin main

# Navigate to frontend
cd frontend

# Install dependencies (if package.json changed)
npm install

# Create/update .env.production file
echo "VITE_API_BASE_URL=https://api.prashantthakar.com/api" > .env.production

# Build frontend
npm run build

# Copy dist folder to web server directory (nginx/apache)
# For nginx:
sudo cp -r dist/* /var/www/html/
# OR if using a specific directory:
sudo cp -r dist/* /var/www/crm.prashantthakar.com/

# Restart web server
sudo systemctl restart nginx
# OR
sudo systemctl restart apache2
```

### Option B: Upload dist folder directly

If you built locally:

```bash
# From your local machine, upload dist folder
scp -r frontend/dist/* username@your-vps-ip:/var/www/html/
```

## Step 5: Verify

1. Open browser: `https://crm.prashantthakar.com`
2. Open browser console (F12)
3. Check Network tab - API calls should go to `https://api.prashantthakar.com/api`

## Quick One-Liner (VPS)

```bash
cd /var/www/Primeacademy && git pull origin main && cd frontend && echo "VITE_API_BASE_URL=https://api.prashantthakar.com/api" > .env.production && npm install && npm run build && sudo cp -r dist/* /var/www/html/ && sudo systemctl restart nginx
```

## Troubleshooting

### If API calls still go to localhost:
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check `.env.production` file exists and has correct URL
4. Rebuild frontend: `npm run build`

### If build fails:
```bash
# Clear node_modules and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Check environment variable:
```bash
# On VPS, verify the file
cat frontend/.env.production
# Should show: VITE_API_BASE_URL=https://api.prashantthakar.com/api
```


