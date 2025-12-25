#!/bin/bash

# Upload batch.controller.ts to VPS
# Run this from your LOCAL machine (Windows PowerShell or Git Bash)

echo "=========================================="
echo "UPLOAD batch.controller.ts TO VPS"
echo "=========================================="
echo ""

# Replace these with your actual VPS details
VPS_USER="root"  # Change if different
VPS_HOST="your-vps-ip-or-domain"  # Change to your VPS IP or domain
VPS_BACKEND_PATH="/var/www/primeacademy_backend"

echo "Step 1: Upload the file using SCP"
echo ""
echo "Run this command from your LOCAL machine (in PowerShell or Git Bash):"
echo ""
echo "scp backend/src/controllers/batch.controller.ts ${VPS_USER}@${VPS_HOST}:${VPS_BACKEND_PATH}/src/controllers/batch.controller.ts"
echo ""
echo "OR if you're in the Primeacademy directory:"
echo ""
echo "scp backend/src/controllers/batch.controller.ts ${VPS_USER}@${VPS_HOST}:${VPS_BACKEND_PATH}/src/controllers/batch.controller.ts"
echo ""
echo "=========================================="
echo "After uploading, run these commands on VPS:"
echo "=========================================="
echo ""
echo "ssh ${VPS_USER}@${VPS_HOST}"
echo "cd ${VPS_BACKEND_PATH}"
echo "npm run build"
echo "pm2 restart backend-api"
echo "pm2 logs backend-api"
echo ""

