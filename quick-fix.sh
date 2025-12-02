#!/bin/bash
# Quick Fix Script for Prime Academy Deployment
# Run this script to fix all deployment issues

set -e  # Exit on error

echo "=========================================="
echo "Prime Academy - Quick Deployment Fix"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="$HOME/primeacademy"

# Check if project exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Project directory not found at $PROJECT_DIR${NC}"
    exit 1
fi

echo "1. Fixing Frontend Environment..."
cd "$PROJECT_DIR/frontend"
echo "VITE_API_BASE_URL=http://api.prashantthakar.com/api" > .env.production
echo -e "${GREEN}✓ Created .env.production${NC}"

echo ""
echo "2. Building Frontend..."
npm run build
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo -e "${GREEN}✓ Frontend built successfully${NC}"
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi

echo ""
echo "3. Copying Frontend to /var/www/crm..."
sudo mkdir -p /var/www/crm
sudo rm -rf /var/www/crm/*
sudo cp -r dist/* /var/www/crm/
sudo chown -R nginx:nginx /var/www/crm
sudo chmod -R 755 /var/www/crm
echo -e "${GREEN}✓ Frontend files copied to /var/www/crm${NC}"

echo ""
echo "4. Fixing Backend Environment..."
cd "$PROJECT_DIR/backend"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found. Please create it manually.${NC}"
    echo "Required: NODE_ENV, PORT, DB_*, FRONTEND_URL, JWT_SECRET"
else
    if ! grep -q "FRONTEND_URL" .env; then
        echo "FRONTEND_URL=http://crm.prashantthakar.com" >> .env
        echo -e "${GREEN}✓ Added FRONTEND_URL to .env${NC}"
    else
        sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=http://crm.prashantthakar.com|' .env
        echo -e "${GREEN}✓ Updated FRONTEND_URL in .env${NC}"
    fi
fi

echo ""
echo "5. Building Backend..."
npm run build
if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✓ Backend built successfully${NC}"
else
    echo -e "${RED}✗ Backend build failed${NC}"
    exit 1
fi

echo ""
echo "6. Setting up Nginx Configurations..."
# Copy nginx configs if they exist
if [ -f "$PROJECT_DIR/nginx-frontend.conf" ]; then
    sudo cp "$PROJECT_DIR/nginx-frontend.conf" /etc/nginx/sites-available/crm.prashantthakar.com
    sudo sed -i 's|root /path/to/your/frontend/dist;|root /var/www/crm;|' /etc/nginx/sites-available/crm.prashantthakar.com
    echo -e "${GREEN}✓ Frontend nginx config copied${NC}"
fi

if [ -f "$PROJECT_DIR/nginx-backend.conf" ]; then
    sudo cp "$PROJECT_DIR/nginx-backend.conf" /etc/nginx/sites-available/api.prashantthakar.com
    echo -e "${GREEN}✓ Backend nginx config copied${NC}"
fi

# Create symlinks
sudo ln -sf /etc/nginx/sites-available/crm.prashantthakar.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api.prashantthakar.com /etc/nginx/sites-enabled/
echo -e "${GREEN}✓ Nginx configs enabled${NC}"

echo ""
echo "7. Testing and Reloading Nginx..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed${NC}"
    exit 1
fi

echo ""
echo "8. Starting Backend with PM2..."
cd "$PROJECT_DIR/backend"
pm2 delete primeacademy-backend 2>/dev/null || true
pm2 start dist/index.js --name primeacademy-backend
pm2 save
echo -e "${GREEN}✓ Backend started with PM2${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Fix Complete!${NC}"
echo "=========================================="
echo ""
echo "Verification commands:"
echo "  pm2 list"
echo "  pm2 logs primeacademy-backend"
echo "  curl http://api.prashantthakar.com/api/health"
echo "  curl -I http://crm.prashantthakar.com"
echo "  sudo tail -f /var/log/nginx/crm.prashantthakar.com.error.log"







