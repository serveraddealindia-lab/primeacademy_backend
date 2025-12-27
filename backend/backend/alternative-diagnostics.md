# Alternative Ways to Diagnose 502 Bad Gateway Issue

## Method 1: Browser-Based Network Inspection

### Step 1: Open Browser Developer Tools
1. Open your frontend: `https://crm.prashantthakar.com`
2. Press `F12` or `Right-click → Inspect`
3. Go to **Network** tab
4. Try to login or make any API call
5. Look for the failed request to `api.prashantthakar.com`

### Step 2: Check Request Details
- Click on the failed request
- Check:
  - **Status Code**: Should show `502` or `(failed)`
  - **Request URL**: Should be `https://api.prashantthakar.com/api/...`
  - **Request Headers**: Check if Authorization header is sent
  - **Response**: Check if there's any response body

### Step 3: Check Console Errors
- Go to **Console** tab
- Look for:
  - CORS errors
  - SSL/TLS errors
  - Network errors
  - Specific error messages

## Method 2: Direct API Testing from Browser

### Test 1: Health Check Endpoint
Open in browser:
```
https://api.prashantthakar.com/api/health
```

**Expected**: JSON response like `{"status":"ok"}`
**If 502**: Backend is not running or nginx can't connect

### Test 2: Check SSL Certificate
```
https://api.prashantthakar.com
```

**Check**:
- Does SSL certificate load?
- Any certificate errors?
- Does it redirect or show nginx default page?

## Method 3: Using Online Tools

### Test 1: Online API Tester
Use: https://reqbin.com/ or https://httpie.io/app

**Test Request**:
- Method: `GET`
- URL: `https://api.prashantthakar.com/api/health`
- Headers: None needed for health check

### Test 2: SSL Checker
Use: https://www.ssllabs.com/ssltest/

Enter: `api.prashantthakar.com`
- Check if SSL is valid
- Check if certificate is expired

### Test 3: DNS Checker
Use: https://dnschecker.org/

Enter: `api.prashantthakar.com`
- Verify DNS resolves correctly
- Check if it points to your VPS IP

## Method 4: Command Line from Your Local Machine

### Test 1: Test API from Your Computer
```bash
# Test health endpoint
curl -v https://api.prashantthakar.com/api/health

# Test with verbose output to see connection details
curl -v -k https://api.prashantthakar.com/api/health

# Test HTTP (should redirect to HTTPS)
curl -v http://api.prashantthakar.com/api/health
```

### Test 2: Check DNS Resolution
```bash
# Windows PowerShell
nslookup api.prashantthakar.com

# Linux/Mac
dig api.prashantthakar.com
host api.prashantthakar.com
```

### Test 3: Check SSL Certificate
```bash
# Check certificate details
openssl s_client -connect api.prashantthakar.com:443 -servername api.prashantthakar.com

# Or using curl
curl -vI https://api.prashantthakar.com 2>&1 | grep -i ssl
```

## Method 5: Frontend Configuration Check

### Check 1: Environment Variables
Check your frontend build:
1. Open browser console
2. Type: `console.log(import.meta.env)`
3. Check if `VITE_API_BASE_URL` is set correctly
4. Should be: `https://api.prashantthakar.com` (without `/api`)

### Check 2: Network Request in Code
Add this to your frontend temporarily:
```javascript
// In axios.ts or wherever you make API calls
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
console.log('Full URL:', `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/auth/login`);
```

## Method 6: VPS Access Alternative (If SSH Not Working)

### Option 1: Use VPS Control Panel
If you have cPanel, Plesk, or similar:
1. Check process manager
2. Check error logs
3. Check service status

### Option 2: Use Web-based Terminal
Many VPS providers offer web-based SSH:
- Check your VPS provider's dashboard
- Look for "Web Terminal" or "Console Access"

### Option 3: Check VPS Provider Logs
- Check your VPS provider's dashboard
- Look for:
  - System logs
  - Application logs
  - Resource usage (CPU, Memory)

## Method 7: Compare Working vs Non-Working

### Local (Working) vs Production (Not Working)

**Check Local Setup**:
```bash
# On your local machine
cd backend
cat .env | grep -E "PORT|NODE_ENV"
npm run build
npm start
# Check what it logs when starting
```

**Compare with Production**:
- What's different?
- Environment variables?
- Port configuration?
- Network settings?

## Method 8: Nginx Status Check (If You Have Access)

### Check Nginx Status
```bash
# From VPS
sudo systemctl status nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Check Nginx Access Logs
```bash
# See recent requests
sudo tail -50 /var/log/nginx/api.prashantthakar.com.access.log

# See if requests are reaching nginx
sudo tail -f /var/log/nginx/api.prashantthakar.com.access.log
```

## Method 9: Process Check (Alternative)

### Check if Node Process is Running
```bash
# From VPS
ps aux | grep node
ps aux | grep "dist/index.js"
pgrep -f "node.*index.js"
```

### Check Port Usage
```bash
# From VPS
lsof -i :3001
# OR
fuser 3001/tcp
```

## Method 10: Quick Visual Checklist

### Frontend Issues
- [ ] Is frontend URL correct? (`https://crm.prashantthakar.com`)
- [ ] Is API URL in frontend correct? (`https://api.prashantthakar.com/api`)
- [ ] Are environment variables set in production build?
- [ ] Is frontend built with production environment?

### Backend Issues
- [ ] Is backend running? (Check PM2 or process list)
- [ ] Is backend listening on port 3001?
- [ ] Is backend listening on 0.0.0.0 (not 127.0.0.1)?
- [ ] Are there any errors in backend logs?

### Nginx Issues
- [ ] Is nginx running?
- [ ] Is nginx configured correctly?
- [ ] Does nginx proxy_pass point to localhost:3001?
- [ ] Are there errors in nginx error logs?

### Network Issues
- [ ] Does DNS resolve correctly?
- [ ] Is SSL certificate valid?
- [ ] Are firewall rules allowing port 443?
- [ ] Are firewall rules allowing port 3001 (internal)?

## Method 11: Create a Test Endpoint

Add this to your backend temporarily:
```typescript
// In backend/src/index.ts, add before other routes
app.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is working',
    timestamp: new Date().toISOString(),
    port: PORT,
    nodeEnv: process.env.NODE_ENV,
    listeningOn: process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'
  });
});
```

Then test:
```
https://api.prashantthakar.com/api/test
```

This will tell you:
- If backend is running
- What port it's on
- What environment it thinks it's in
- What interface it's listening on

