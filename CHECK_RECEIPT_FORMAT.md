# Check Why Receipts Show Old Format

## Possible Issues:

### 1. **Server Not Restarted After Build**
The code has been updated and compiled, but the server might still be running old code.

**Solution:**
```bash
# Stop the server (Ctrl+C if running manually)
# Then restart:
npm start

# Or if using PM2:
pm2 restart primeacademy-backend
```

### 2. **Image Not Found**
The rupee image might not be in the correct location.

**Check:**
```bash
cd backend
ls rupee.jpg  # Should show the file
```

**If not found, copy it to:**
- `backend/rupee.jpg` (same folder as package.json)

### 3. **Old Receipts Being Served**
If you're viewing an **existing** receipt (not generating a new one), it will show the old format because it was generated before the update.

**Solution:**
- Generate a **NEW** payment/receipt to see the new format
- Or run the regeneration script:
  ```bash
  npm run regenerate-receipts
  ```

### 4. **Check Backend Logs**
When generating a new receipt, check the backend logs for:
- `✅ Rupee image loaded successfully from: [path]` - Image found
- `⚠️ Rupee image not found, will use text symbol as fallback` - Image not found

### 5. **Verify New Receipt Generation**
1. Create a new payment or update an existing one
2. Check the generated receipt PDF
3. Look for:
   - Rupee symbol image (not text ₹)
   - Dark purple table headers
   - New contact details (bd.drivein@gmail.com, etc.)
   - New format matching the reference

## Quick Test:

1. **Restart server:**
   ```bash
   npm start
   ```

2. **Generate a new receipt:**
   - Go to payments
   - Create or update a payment
   - Download the receipt

3. **Check logs:**
   - Look for rupee image loading messages
   - Verify the image path is correct

## If Still Not Working:

1. **Verify image exists:**
   ```bash
   cd backend
   dir rupee.jpg
   ```

2. **Check compiled code:**
   ```bash
   npm run build
   ```

3. **Check server is using new code:**
   - Look at server startup logs
   - Verify it's loading from `dist/` folder

4. **Clear any caches:**
   - Restart the server completely
   - Clear browser cache if viewing receipts in browser

