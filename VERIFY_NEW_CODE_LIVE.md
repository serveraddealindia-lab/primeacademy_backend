# Verify New Code is Live on Frontend

## ✅ Current Status (From Your Output)
- ✅ Build files: `Nov 28 17:09` (NEW - just built!)
- ✅ Server response: `HTTP/1.1 200 OK` (Working!)
- ✅ Permissions fixed: `www-data:www-data`
- ✅ Nginx restarted

---

## 🔍 Step 1: Verify Server is Serving New Files

```bash
# Check server Last-Modified header
curl -I https://crm.prashantthakar.com | grep Last-Modified

# Should show: Last-Modified: Fri, 28 Nov 2025 17:09:XX GMT
# This should match your build time (17:09)
```

---

## ✅ Step 2: Compare Server vs Local Files

```bash
cd /var/www/primeacademy_frontend

# Get server response
curl -s https://crm.prashantthakar.com > /tmp/server_response.html

# Compare with local file
echo "=== Server HTML (first 50 lines) ==="
head -50 /tmp/server_response.html

echo ""
echo "=== Local HTML (first 50 lines) ==="
head -50 dist/index.html

# They should match!
```

---

## 🎯 Step 3: Check for New Features in Server Response

```bash
# Check if new features are in server response
curl -s https://crm.prashantthakar.com | grep -i "certificate\|batch.*details\|CertificateManagement"

# Should find matches if new code is live

# Compare with local
grep -i "certificate\|batch.*details\|CertificateManagement" dist/index.html
```

---

## 🔍 Step 4: Check File Hashes Match

```bash
cd /var/www/primeacademy_frontend

# Get server response hash
curl -s https://crm.prashantthakar.com | md5sum

# Get local file hash
md5sum dist/index.html

# If hashes match → Server is serving new code ✅
# If hashes don't match → Server is serving old code ❌
```

---

## ✅ Step 5: Complete Verification

Run this complete verification:

```bash
#!/bin/bash
cd /var/www/primeacademy_frontend

echo "=== 1. Build Files Timestamp ==="
ls -lth dist/assets/ | head -3
echo "Files should show: Nov 28 17:09"

echo ""
echo "=== 2. Server Last-Modified ==="
SERVER_TIME=$(curl -I https://crm.prashantthakar.com 2>/dev/null | grep Last-Modified | awk -F': ' '{print $2}')
echo "Server: $SERVER_TIME"
BUILD_TIME=$(stat -c %y dist/index.html | cut -d'.' -f1)
echo "Build:  $BUILD_TIME"
if [[ "$SERVER_TIME" == *"17:09"* ]] || [[ "$SERVER_TIME" == *"17:10"* ]]; then
    echo "✅ Server timestamp matches build time!"
else
    echo "⚠️  Server timestamp doesn't match - might be cached"
fi

echo ""
echo "=== 3. Content Hash Comparison ==="
SERVER_HASH=$(curl -s https://crm.prashantthakar.com | md5sum | awk '{print $1}')
LOCAL_HASH=$(md5sum dist/index.html | awk '{print $1}')
echo "Server hash: $SERVER_HASH"
echo "Local hash:  $LOCAL_HASH"
if [ "$SERVER_HASH" = "$LOCAL_HASH" ]; then
    echo "✅ Hashes match - New code is LIVE!"
else
    echo "❌ Hashes don't match - Server might be serving old code"
fi

echo ""
echo "=== 4. New Features Check ==="
echo "Checking for new features in server response..."
FEATURES_FOUND=$(curl -s https://crm.prashantthakar.com | grep -i "certificate\|batch.*details" | wc -l)
if [ "$FEATURES_FOUND" -gt 0 ]; then
    echo "✅ Found $FEATURES_FOUND references to new features - New code is LIVE!"
else
    echo "⚠️  New features not found - might need browser cache clear"
fi

echo ""
echo "=== 5. Server Status ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://crm.prashantthakar.com)
echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Server is responding correctly"
else
    echo "❌ Server returned error: $HTTP_CODE"
fi

echo ""
echo "=== VERIFICATION SUMMARY ==="
if [ "$SERVER_HASH" = "$LOCAL_HASH" ] && [ "$HTTP_CODE" = "200" ]; then
    echo "✅✅✅ NEW CODE IS LIVE! ✅✅✅"
    echo ""
    echo "If you still see old code in browser:"
    echo "1. Hard refresh: Ctrl+Shift+R"
    echo "2. Clear browser cache"
    echo "3. Use incognito mode"
else
    echo "⚠️  Verification incomplete - check above for issues"
fi
```

---

## 🎯 Quick Verification

Run this quick check:

```bash
cd /var/www/primeacademy_frontend && \
echo "Build time:" && \
stat -c %y dist/index.html && \
echo "" && \
echo "Server Last-Modified:" && \
curl -I https://crm.prashantthakar.com 2>/dev/null | grep Last-Modified && \
echo "" && \
echo "Hash comparison:" && \
echo "Server: $(curl -s https://crm.prashantthakar.com | md5sum)" && \
echo "Local:  $(md5sum dist/index.html)" && \
echo "" && \
echo "New features check:" && \
curl -s https://crm.prashantthakar.com | grep -i "certificate\|batch.*details" && echo "✅ Found!" || echo "⚠️  Not found"
```

---

## ✅ Expected Results

If new code is live, you should see:

- ✅ Build files: `Nov 28 17:09` (matches your build)
- ✅ Server Last-Modified: `17:09:XX GMT` (matches build time)
- ✅ Hashes match: Server and local file have same hash
- ✅ HTTP Status: `200 OK`
- ✅ New features found: Certificate/BatchDetails references in HTML

---

## 🌐 Final Browser Test

1. **Open browser in incognito/private mode**
2. **Visit:** https://crm.prashantthakar.com
3. **Open DevTools (F12)**
4. **Go to Network tab**
5. **Check "Disable cache"**
6. **Reload page (F5)**
7. **Check:**
   - Page loads without errors
   - New features are accessible
   - Certificate Management page works (if you have access)
   - Batch Details page works

---

## 📝 Summary

**Based on your output:**
- ✅ Build completed: `Nov 28 17:09`
- ✅ Server responding: `HTTP/1.1 200 OK`
- ✅ Permissions fixed
- ✅ Nginx restarted

**To confirm new code is live:**
1. Check server Last-Modified matches build time (17:09)
2. Compare hashes (server vs local)
3. Check for new features in HTML
4. Test in browser with hard refresh

**Run the verification script above to get complete confirmation!**




