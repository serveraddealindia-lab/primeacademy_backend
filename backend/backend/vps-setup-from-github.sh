#!/bin/bash

# Setup Backend on VPS from GitHub
# Run this on your VPS

echo "=========================================="
echo "SETUP BACKEND ON VPS FROM GITHUB"
echo "=========================================="
echo ""

# Configuration
GITHUB_REPO="https://github.com/YOUR_USERNAME/primeacademy-backend.git"
BACKEND_DIR="/var/www/primeacademy_backend"

echo "Repository: $GITHUB_REPO"
echo "Directory: $BACKEND_DIR"
echo ""

# Check if directory exists
if [ -d "$BACKEND_DIR" ]; then
    echo "⚠ Directory $BACKEND_DIR already exists!"
    echo ""
    read -p "Do you want to: [1] Clone fresh, [2] Pull updates, [3] Cancel? " choice
    
    case $choice in
        1)
            echo "Backing up existing directory..."
            mv "$BACKEND_DIR" "${BACKEND_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
            echo "✓ Backup created"
            ;;
        2)
            echo "Pulling updates..."
            cd "$BACKEND_DIR"
            git pull origin main
            echo "✓ Updated"
            exit 0
            ;;
        3)
            echo "Cancelled"
            exit 0
            ;;
        *)
            echo "Invalid choice"
            exit 1
            ;;
    esac
fi

# Step 1: Clone repository
echo "Step 1: Cloning repository..."
cd /var/www
git clone "$GITHUB_REPO" primeacademy_backend

if [ $? -ne 0 ]; then
    echo "✗ Failed to clone repository"
    echo "Please check:"
    echo "  1. Repository URL is correct"
    echo "  2. You have access to the repository"
    echo "  3. Git is installed: git --version"
    exit 1
fi

echo "✓ Repository cloned"
echo ""

# Step 2: Install dependencies
echo "Step 2: Installing dependencies..."
cd "$BACKEND_DIR"
npm install

if [ $? -ne 0 ]; then
    echo "✗ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"
echo ""

# Step 3: Create .env file
echo "Step 3: Setting up .env file..."
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DB_NAME=primeacademy_db
DB_USER=primeacademy_user
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=3306
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://crm.prashantthakar.com,http://crm.prashantthakar.com
EOF
    echo "✓ .env file created"
    echo ""
    echo "⚠ IMPORTANT: Edit .env file with your actual values:"
    echo "  nano $BACKEND_DIR/.env"
else
    echo "✓ .env file already exists"
fi
echo ""

# Step 4: Build
echo "Step 4: Building backend..."
npm run build

if [ $? -ne 0 ]; then
    echo "✗ Build failed"
    exit 1
fi

echo "✓ Build successful"
echo ""

# Step 5: Setup PM2
echo "Step 5: Setting up PM2..."
pm2 delete backend-api 2>/dev/null
pm2 start dist/index.js --name backend-api
pm2 save

echo "✓ PM2 configured"
echo ""

# Step 6: Check status
echo "Step 6: Checking status..."
pm2 list
echo ""

echo "=========================================="
echo "SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file: nano $BACKEND_DIR/.env"
echo "2. Check logs: pm2 logs backend-api"
echo "3. Test API: curl http://localhost:3001/api/health"
echo ""

