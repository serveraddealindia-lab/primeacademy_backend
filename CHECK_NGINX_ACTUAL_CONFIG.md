# ✅ Step 1 Complete - Now Check What Nginx Actually Uses

## ✅ Good News from Step 1

Your config file shows **ONLY ONE `location /` block** with cache headers ✅

But Nginx might be loading additional blocks from other sources!

---

## 🔍 Step 2: Check What Nginx Actually Uses

```bash
sudo nginx -T | grep -A 50 "server_name.*crm.prashantthakar.com"
```

**This shows the ACTUAL config Nginx is using** (from all sources, including includes).

**Look for:**
- How many `location /` blocks appear?
- Are there any `include` directives that might add more blocks?
- Is there a default server block catching requests?

---

## 🔍 Step 3: Count Location Blocks in Actual Config

```bash
sudo nginx -T | grep -A 50 "server_name.*crm.prashantthakar.com" | grep -c "location /"
```

**This counts how many `location /` blocks Nginx actually sees.**

**If it shows more than 1, there are additional blocks from other sources!**

---

## 🔍 Step 4: See All Location Blocks in Actual Config

```bash
sudo nginx -T | grep -A 50 "server_name.*crm.prashantthakar.com" | grep -B 2 -A 10 "location /"
```

**This shows all `location /` blocks with context.**

**Look for:**
- Which one is LAST? (That's the one that applies)
- Does the LAST one have cache headers?

---

## 🔍 Step 5: Check for Include Directives

```bash
sudo grep -r "include" /etc/nginx/sites-available/crm.prashantthakar.com
sudo grep -r "include" /etc/nginx/sites-enabled/
```

**This shows if other config files are being included.**

---

## 🔍 Step 6: Check for Default Server Block

```bash
sudo nginx -T | grep -B 5 -A 20 "server_name _"
```

**A default server (`server_name _;`) might be catching requests first!**

---

## ✅ Step 7: If Multiple Blocks Found

### Option A: Blocks from Include Files

If blocks are coming from include files:
```bash
# Find which files are included
sudo grep "include" /etc/nginx/sites-available/crm.prashantthakar.com

# Edit those files to remove duplicate location / blocks
sudo nano /path/to/included/file
```

### Option B: Default Server Block Issue

If a default server is catching requests:
```bash
# Find default server config
sudo nginx -T | grep -B 5 -A 20 "server_name _"

# Either:
# 1. Remove the default server block
# 2. Or make sure crm.prashantthakar.com comes first
# 3. Or add cache headers to default server too
```

### Option C: Multiple Server Blocks for Same Domain

If there are multiple server blocks for `crm.prashantthakar.com`:
```bash
# Find all server blocks
sudo nginx -T | grep -B 5 -A 30 "server_name.*crm.prashantthakar.com"

# Make sure only ONE server block exists
# Or add cache headers to all of them
```

---

## 🚀 Quick Diagnostic Script

Run this to see everything:

```bash
echo "=== Step 2: Actual Nginx Config ==="
sudo nginx -T | grep -A 50 "server_name.*crm.prashantthakar.com"

echo ""
echo "=== Step 3: Count Location Blocks ==="
sudo nginx -T | grep -A 50 "server_name.*crm.prashantthakar.com" | grep -c "location /"

echo ""
echo "=== Step 4: All Location / Blocks ==="
sudo nginx -T | grep -A 50 "server_name.*crm.prashantthakar.com" | grep -B 2 -A 10 "location /"

echo ""
echo "=== Step 5: Include Directives ==="
sudo grep "include" /etc/nginx/sites-available/crm.prashantthakar.com

echo ""
echo "=== Step 6: Default Server ==="
sudo nginx -T | grep -B 5 -A 20 "server_name _"
```

---

## ✅ Expected Result

**If count shows 1:**
- Only one `location /` block ✅
- Headers should work ✅
- Test: `curl -I https://crm.prashantthakar.com | grep -i cache`

**If count shows more than 1:**
- Multiple blocks exist ❌
- Need to remove duplicates or ensure last one has headers
- Follow Option A, B, or C above

---

## 📋 Next Steps After Step 2

1. **If only 1 block:** Headers should work! Test and verify.
2. **If multiple blocks:** Identify source and remove duplicates.
3. **Restart Nginx:** `sudo systemctl restart nginx`
4. **Verify headers:** `curl -I https://crm.prashantthakar.com | grep -i cache`

---

## 🎯 Summary

**Step 1 showed:** Config file has only one `location /` block ✅

**Step 2 will show:** What Nginx actually uses (might be different!)

**After Step 2:** We'll know if we need to fix anything else.




