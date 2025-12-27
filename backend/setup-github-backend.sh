#!/bin/bash

# Setup Backend on GitHub and VPS
# Run this script in sections

echo "=========================================="
echo "GITHUB SETUP FOR BACKEND"
echo "=========================================="
echo ""

# Check if we're in backend directory
if [ ! -f "package.json" ]; then
    echo "✗ Error: Not in backend directory!"
    echo "Please run: cd backend"
    exit 1
fi

echo "Current directory: $(pwd)"
echo ""

# Step 1: Initialize Git
echo "Step 1: Initializing Git..."
if [ ! -d ".git" ]; then
    git init
    echo "✓ Git initialized"
else
    echo "✓ Git already initialized"
fi
echo ""

# Step 2: Create .gitignore
echo "Step 2: Creating .gitignore..."
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build output
dist/
build/

# Environment variables
.env
.env.local
.env.production
.env.development

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Uploads
uploads/*
!uploads/.gitkeep

# Database
*.sql
*.db

# Temporary files
tmp/
temp/
EOF
    echo "✓ .gitignore created"
else
    echo "✓ .gitignore already exists"
fi
echo ""

# Step 3: Add and commit
echo "Step 3: Adding files and creating commit..."
git add .
git commit -m "Initial commit: Prime Academy Backend" 2>/dev/null || echo "⚠ Files already committed or no changes"
echo ""

# Step 4: Check remote
echo "Step 4: Checking Git remote..."
if git remote | grep -q "origin"; then
    echo "✓ Remote 'origin' already exists:"
    git remote -v
else
    echo "⚠ No remote configured"
    echo ""
    echo "To add GitHub remote, run:"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/primeacademy-backend.git"
    echo ""
    echo "Then push with:"
    echo "  git branch -M main"
    echo "  git push -u origin main"
fi
echo ""

echo "=========================================="
echo "NEXT STEPS:"
echo "=========================================="
echo ""
echo "1. Create repository on GitHub:"
echo "   - Go to https://github.com/new"
echo "   - Name: primeacademy-backend"
echo "   - Don't initialize with README"
echo ""
echo "2. Add remote and push:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/primeacademy-backend.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""

