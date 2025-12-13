# Fix: Old PDF Receipts Still Being Generated

## Problem
Old PDF receipts are still being generated even after restart.

## Solution Steps

### 1. **Rebuild the Backend** (Important!)
```bash
cd backend
npm run build
```

### 2. **Restart the Backend Server**
If using PM2:
```bash
pm2 restart primeacademy-backend
# or
pm2 restart all
```

If running manually:
```bash
# Stop the server (Ctrl+C)
# Then start again:
npm start
# or for development:
npm run dev
```

### 3. **Verify Rupee Image Exists**
Make sure `rupee.jpg` is in the `backend` folder:
```bash
cd backend
ls rupee.jpg  # Should show the file
```

### 4. **Check Backend Logs**
When generating a new receipt, check the logs for:
- `✅ Rupee image loaded successfully from: [path]` - Image is loaded
- `⚠️ Rupee image not found, will use text symbol as fallback` - Image not found

### 5. **Test Receipt Generation**
1. Create or update a payment
2. Check if the new receipt has:
   - Rupee symbol image (not text ₹)
   - New format with dark purple headers
   - Correct contact details

## If Still Not Working

### Check Image Path
The code checks these paths in order:
1. `dist/controllers/../../rupee.jpg` (from compiled code)
2. `backend/rupee.jpg` (from backend root)
3. `backend/backend/rupee.jpg` (from project root)

### Verify Code is Updated
Check that `dist/controllers/payment.controller.js` contains:
- `createRupeeAmount` function
- `rupeeImageBase64` variable
- Image loading code

### Clear Cache (if using)
If you're using any caching, clear it:
```bash
# Clear node_modules cache
rm -rf node_modules/.cache
# or on Windows:
rmdir /s node_modules\.cache
```

## Regenerate All Existing Receipts
To update all existing receipts to the new format:
```bash
npm run regenerate-receipts
```

This will regenerate all receipts with the new format including the rupee symbol.

