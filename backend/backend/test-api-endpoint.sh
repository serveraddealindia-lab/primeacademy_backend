#!/bin/bash
# Test the API endpoint directly to see what it returns
# Run this on your VPS after setting your API token

API_URL="https://api.prashantthakar.com/api"
# Replace with your actual token
TOKEN="YOUR_TOKEN_HERE"

echo "Testing /api/attendance-reports/all-students endpoint..."
echo ""

curl -X GET "${API_URL}/attendance-reports/all-students" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "Response received. Check the 'data.students' array length above."

