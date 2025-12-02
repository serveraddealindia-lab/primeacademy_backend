# 🔧 Remove Duplicate Location Blocks

## 🔍 Step 1: View Complete File

```bash
# View the ENTIRE file
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com

# Or with line numbers
sudo cat -n /etc/nginx/sites-available/crm.prashantthakar.com

# Or view with less (scrollable)
sudo less /etc/nginx/sites-available/crm.prashantthakar.com
# Press 'q' to quit
```

---

## 🔍 Step 2: Find All Location Blocks

```bash
# Find all location / blocks with line numbers
sudo grep -n "location /" /etc/nginx/sites-available/crm.prashantthakar.com

# Show context around each location / block
sudo grep -n -A 10 "location /" /etc/nginx/sites-available/crm.prashantthakar.com
```

**This will show:**
- Line numbers where each `location /` block starts
- The content of each block

---

## 🔍 Step 3: Identify Which Block Has Headers

```bash
# Find the block with cache headers
sudo grep -n -B 2 -A 10 "add_header Cache-Control" /etc/nginx/sites-available/crm.prashantthakar.com
```

**This shows which location block has the cache headers.**

---

## ✅ Step 4: Edit File Properly

### Option A: Use nano with line numbers

```bash
# Open file
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com

# In nano, press Ctrl+W to search
# Type: location /
# Press Enter
# This will jump to the first location / block

# Navigate with arrow keys to see all blocks
# Use Ctrl+W again to find next occurrence
```

### Option B: Use sed to remove specific lines

**First, identify line numbers:**
```bash
sudo grep -n "location /" /etc/nginx/sites-available/crm.prashantthakar.com
```

**Example output:**
```
15:    location / {
45:    location / {
78:    location / {
120:    location / {
```

**Keep the LAST one (line 120) if it has headers, remove others (15, 45, 78).**

---

## ✅ Step 5: Manual Removal Process

### Method 1: Comment Out Old Blocks

```bash
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

**For each OLD `location /` block (without headers):**
1. Find it (Ctrl+W, search "location /")
2. Add `#` at the start of each line to comment it out
3. Example:
   ```nginx
   # OLD location / block - commented out
   # location / {
   #     try_files $uri $uri/ =404;
   # }
   ```

**Keep the ONE block with cache headers uncommented.**

### Method 2: Delete Old Blocks

**Be careful!** Make a backup first:
```bash
sudo cp /etc/nginx/sites-available/crm.prashantthakar.com /etc/nginx/sites-available/crm.prashantthakar.com.backup
```

Then edit:
```bash
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

**Delete the old `location /` blocks** (the ones without cache headers).

---

## 🎯 Step 6: Final Config Should Look Like This

**For `crm.prashantthakar.com`, you should have ONLY ONE `location /` block:**

```nginx
server {
    listen 443 ssl;
    server_name crm.prashantthakar.com;

    root /var/www/primeacademy_frontend/dist;
    index index.html;

    # SSL certificates (if using HTTPS)
    ssl_certificate /etc/letsencrypt/live/crm.prashantthakar.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.prashantthakar.com/privkey.pem;

    # ONLY ONE location / block with cache headers
    location / {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
        try_files $uri $uri/ /index.html;
    }

    # Other location blocks (for specific files) are OK
    location ~* \.(html|js|css)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🚀 Quick Script to Help

```bash
#!/bin/bash

echo "=== Step 1: All location / blocks ==="
sudo grep -n "location /" /etc/nginx/sites-available/crm.prashantthakar.com

echo ""
echo "=== Step 2: Which one has headers? ==="
sudo grep -n -B 2 -A 10 "add_header Cache-Control" /etc/nginx/sites-available/crm.prashantthakar.com

echo ""
echo "=== Step 3: Full file content ==="
sudo cat -n /etc/nginx/sites-available/crm.prashantthakar.com
```

**Save this as `check_location_blocks.sh`, make it executable, and run it:**
```bash
chmod +x check_location_blocks.sh
./check_location_blocks.sh
```

---

## ✅ Step 7: After Editing

1. **Test config:**
   ```bash
   sudo nginx -t
   ```

2. **If test passes, restart:**
   ```bash
   sudo systemctl restart nginx
   ```

3. **Verify only one location / block remains:**
   ```bash
   sudo nginx -T | grep -A 50 "server_name.*crm.prashantthakar.com" | grep -c "location /"
   ```
   **Should show: 1**

4. **Verify headers appear:**
   ```bash
   curl -I https://crm.prashantthakar.com | grep -i cache
   ```

---

## 🔥 If File Appears Blank in nano

**This might mean:**
1. File is empty or corrupted
2. You're in the wrong directory
3. File permissions issue

**Fix:**
```bash
# Check if file exists and has content
sudo ls -lh /etc/nginx/sites-available/crm.prashantthakar.com

# Check file size (should not be 0)
sudo wc -l /etc/nginx/sites-available/crm.prashantthakar.com

# View file content
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com

# If file is empty, restore from backup or recreate
```

---

## 📋 Summary

1. **View complete file:** `sudo cat /etc/nginx/sites-available/crm.prashantthakar.com`
2. **Find all location blocks:** `sudo grep -n "location /" ...`
3. **Identify which has headers:** `sudo grep -n -A 10 "add_header Cache-Control" ...`
4. **Edit file:** `sudo nano /etc/nginx/sites-available/crm.prashantthakar.com`
5. **Comment out or delete old blocks** (keep only one with headers)
6. **Test and restart:** `sudo nginx -t && sudo systemctl restart nginx`
7. **Verify:** `curl -I https://crm.prashantthakar.com | grep -i cache`

---

## ⚠️ Important Notes

- **Keep ONLY ONE `location /` block** (the one with cache headers)
- **Other location blocks** (like `location ~* \.(html|js|css)$`) are OK to keep
- **Make a backup** before editing: `sudo cp ... .backup`
- **Test before restarting:** `sudo nginx -t`




