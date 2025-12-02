#!/bin/bash

# Quick Deployment Script for Prime Academy CRM
# Run this script on your VPS after uploading the files

set -e

echo "🚀 Starting Prime Academy CRM Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}Step 1: Installing system dependencies...${NC}"
apt update && apt upgrade -y
apt install -y nodejs npm mysql-server nginx git

echo -e "${YELLOW}Step 2: Installing PM2...${NC}"
npm install -g pm2

echo -e "${YELLOW}Step 3: Setting up backend...${NC}"
cd backend
npm install
npm run build

echo -e "${YELLOW}Step 4: Creating required directories...${NC}"
mkdir -p uploads/general uploads/attendance orientations receipts certificates
chmod -R 755 uploads orientations receipts certificates

echo -e "${YELLOW}Step 5: Backend setup complete!${NC}"
echo -e "${GREEN}✅ Backend is ready${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Create .env file in backend directory with your configuration"
echo "2. Set up MySQL database and user"
echo "3. Run database migrations"
echo "4. Copy orientation PDFs to backend/orientations/"
echo "5. Start backend with: pm2 start dist/index.js --name primeacademy-backend"
echo "6. Build frontend: cd ../frontend && npm install && npm run build"
echo "7. Configure Nginx (see DEPLOYMENT_GUIDE.md)"
echo ""
echo -e "${GREEN}For detailed instructions, see DEPLOYMENT_GUIDE.md${NC}"


