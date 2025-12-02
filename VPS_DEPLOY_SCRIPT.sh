#!/bin/bash

# VPS Deployment Script for Prime Academy CRM
# This script clones from GitHub and sets up the application on VPS

set -e

echo "🚀 Deploying Prime Academy CRM from GitHub to VPS..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Repository URLs
BACKEND_REPO="https://github.com/serveraddealindia-lab/primeacademy_backend.git"
FRONTEND_REPO="https://github.com/serveraddealindia-lab/primeacademy_frontend.git"

# Project directory
PROJECT_DIR="/var/www/primeacademy"

echo -e "${CYAN}Step 1: Creating project directory...${NC}"
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR
cd $PROJECT_DIR

echo -e "${CYAN}Step 2: Cloning Backend repository...${NC}"
if [ -d "backend" ]; then
    echo -e "${YELLOW}Backend directory exists. Pulling latest changes...${NC}"
    cd backend
    git pull origin main
    cd ..
else
    git clone $BACKEND_REPO backend
fi

echo -e "${CYAN}Step 3: Cloning Frontend repository...${NC}"
if [ -d "frontend" ]; then
    echo -e "${YELLOW}Frontend directory exists. Pulling latest changes...${NC}"
    cd frontend
    git pull origin main
    cd ..
else
    git clone $FRONTEND_REPO frontend
fi

echo -e "${CYAN}Step 4: Setting up Backend...${NC}"
cd backend

# Install dependencies
echo "Installing backend dependencies..."
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Create required directories
echo "Creating required directories..."
mkdir -p uploads/general uploads/attendance orientations receipts certificates
chmod -R 755 uploads orientations receipts certificates

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Please create it with your configuration.${NC}"
    echo "Copy .env.example to .env and update with your settings:"
    echo "  cp .env.example .env"
    echo "  nano .env"
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

echo -e "${CYAN}Step 5: Setting up Frontend...${NC}"
cd ../frontend

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Frontend .env file not found. Creating from template...${NC}"
    echo "VITE_API_BASE_URL=https://yourdomain.com" > .env
    echo "Please update frontend/.env with your actual domain"
else
    echo -e "${GREEN}✅ Frontend .env file found${NC}"
fi

# Build frontend
echo "Building frontend..."
npm run build

echo ""
echo -e "${GREEN}✅ Code deployment complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure backend/.env with your database and settings"
echo "2. Configure frontend/.env with your API URL"
echo "3. Copy orientation PDFs to backend/orientations/"
echo "4. Run database migrations"
echo "5. Start backend with PM2: pm2 start backend/dist/index.js --name primeacademy-backend"
echo "6. Configure Nginx (see GITHUB_DEPLOYMENT_GUIDE.md)"
echo "7. Install SSL certificate"
echo ""
echo -e "${CYAN}For detailed instructions, see GITHUB_DEPLOYMENT_GUIDE.md${NC}"


