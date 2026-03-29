#!/bin/bash
# Complete Deployment Script for Prime Academy
# This script deploys all fixes to live server via Git

echo "🚀 Starting Complete Deployment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BACKEND_REPO="https://github.com/serveraddealindia-lab/primeacademy_backend.git"
FRONTEND_REPO="https://github.com/serveraddealindia-lab/primeacademy_frontend.git"
BACKEND_PATH="/var/www/primeacademy_backend"
FRONTEND_PATH="/var/www/primeacademy_frontend/frontend"

echo -e "${YELLOW}Step 1: Deploy Backend${NC}"
echo "======================================"

cd $BACKEND_PATH || exit 1

# Pull latest code
echo "Pulling latest backend code..."
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to pull backend code!${NC}"
    exit 1
fi

# Install dependencies
echo "Installing backend dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install backend dependencies!${NC}"
    exit 1
fi

# Build TypeScript
echo "Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Backend build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend build successful${NC}"
echo ""

# Restart PM2
echo "Restarting backend server..."
pm2 restart primeacademy-backend

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to restart backend!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend restarted successfully${NC}"
echo ""

echo -e "${YELLOW}Step 2: Deploy Frontend${NC}"
echo "======================================"

cd $FRONTEND_PATH || exit 1

# Pull latest code
echo "Pulling latest frontend code..."
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to pull frontend code!${NC}"
    exit 1
fi

# Install dependencies
echo "Installing frontend dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install frontend dependencies!${NC}"
    exit 1
fi

# Build production version
echo "Building frontend for production..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Frontend build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend build successful${NC}"
echo ""

echo -e "${YELLOW}Step 3: Verify Deployment${NC}"
echo "======================================"

# Check backend status
echo "Checking backend status..."
pm2 status primeacademy-backend

# Test backend endpoint
echo ""
echo "Testing backend API..."
curl -s http://localhost:3001/api/health | head -20

echo ""
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Open browser: https://crm.prashantthakar.com"
echo "2. Test Batch Details report"
echo "3. Test Faculty Occupancy report"
echo "4. Check Users page for employees"
echo ""
echo "Backend logs: pm2 logs primeacademy-backend"
echo "Frontend logs: tail -f /var/log/nginx/error.log"
echo ""
