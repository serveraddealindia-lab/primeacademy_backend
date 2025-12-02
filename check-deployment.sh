#!/bin/bash

echo "=========================================="
echo "Prime Academy Deployment Check"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "primeacademy" ]; then
    echo -e "${YELLOW}Note: primeacademy directory not found in current location${NC}"
    echo "Current directory: $(pwd)"
    echo ""
fi

echo "1. Checking Project Structure..."
echo "-----------------------------------"
if [ -d "primeacademy" ]; then
    cd primeacademy
    echo -e "${GREEN}✓ Found primeacademy directory${NC}"
    echo "Structure:"
    ls -la
    echo ""
else
    echo -e "${RED}✗ primeacademy directory not found${NC}"
    echo "Please navigate to the directory containing primeacademy"
    exit 1
fi

echo ""
echo "2. Checking Backend..."
echo "-----------------------------------"
if [ -d "backend" ]; then
    echo -e "${GREEN}✓ Backend directory exists${NC}"
    cd backend
    
    # Check if .env exists
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓ .env file exists${NC}"
        # Check for important variables (without showing values)
        if grep -q "FRONTEND_URL" .env; then
            echo -e "${GREEN}✓ FRONTEND_URL is set${NC}"
        else
            echo -e "${RED}✗ FRONTEND_URL not found in .env${NC}"
        fi
        
        if grep -q "PORT" .env; then
            echo -e "${GREEN}✓ PORT is set${NC}"
        else
            echo -e "${YELLOW}⚠ PORT not found in .env (will use default 3000)${NC}"
        fi
    else
        echo -e "${RED}✗ .env file not found${NC}"
    fi
    
    # Check if dist exists
    if [ -d "dist" ]; then
        echo -e "${GREEN}✓ Backend dist directory exists${NC}"
        if [ -f "dist/index.js" ]; then
            echo -e "${GREEN}✓ Backend is built${NC}"
        else
            echo -e "${RED}✗ dist/index.js not found - backend needs to be built${NC}"
        fi
    else
        echo -e "${RED}✗ Backend dist directory not found - needs build${NC}"
    fi
    
    cd ..
else
    echo -e "${RED}✗ Backend directory not found${NC}"
fi

echo ""
echo "3. Checking Frontend..."
echo "-----------------------------------"
if [ -d "frontend" ]; then
    echo -e "${GREEN}✓ Frontend directory exists${NC}"
    cd frontend
    
    # Check for .env.production
    if [ -f ".env.production" ]; then
        echo -e "${GREEN}✓ .env.production file exists${NC}"
        if grep -q "VITE_API_BASE_URL" .env.production; then
            echo -e "${GREEN}✓ VITE_API_BASE_URL is set${NC}"
            echo "  Value: $(grep VITE_API_BASE_URL .env.production)"
        else
            echo -e "${RED}✗ VITE_API_BASE_URL not found in .env.production${NC}"
        fi
    else
        echo -e "${RED}✗ .env.production file not found${NC}"
    fi
    
    # Check if dist exists
    if [ -d "dist" ]; then
        echo -e "${GREEN}✓ Frontend dist directory exists${NC}"
        if [ -f "dist/index.html" ]; then
            echo -e "${GREEN}✓ Frontend is built${NC}"
            echo "  Dist size: $(du -sh dist | cut -f1)"
        else
            echo -e "${RED}✗ dist/index.html not found${NC}"
        fi
    else
        echo -e "${RED}✗ Frontend dist directory not found - needs build${NC}"
    fi
    
    cd ..
else
    echo -e "${RED}✗ Frontend directory not found${NC}"
fi

echo ""
echo "4. Checking PM2 (Backend Process)..."
echo "-----------------------------------"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✓ PM2 is installed${NC}"
    echo ""
    pm2 list
    echo ""
    if pm2 list | grep -q "primeacademy-backend"; then
        echo -e "${GREEN}✓ Backend process is running${NC}"
        echo ""
        echo "Recent logs:"
        pm2 logs primeacademy-backend --lines 10 --nostream
    else
        echo -e "${RED}✗ Backend process not found in PM2${NC}"
        echo "  Run: cd backend && pm2 start dist/index.js --name primeacademy-backend"
    fi
else
    echo -e "${RED}✗ PM2 not installed${NC}"
fi

echo ""
echo "5. Checking Nginx Configuration..."
echo "-----------------------------------"
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✓ Nginx is installed${NC}"
    
    # Check if configs exist
    if [ -f "/etc/nginx/sites-available/crm.prashantthakar.com" ]; then
        echo -e "${GREEN}✓ Frontend nginx config exists${NC}"
    else
        echo -e "${RED}✗ Frontend nginx config not found${NC}"
        echo "  Expected: /etc/nginx/sites-available/crm.prashantthakar.com"
    fi
    
    if [ -f "/etc/nginx/sites-available/api.prashantthakar.com" ]; then
        echo -e "${GREEN}✓ Backend nginx config exists${NC}"
    else
        echo -e "${RED}✗ Backend nginx config not found${NC}"
        echo "  Expected: /etc/nginx/sites-available/api.prashantthakar.com"
    fi
    
    # Check if symlinks exist
    if [ -L "/etc/nginx/sites-enabled/crm.prashantthakar.com" ]; then
        echo -e "${GREEN}✓ Frontend nginx config is enabled${NC}"
    else
        echo -e "${RED}✗ Frontend nginx config not enabled${NC}"
        echo "  Run: sudo ln -s /etc/nginx/sites-available/crm.prashantthakar.com /etc/nginx/sites-enabled/"
    fi
    
    if [ -L "/etc/nginx/sites-enabled/api.prashantthakar.com" ]; then
        echo -e "${GREEN}✓ Backend nginx config is enabled${NC}"
    else
        echo -e "${RED}✗ Backend nginx config not enabled${NC}"
        echo "  Run: sudo ln -s /etc/nginx/sites-available/api.prashantthakar.com /etc/nginx/sites-enabled/"
    fi
    
    # Check nginx status
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓ Nginx is running${NC}"
    else
        echo -e "${RED}✗ Nginx is not running${NC}"
        echo "  Run: sudo systemctl start nginx"
    fi
    
    # Test nginx config
    echo ""
    echo "Testing nginx configuration:"
    sudo nginx -t 2>&1
else
    echo -e "${RED}✗ Nginx not installed${NC}"
fi

echo ""
echo "6. Checking Network Connectivity..."
echo "-----------------------------------"
# Check if backend port is listening
if netstat -tlnp 2>/dev/null | grep -q ":3000"; then
    echo -e "${GREEN}✓ Port 3000 is listening (backend)${NC}"
    netstat -tlnp 2>/dev/null | grep ":3000"
else
    echo -e "${RED}✗ Port 3000 is not listening${NC}"
    echo "  Backend might not be running"
fi

echo ""
echo "7. Checking Domain Resolution..."
echo "-----------------------------------"
# Try to resolve domains
if host crm.prashantthakar.com &> /dev/null; then
    echo -e "${GREEN}✓ crm.prashantthakar.com resolves${NC}"
    host crm.prashantthakar.com | head -1
else
    echo -e "${YELLOW}⚠ Could not resolve crm.prashantthakar.com${NC}"
fi

if host api.prashantthakar.com &> /dev/null; then
    echo -e "${GREEN}✓ api.prashantthakar.com resolves${NC}"
    host api.prashantthakar.com | head -1
else
    echo -e "${YELLOW}⚠ Could not resolve api.prashantthakar.com${NC}"
fi

echo ""
echo "=========================================="
echo "Check Complete"
echo "=========================================="







