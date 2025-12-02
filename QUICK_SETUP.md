# Quick Setup Guide for VPS Deployment

## Immediate Steps to Fix Your Deployment

### 1. Fix Frontend API Connection

The frontend is trying to connect to `http://localhost:3000/api` because the environment variable isn't set.

**On your VPS:**
```bash
cd /path/to/your/frontend
nano .env.production
```

Add:
```
VITE_API_BASE_URL=http://api.prashantthakar.com/api
```

Then rebuild:
```bash
npm run build
```

### 2. Fix Nginx Configuration

**Frontend (crm.prashantthakar.com):**
```bash
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

Use the `nginx-frontend.conf` file provided, but update the `root` path:
```nginx
root /path/to/your/frontend/dist;
```

**Backend (api.prashantthakar.com):**
```bash
sudo nano /etc/nginx/sites-available/api.prashantthakar.com
```

Use the `nginx-backend.conf` file provided.

After editing:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Fix Backend CORS

The backend CORS has been updated to allow your frontend domain. Make sure your `.env` file has:
```
FRONTEND_URL=http://crm.prashantthakar.com
```

Then restart the backend:
```bash
pm2 restart primeacademy-backend
```

### 4. Verify Backend is Running

```bash
# Check if backend is running
pm2 status

# If not running, start it:
cd /path/to/your/backend
pm2 start dist/index.js --name primeacademy-backend
pm2 save

# Check logs for errors
pm2 logs primeacademy-backend
```

### 5. Test the Setup

1. **Test Backend API:**
   ```bash
   curl http://api.prashantthakar.com/api/health
   ```

2. **Test Frontend:**
   - Visit: http://crm.prashantthakar.com
   - Open browser console (F12) and check for errors
   - Look for CORS errors or 404 errors

### 6. Common Issues and Fixes

**Issue: Frontend shows blank page**
- Check nginx error log: `sudo tail -f /var/log/nginx/crm.prashantthakar.com.error.log`
- Verify dist folder exists and has index.html
- Check file permissions: `sudo chown -R nginx:nginx /path/to/frontend/dist`

**Issue: API calls fail with CORS error**
- Verify `FRONTEND_URL` in backend `.env` matches exactly: `http://crm.prashantthakar.com`
- Restart backend: `pm2 restart primeacademy-backend`
- Check browser console for exact CORS error message

**Issue: API returns 502 Bad Gateway**
- Backend might not be running: `pm2 status`
- Check if backend is listening: `sudo netstat -tlnp | grep 3000`
- Check backend logs: `pm2 logs primeacademy-backend`
- Verify nginx proxy_pass points to correct port

**Issue: API returns 404**
- Check if routes are registered in backend
- Verify nginx is proxying to `/api` correctly
- Check backend logs for route registration

### 7. ChatGPT Integration Issue

If you have a ChatGPT/OpenAI integration that's not working:

1. **Check if it's a frontend feature:**
   - Look for API calls to OpenAI in browser network tab
   - Check if API key is set in environment variables

2. **Check if it's a backend feature:**
   - Look for OpenAI API calls in backend code
   - Verify API key is in backend `.env` file
   - Check backend logs for OpenAI errors

3. **Common issues:**
   - Missing API key in environment variables
   - Network/firewall blocking OpenAI API
   - CORS issues if calling from frontend
   - Rate limiting or API quota exceeded

If you can provide more details about where the ChatGPT feature is (which page/component), I can help debug it further.

## File Locations Summary

```
/var/www/primeacademy/          (or your project path)
├── backend/
│   ├── .env                    # Backend environment variables
│   ├── dist/                   # Compiled backend
│   └── src/
├── frontend/
│   ├── .env.production         # Frontend environment variables
│   ├── dist/                   # Built frontend (served by nginx)
│   └── src/
└── nginx-*.conf                # Nginx configs (copy to /etc/nginx/sites-available/)
```

## Nginx Config Locations

```
/etc/nginx/sites-available/
├── crm.prashantthakar.com      # Frontend config
└── api.prashantthakar.com      # Backend config

/etc/nginx/sites-enabled/
├── crm.prashantthakar.com      # Symlink to sites-available
└── api.prashantthakar.com      # Symlink to sites-available
```







