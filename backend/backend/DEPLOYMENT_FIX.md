# Fix for "Route not found" Error in Production

## Problem
Routes `/api/students/unified-import` and payment routes are showing "Route not found" error in production at `https://api.prashantthakar.com/`

## Solution

### 1. Backend Deployment (VPS)

```bash
# SSH into VPS
ssh username@your-vps-ip

# Navigate to project
cd /var/www/Primeacademy

# Pull latest code
git pull origin main

# Navigate to backend
cd backend

# Install dependencies (if package.json changed)
npm install

# Build TypeScript
npm run build

# Restart PM2
pm2 restart primeacademy-backend

# Check logs to verify routes are registered
pm2 logs primeacademy-backend | grep "Registered student routes"
```

### 2. Frontend Environment Variable

Create `.env.production` file in `frontend/` directory:

```env
VITE_API_BASE_URL=https://api.prashantthakar.com/api
```

Then rebuild frontend:

```bash
cd frontend
npm run build
```

### 3. Verify Routes are Working

After deployment, check backend logs:

```bash
pm2 logs primeacademy-backend
```

You should see:
```
Registered student routes:
  POST /api/students/unified-import
  GET /api/students/template
  POST /api/students/bulk-enroll
  POST /api/students/enroll
```

### 4. Test the Route

Test from browser console or Postman:

```javascript
// Test route exists
fetch('https://api.prashantthakar.com/api/students/template', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(r => console.log('Status:', r.status))
.catch(e => console.error('Error:', e))
```

## Common Issues

1. **Routes not compiled**: Make sure `npm run build` was run on backend
2. **PM2 not restarted**: Routes won't be available until PM2 restarts
3. **Frontend API URL wrong**: Check `.env.production` has correct URL
4. **CORS issues**: Check backend CORS settings include frontend domain

## Quick Fix Commands (One-liner)

```bash
cd /var/www/Primeacademy && git pull origin main && cd backend && npm install && npm run build && pm2 restart primeacademy-backend && pm2 logs primeacademy-backend --lines 50
```


