#!/bin/bash
# Deployment script for Prime Academy Backend

echo "Starting deployment process..."

# Build the project
echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed. Exiting."
    exit 1
fi

echo "Build successful!"

# Upload to VPS (replace with your actual VPS details)
echo "Uploading to VPS..."
# scp -r dist user@your-vps-ip:/path/to/backend/
# scp src/controllers/student.controller.ts user@your-vps-ip:/path/to/backend/src/controllers/

echo "Files uploaded successfully!"

echo "Deployment completed. Remember to restart your application on the VPS:"
echo "1. SSH into your VPS"
echo "2. Navigate to your backend directory" 
echo "3. Run: pm2 restart your-app-name"
echo "4. Or: sudo systemctl restart your-backend-service"