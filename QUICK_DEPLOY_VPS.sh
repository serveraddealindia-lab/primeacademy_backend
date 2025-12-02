#!/bin/bash

# Quick Deploy Script for VPS
# Run this script on your VPS to deploy latest changes

set -e  # Exit on error

echo "🚀 Starting VPS Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration - Update these paths if different
PROJECT_DIR="/var/www/primeacademy"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Check if directories exist
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Project directory not found: $PROJECT_DIR${NC}"
    echo "Please update PROJECT_DIR in the script or create the directory"
    exit 1
fi

# Step 1: Backend Deployment
echo -e "${CYAN}📦 Step 1: Deploying Backend...${NC}"
cd $BACKEND_DIR

echo "  → Pulling latest code..."
git pull origin main || git pull origin upload

echo "  → Installing dependencies..."
npm install

echo "  → Building backend..."
npm run build || echo "  ⚠️  No build script, skipping..."

echo "  → Restarting backend service..."
if command -v pm2 &> /dev/null; then
    pm2 restart all
    echo -e "${GREEN}  ✅ Backend restarted with PM2${NC}"
elif systemctl is-active --quiet primeacademy-backend; then
    sudo systemctl restart primeacademy-backend
    echo -e "${GREEN}  ✅ Backend restarted with systemd${NC}"
else
    echo -e "${YELLOW}  ⚠️  Could not restart backend automatically${NC}"
    echo "  Please restart manually: npm start or pm2 restart all"
fi

# Step 2: Frontend Deployment
echo -e "${CYAN}🎨 Step 2: Deploying Frontend...${NC}"
cd $FRONTEND_DIR

echo "  → Pulling latest code..."
git pull origin main || git pull origin upload

echo "  → Cleaning old build..."
rm -rf dist node_modules .vite

echo "  → Clearing npm cache..."
npm cache clean --force

echo "  → Installing dependencies..."
npm install

echo "  → Building frontend..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed - dist directory not found${NC}"
    exit 1
fi

echo "  → Fixing permissions..."
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist

echo "  → Restarting Nginx..."
sudo systemctl restart nginx

# Step 3: Verification
echo -e "${CYAN}✅ Step 3: Verifying Deployment...${NC}"

echo "  → Checking build files..."
if [ -d "dist/assets" ]; then
    echo "  Latest build files:"
    ls -lth dist/assets/ | head -3
else
    echo -e "${YELLOW}  ⚠️  dist/assets directory not found${NC}"
fi

echo "  → Checking backend status..."
if command -v pm2 &> /dev/null; then
    pm2 status
elif systemctl is-active --quiet primeacademy-backend; then
    echo -e "${GREEN}  ✅ Backend service is running${NC}"
else
    echo -e "${YELLOW}  ⚠️  Could not verify backend status${NC}"
fi

echo "  → Checking Nginx status..."
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}  ✅ Nginx is running${NC}"
else
    echo -e "${RED}  ❌ Nginx is not running${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "  1. Clear browser cache (Ctrl+Shift+Delete)"
echo "  2. Test in incognito/private window"
echo "  3. Check browser console (F12) for errors"
echo "  4. Test payment plan tab in student view"
echo ""
echo "🔍 If payment plan still doesn't work:"
echo "  1. Check browser console for errors"
echo "  2. Check backend logs: pm2 logs or journalctl -u primeacademy-backend"
echo "  3. Run database check: mysql < check-payment-plan-database.sql"
echo ""

