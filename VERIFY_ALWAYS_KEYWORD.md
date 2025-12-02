# ✅ Verify: Did You Add `always` Keyword?

## 🔍 Check Current Config

Run this to see if `always` is present:

```bash
sudo grep -A 5 "location /" /etc/nginx/sites-available/crm.prashantthakar.com
```

**If you see:**
```nginx
add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
```
**→ `always` is MISSING ❌**

**If you see:**
```nginx
add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0" always;
```
**→ `always` is PRESENT ✅**

---

## 🔴 Current Status (From Your Output)

Your config shows:
```nginx
add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
add_header Pragma "no-cache";
add_header Expires "0";
```

**`always` is MISSING!** That's why headers don't appear in HTTP response.

---

## ✅ Fix: Add `always` Keyword

### Step 1: Edit Config
```bash
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

### Step 2: Find `location /` Block

Press `Ctrl+W` to search, type `location /`, press Enter.

### Step 3: Add `always` to Each Header

**Change each line from:**
```nginx
add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
add_header Pragma "no-cache";
add_header Expires "0";
```

**To:**
```nginx
add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0" always;
add_header Pragma "no-cache" always;
add_header Expires "0" always;
```

**Complete block should be:**
```nginx
location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;
    try_files $uri $uri/ /index.html;
}
```

### Step 4: Save
- `Ctrl+X` (exit)
- `Y` (yes, save)
- `Enter` (confirm filename)

### Step 5: Test and Restart
```bash
sudo nginx -t && sudo systemctl restart nginx
```

### Step 6: Verify Headers Now Appear
```bash
curl -I https://crm.prashantthakar.com | grep -i cache
```

**Should now show:**
```
Cache-Control: no-cache, no-store, must-revalidate, max-age=0
Pragma: no-cache
Expires: 0
```

---

## 🎯 Why `always` is Critical

**Without `always`:**
- Headers only added on `200`, `204`, `206`, `301`, `302`, `303`, `304`, `307`, `308`
- Many responses don't get headers
- Browser caches anyway

**With `always`:**
- Headers added on **ALL** responses
- Browser always gets cache-busting headers
- New code appears immediately

---

## ✅ After Adding `always`

1. Headers will appear in HTTP response ✅
2. Browser won't cache ✅
3. New code will show ✅

---

## 📋 Quick Checklist

- [ ] Edit config: `sudo nano /etc/nginx/sites-available/crm.prashantthakar.com`
- [ ] Find `location /` block
- [ ] Add `always` to all 3 headers
- [ ] Save (Ctrl+X, Y, Enter)
- [ ] Test: `sudo nginx -t`
- [ ] Restart: `sudo systemctl restart nginx`
- [ ] Verify: `curl -I https://crm.prashantthakar.com | grep -i cache`
- [ ] Rebuild frontend
- [ ] Clear browser cache
- [ ] Test in browser

---

## 🔥 One-Line Verification

After editing, verify `always` is there:
```bash
sudo grep "always" /etc/nginx/sites-available/crm.prashantthakar.com
```

**Should show 3 lines with `always` keyword.**




