#!/bin/bash

# Script to test API response and check if JSON fields are parsed correctly
# Usage: ./test-api-response.sh USER_ID TOKEN

USER_ID=$1
TOKEN=$2

if [ -z "$USER_ID" ] || [ -z "$TOKEN" ]; then
    echo "Usage: ./test-api-response.sh USER_ID TOKEN"
    echo "Get TOKEN from browser DevTools > Network > Request Headers > Authorization"
    exit 1
fi

echo "Testing API for User ID: $USER_ID"
echo "=================================="
echo ""

# Test the API
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.prashantthakar.com/api/users/$USER_ID)

echo "Full Response:"
echo "$RESPONSE" | jq '.'
echo ""

# Check if documents is a string or object
DOCUMENTS_TYPE=$(echo "$RESPONSE" | jq -r '.data.user.facultyProfile.documents | type' 2>/dev/null)
if [ "$DOCUMENTS_TYPE" = "string" ]; then
    echo "❌ ERROR: documents field is a STRING (not parsed)"
    echo "   Backend needs to parse this JSON string"
elif [ "$DOCUMENTS_TYPE" = "object" ]; then
    echo "✅ SUCCESS: documents field is an OBJECT (correctly parsed)"
else
    echo "⚠️  WARNING: documents field type is: $DOCUMENTS_TYPE"
fi

# Check expertise
EXPERTISE_TYPE=$(echo "$RESPONSE" | jq -r '.data.user.facultyProfile.expertise | type' 2>/dev/null)
if [ "$EXPERTISE_TYPE" = "string" ]; then
    EXPERTISE_VALUE=$(echo "$RESPONSE" | jq -r '.data.user.facultyProfile.expertise' 2>/dev/null)
    if [[ "$EXPERTISE_VALUE" =~ ^\{.*\}$ ]]; then
        echo "❌ ERROR: expertise is a JSON STRING (needs parsing)"
    else
        echo "✅ expertise is a plain string (OK)"
    fi
elif [ "$EXPERTISE_TYPE" = "object" ]; then
    echo "✅ expertise is an object (OK)"
fi

# Check employee address
ADDRESS=$(echo "$RESPONSE" | jq -r '.data.user.employeeProfile.address' 2>/dev/null)
if [ -n "$ADDRESS" ] && [ "$ADDRESS" != "null" ]; then
    echo "✅ Employee address found: $ADDRESS"
else
    echo "❌ Employee address is missing or null"
fi

echo ""
echo "Profile Data Preview:"
echo "$RESPONSE" | jq '.data.user.facultyProfile // .data.user.employeeProfile' 2>/dev/null

