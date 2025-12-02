# 🔴 Fix: Multiple Location Blocks Issue

## ❌ Problem Identified

**From your config snippet:**
- Multiple `location /` blocks exist
- Only the **LAST** `location /` block applies
- The block with cache headers might not be the last one!

---

## ✅ Solution: Check What Nginx Actually Uses

### Step 1: See ALL Location Blocks Nginx Uses

```bash
sudo nginx -T | grep -B 5 -A 10 "location /"
```

**This shows ALL `location /` blocks from the ACTUAL config Nginx is using.**

**Look for:**
- How many `location /` blocks exist?
- Which one is LAST?
- Does the LAST one have cache headers?

---

## ✅ Solution 2: Find the Server Block for crm.prashantthakar.com

```bash
sudo nginx -T | grep -A 50 "server_name.*crm.prashantthakar.com"
```

**This shows the complete server block for your domain.**

**Look for:**
- All `location /` blocks within this server block
- Which one is last?
- Does it have cache headers?

---

## ✅ Solution 3: Remove Duplicate Location Blocks

If there are multiple `location /` blocks, you need to:

1. **Keep only ONE `location /` block** (the one with cache headers)
2. **Remove or comment out** the others

```bash
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

**Find all `location / {` blocks and:**
- Keep the one with cache headers
- Comment out or delete the others

**Example:**
```nginx
# OLD location / block (comment out)
# location / {
#     try_files $uri $uri/ =404;
# }

# NEW location / block (with cache headers)
location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;
    try_files $uri $uri/ /index.html;
}
```

---

## ✅ Solution 4: Check for Default Server Block

```bash
sudo nginx -T | grep -B 5 -A 20 "server_name _"
```

**If there's a `server_name _;` (default server), it might be catching requests first!**

**Fix:** Make sure your `crm.prashantthakar.com` server block comes BEFORE the default server, or remove the default server.

---

## 🚀 Complete Fix Sequence

### Step 1: See What Nginx Actually Uses
```bash
sudo nginx -T | grep -A 50 "server_name.*crm.prashantthakar.com"
```

### Step 2: Count Location Blocks
```bash
sudo nginx -T | grep -A 50 "server_name.*crm.prashantthakar.com" | grep -c "location /"
```

### Step 3: See All Location Blocks
```bash
sudo nginx -T | grep -A 50 "server_name.*crm.prashantthakar.com" | grep -B 2 -A 10 "location /"
```

### Step 4: Edit Config to Keep Only One Location Block
```bash
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

**Keep only ONE `location /` block with cache headers, remove/comment others.**

### Step 5: Test and Restart
```bash
sudo nginx -t && sudo systemctl restart nginx
```

### Step 6: Verify Headers Now Appear
```bash
curl -I https://crm.prashantthakar.com | grep -i cache
```

---

## 🔍 Additional Issue: Backend Connection Refused

**From error logs:**
- `connect() failed (111: Connection refused) while connecting to upstream http://127.0.0.1:3000`
- This is for `api.prashantthakar.com` (backend)

**This is a separate issue** but needs fixing:
```bash
# Check if backend is running
pm2 list

# If not running, start it
cd /var/www/primeacademy_backend
pm2 start src/index.ts --name primeacademy-backend --interpreter tsx
```

---

## 📋 Quick Diagnostic

Run this to see everything:

```bash
echo "=== Server Block for crm.prashantthakar.com ==="
sudo nginx -T | grep -A 50 "server_name.*crm.prashantthakar.com"

echo ""
echo "=== All Location / Blocks ==="
sudo nginx -T | grep -B 2 -A 10 "location /"

echo ""
echo "=== Count of Location / Blocks ==="
sudo nginx -T | grep -c "location /"
```

---

## ✅ Expected Result

After keeping only ONE `location /` block with cache headers:
- Headers will appear ✅
- Browser won't cache ✅
- New code will show ✅

---

## 🎯 Summary

**Problem:** Multiple `location /` blocks - only last one applies, and it might not have headers.

**Solution:** Keep only ONE `location /` block with cache headers, remove others.

**Also fix:** Backend connection refused (separate issue).




