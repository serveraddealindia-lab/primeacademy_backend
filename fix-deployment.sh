#!/bin/bash

echo "=========================================="
echo "Prime Academy Deployment Fix Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get the project path
PROJECT_PATH=""
if [ -d "primeacademy" ]; then
    PROJECT_PATH="$(pwd)/primeacademy"
elif [ -d "$HOME/primeacademy" ]; then
    PROJECT_PATH="$HOME/primeacademy"
else
    echo "Please navigate to the directory containing primeacademy or run from home directory"
    exit 1
fi

echo "Project path: $PROJECT_PATH"
echo ""

# 1. Fix Frontend Environment
echo "1. Fixing Frontend Environment..."
echo "-----------------------------------"
cd "$PROJECT_PATH/frontend"

if [ ! -f ".env.production" ]; then
    echo "Creating .env.production..."
    cat > .env.production << EOF
VITE_API_BASE_URL=http://api.prashantthakar.com/api
EOF
    echo -e "${GREEN}✓ Created .env.production${NC}"
else
    if ! grep -q "VITE_API_BASE_URL" .env.production; then
        echo "Adding VITE_API_BASE_URL to .env.production..."
        echo "VITE_API_BASE_URL=http://api.prashantthakar.com/api" >> .env.production
        echo -e "${GREEN}✓ Added VITE_API_BASE_URL${NC}"
    else
        echo "Updating VITE_API_BASE_URL in .env.production..."
        sed -i 's|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://api.prashantthakar.com/api|' .env.production
        echo -e "${GREEN}✓ Updated .env.production${NC}"
    fi
fi

echo ""
echo "2. Rebuilding Frontend..."
echo "-----------------------------------"
if command -v npm &> /dev/null; then
    npm run build
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend built successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Frontend build had errors${NC}"
    fi
else
    echo -e "${YELLOW}⚠ npm not found, skipping build${NC}"
fi

echo ""
echo "3. Fixing Backend Environment..."
echo "-----------------------------------"
cd "$PROJECT_PATH/backend"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found. Please create it manually.${NC}"
    echo "Required variables:"
    echo "  NODE_ENV=production"
    echo "  PORT=3000"
    echo "  FRONTEND_URL=http://crm.prashantthakar.com"
    echo "  DB_HOST=localhost"
    echo "  DB_NAME=primeacademy_db"
    echo "  DB_USER=your_db_user"
    echo "  DB_PASSWORD=your_db_password"
    echo "  JWT_SECRET=your_jwt_secret"
else
    if ! grep -q "FRONTEND_URL" .env; then
        echo "Adding FRONTEND_URL to .env..."
        echo "FRONTEND_URL=http://crm.prashantthakar.com" >> .env
        echo -e "${GREEN}✓ Added FRONTEND_URL${NC}"
    else
        echo "Updating FRONTEND_URL in .env..."
        sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=http://crm.prashantthakar.com|' .env
        echo -e "${GREEN}✓ Updated .env${NC}"
    fi
fi

echo ""
echo "4. Rebuilding Backend..."
echo "-----------------------------------"
if command -v npm &> /dev/null; then
    npm run build
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backend built successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Backend build had errors${NC}"
    fi
else
    echo -e "${YELLOW}⚠ npm not found, skipping build${NC}"
fi

echo ""
echo "5. Setting up Nginx Configs..."
echo "-----------------------------------"
echo "Copying nginx configs..."

# Find nginx configs in project
if [ -f "$PROJECT_PATH/nginx-frontend.conf" ]; then
    sudo cp "$PROJECT_PATH/nginx-frontend.conf" /etc/nginx/sites-available/crm.prashantthakar.com
    
    # Update root path in config
    FRONTEND_DIST="$PROJECT_PATH/frontend/dist"
    sudo sed -i "s|root /path/to/your/frontend/dist;|root $FRONTEND_DIST;|" /etc/nginx/sites-available/crm.prashantthakar.com
    
    echo -e "${GREEN}✓ Frontend nginx config copied${NC}"
else
    echo -e "${YELLOW}⚠ nginx-frontend.conf not found in project${NC}"
fi

if [ -f "$PROJECT_PATH/nginx-backend.conf" ]; then
    sudo cp "$PROJECT_PATH/nginx-backend.conf" /etc/nginx/sites-available/api.prashantthakar.com
    echo -e "${GREEN}✓ Backend nginx config copied${NC}"
else
    echo -e "${YELLOW}⚠ nginx-backend.conf not found in project${NC}"
fi

# Create symlinks
if [ ! -L "/etc/nginx/sites-enabled/crm.prashantthakar.com" ]; then
    sudo ln -s /etc/nginx/sites-available/crm.prashantthakar.com /etc/nginx/sites-enabled/
    echo -e "${GREEN}✓ Frontend nginx config enabled${NC}"
fi

if [ ! -L "/etc/nginx/sites-enabled/api.prashantthakar.com" ]; then
    sudo ln -s /etc/nginx/sites-available/api.prashantthakar.com /etc/nginx/sites-enabled/
    echo -e "${GREEN}✓ Backend nginx config enabled${NC}"
fi

echo ""
echo "6. Testing Nginx Configuration..."
echo "-----------------------------------"
sudo nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
    echo "Reloading nginx..."
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
else
    echo -e "${YELLOW}⚠ Nginx configuration has errors - please fix manually${NC}"
fi

echo ""
echo "7. Restarting Backend with PM2..."
echo "-----------------------------------"
if command -v pm2 &> /dev/null; then
    cd "$PROJECT_PATH/backend"
    
    # Stop existing process if running
    pm2 delete primeacademy-backend 2>/dev/null
    
    # Start new process
    pm2 start dist/index.js --name primeacademy-backend
    pm2 save
    
    echo -e "${GREEN}✓ Backend restarted with PM2${NC}"
    echo ""
    pm2 list
else
    echo -e "${YELLOW}⚠ PM2 not found${NC}"
fi

echo ""
echo "=========================================="
echo "Fix Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check backend logs: pm2 logs primeacademy-backend"
echo "2. Test frontend: curl http://crm.prashantthakar.com"
echo "3. Test backend: curl http://api.prashantthakar.com/api/health"
echo "4. Check nginx logs if issues persist:"
echo "   - sudo tail -f /var/log/nginx/crm.prashantthakar.com.error.log"
echo "   - sudo tail -f /var/log/nginx/api.prashantthakar.com.error.log"







