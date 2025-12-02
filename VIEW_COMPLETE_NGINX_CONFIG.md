# View Complete Nginx Config

## 🔍 View Full Config File

```bash
# View complete file
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com

# Or view with line numbers
sudo cat -n /etc/nginx/sites-available/crm.prashantthakar.com

# Or view with less (scrollable)
sudo less /etc/nginx/sites-available/crm.prashantthakar.com
# Press 'q' to quit less
```

---

## 📝 What to Look For

You need to find the `location / {` block. It should look something like:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**You need to ADD these 3 lines INSIDE that block:**

```nginx
location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
    add_header Pragma "no-cache";
    add_header Expires "0";
    try_files $uri $uri/ /index.html;
}
```

---

## 🎯 Complete Example Config

Your full config should look like this:

```nginx
server {
    listen 80;
    server_name crm.prashantthakar.com;

    root /var/www/primeacademy_frontend/dist;
    index index.html;

    # Cache-busting for HTML, JS, CSS files
    location ~* \.(html|js|css)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }

    # Cache-busting for root and all routes
    location / {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🚀 Quick Commands

```bash
# 1. View full file
sudo cat /etc/nginx/sites-available/crm.prashantthakar.com

# 2. Search for "location /"
sudo grep -n "location /" /etc/nginx/sites-available/crm.prashantthakar.com

# 3. View context around "location /"
sudo grep -A 5 "location /" /etc/nginx/sites-available/crm.prashantthakar.com
```

---

## 📋 Step-by-Step

1. **View complete file:**
   ```bash
   sudo cat /etc/nginx/sites-available/crm.prashantthakar.com
   ```

2. **Find the `location / {` block** (usually near the end)

3. **Edit the file:**
   ```bash
   sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
   ```

4. **Navigate to the `location / {` block** (use arrow keys or Ctrl+W to search)

5. **Add the 3 cache header lines BEFORE `try_files`**

6. **Save:** Ctrl+X, Y, Enter

7. **Test and restart:**
   ```bash
   sudo nginx -t && sudo systemctl restart nginx
   ```




