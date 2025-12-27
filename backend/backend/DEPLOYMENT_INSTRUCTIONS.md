# Deployment Instructions for Generate Receipt Route

## Issue
The route `/api/payments/:paymentId/generate-receipt` is not found on the live server because the updated code hasn't been deployed.

## Steps to Deploy

### 1. Build the TypeScript Code (on your local machine or VPS)

```bash
cd backend
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### 2. Deploy to VPS

**Option A: Using Git (Recommended)**
```bash
# On VPS, pull latest code
cd /path/to/your/backend
git pull origin main  # or your branch name

# Build the code
npm run build

# Restart the server
pm2 restart backend  # or however you're running the server
# OR
systemctl restart your-backend-service
# OR
# If using nodemon/dev mode, just restart the process
```

**Option B: Manual Upload**
1. Upload the entire `backend/` folder to your VPS
2. Or upload just the changed files:
   - `backend/src/routes/payment.routes.ts`
   - `backend/src/controllers/payment.controller.ts`
   - `backend/dist/` folder (after building)

### 3. Install Dependencies (if needed)

```bash
cd /path/to/your/backend
npm install
```

### 4. Build on VPS

```bash
npm run build
```

### 5. Restart the Backend Server

**If using PM2:**
```bash
pm2 restart backend
# or
pm2 restart all
```

**If using systemd:**
```bash
sudo systemctl restart your-backend-service
```

**If using nodemon/dev:**
- Stop the current process (Ctrl+C)
- Start again: `npm run dev`

**If running directly with node:**
```bash
# Stop the current process
# Then start:
npm start
```

### 6. Verify the Route is Working

Test the route:
```bash
curl -X POST http://your-api-domain/api/payments/6/generate-receipt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

Or check in your frontend - the "Generate Receipt" button should work.

## Important Notes

1. **No Database Changes Needed**: This is purely a code update. No SQL migrations or database changes are required.

2. **Ensure rupee.png exists**: Make sure `backend/uploads/rupee.png` exists on the VPS (or upload it if it's missing).

3. **Check Server Logs**: After restarting, check the server logs to ensure:
   - The server started successfully
   - No errors during startup
   - The route is registered

4. **Environment Variables**: Make sure all environment variables are set correctly on the VPS.

## Quick Checklist

- [ ] Code is built (`npm run build`)
- [ ] Code is deployed to VPS
- [ ] Dependencies are installed (`npm install`)
- [ ] Backend server is restarted
- [ ] Server logs show no errors
- [ ] Route is accessible (test with curl or frontend)

## Troubleshooting

If the route still doesn't work after deployment:

1. **Check if the route is registered**: Look at server startup logs for route registration
2. **Verify the build**: Ensure `dist/routes/payment.routes.js` contains the new route
3. **Check file permissions**: Ensure the server can read the compiled files
4. **Clear any caches**: If using a process manager, ensure it's using the latest code
5. **Check nginx/proxy**: If using nginx, ensure it's not caching old routes




