#!/bin/bash
# Complete Fix Script for AlmaLinux VPS
# This script handles the different nginx structure on AlmaLinux

set -e

echo "=========================================="
echo "Prime Academy - Complete Deployment Fix"
echo "For AlmaLinux (nginx in conf.d)"
echo "=========================================="
echo ""

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
if ! npm run build; then
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend built successfully${NC}"

echo ""
echo "3. Copying Frontend to /var/www/crm..."
sudo mkdir -p /var/www/crm
sudo rm -rf /var/www/crm/*
sudo cp -r dist/* /var/www/crm/
sudo chown -R nginx:nginx /var/www/crm
sudo chmod -R 755 /var/www/crm
echo -e "${GREEN}✓ Frontend files copied${NC}"

echo ""
echo "4. Fixing Backend Environment..."
cd "$PROJECT_DIR/backend"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating template...${NC}"
    cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://crm.prashantthakar.com
DB_HOST=localhost
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=root
DB_PASSWORD=
JWT_SECRET=change_this_to_a_secure_random_string
ENVEOF
    echo -e "${YELLOW}⚠ Please edit .env and add your database credentials${NC}"
else
    if ! grep -q "FRONTEND_URL" .env; then
        echo "FRONTEND_URL=http://crm.prashantthakar.com" >> .env
        echo -e "${GREEN}✓ Added FRONTEND_URL${NC}"
    else
        sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=http://crm.prashantthakar.com|' .env
        echo -e "${GREEN}✓ Updated FRONTEND_URL${NC}"
    fi
fi

echo ""
echo "5. Building Backend..."
if ! npm run build; then
    echo -e "${RED}✗ Backend build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend built successfully${NC}"

echo ""
echo "6. Creating Nginx Configurations (AlmaLinux style)..."
# Create frontend config
sudo tee /etc/nginx/conf.d/crm.prashantthakar.com.conf > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name crm.prashantthakar.com;
    root /var/www/crm;
    index index.html;
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    access_log /var/log/nginx/crm.prashantthakar.com.access.log;
    error_log /var/log/nginx/crm.prashantthakar.com.error.log;
}
NGINXEOF
echo -e "${GREEN}✓ Frontend nginx config created${NC}"

# Create backend config
sudo tee /etc/nginx/conf.d/api.prashantthakar.com.conf > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name api.prashantthakar.com;
    client_max_body_size 50M;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    access_log /var/log/nginx/api.prashantthakar.com.access.log;
    error_log /var/log/nginx/api.prashantthakar.com.error.log;
}
NGINXEOF
echo -e "${GREEN}✓ Backend nginx config created${NC}"

echo ""
echo "7. Testing and Reloading Nginx..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed${NC}"
    echo "Check the error above and fix manually"
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
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Verification:"
echo "  pm2 list"
echo "  pm2 logs primeacademy-backend --lines 20"
echo "  curl http://api.prashantthakar.com/api/health"
echo "  curl -I http://crm.prashantthakar.com"
echo "  ls -la /var/www/crm"
echo ""







