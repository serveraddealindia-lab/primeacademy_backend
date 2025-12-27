# Fix Nginx Configuration Error

## Error Message
```
"location" directive is not allowed here in /etc/nginx/sites-enabled/crm.prashantthakar.com:3
```

## Solution

The error means there's a syntax issue in your nginx config. Follow these steps:

### Step 1: Check Current File on VPS

```bash
# View the first 10 lines to see what's wrong
sudo head -10 /etc/nginx/sites-available/crm.prashantthakar.com

# View the entire file
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com
```

### Step 2: Backup and Replace the File

```bash
# Backup existing file
sudo cp /etc/nginx/sites-available/crm.prashantthakar.com /etc/nginx/sites-available/crm.prashantthakar.com.backup

# Remove the broken file
sudo rm /etc/nginx/sites-available/crm.prashantthakar.com

# Create new file using nano
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

### Step 3: Copy-Paste the Fixed Configuration

Copy the **entire content** from `nginx-frontend-fixed.conf` file and paste it into nano.

**Important:** Make sure you copy from the first `server {` line to the last `}` line.

### Step 4: Update the Root Path (if needed)

After pasting, check line with `root /var/www/crm.prashantthakar.com;` and update it to match your actual frontend directory path.

### Step 5: Save and Test

```bash
# In nano: Press Ctrl+X, then Y, then Enter to save

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

## Alternative: Direct File Replacement

If you prefer to upload the fixed file:

```bash
# Upload nginx-frontend-fixed.conf to VPS first, then:
sudo cp nginx-frontend-fixed.conf /etc/nginx/sites-available/crm.prashantthakar.com

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Common Causes of This Error

1. **Missing server block** - location directives must be inside a `server {}` block
2. **Incomplete copy-paste** - Only part of the file was copied
3. **Existing broken config** - Old config file had syntax errors
4. **Extra characters** - Hidden characters or encoding issues

## Verify the Fix

After fixing, test:

```bash
# Test nginx
sudo nginx -t

# Check if site is accessible
curl -I https://crm.prashantthakar.com

# Test uploads endpoint
curl -I https://crm.prashantthakar.com/uploads/test
```

