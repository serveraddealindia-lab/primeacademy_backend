#!/bin/bash

# Quick Fix: Add Cache Headers to location / block

CONFIG_FILE="/etc/nginx/sites-available/crm.prashantthakar.com"

echo "=== Step 1: View Complete Config ==="
sudo cat -n "$CONFIG_FILE"
echo ""
echo "=== Step 2: Check if location / block exists ==="
sudo grep -n "location /" "$CONFIG_FILE" || echo "location / block not found!"
echo ""
echo "=== Step 3: View location / block context ==="
sudo grep -A 5 "location /" "$CONFIG_FILE" || echo "location / block not found!"
echo ""
echo "=== Step 4: Manual Edit Required ==="
echo "Run: sudo nano $CONFIG_FILE"
echo "Find 'location / {' block"
echo "Add these 3 lines BEFORE 'try_files':"
echo "    add_header Cache-Control \"no-cache, no-store, must-revalidate, max-age=0\";"
echo "    add_header Pragma \"no-cache\";"
echo "    add_header Expires \"0\";"
echo ""
echo "=== Step 5: After editing, run ==="
echo "sudo nginx -t && sudo systemctl restart nginx"
echo ""
echo "=== Step 6: Verify ==="
echo "curl -I https://crm.prashantthakar.com | grep Cache-Control"




