# Upload batch.controller.ts to VPS

## Method 1: Using SCP (Recommended)

### From Windows PowerShell or Git Bash:

```powershell
# Navigate to your project directory first
cd C:\Users\ADDEAL\Primeacademy

# Upload the file (replace with your VPS details)
scp backend/src/controllers/batch.controller.ts root@your-vps-ip:/var/www/primeacademy_backend/src/controllers/batch.controller.ts
```

**Replace:**
- `root` with your VPS username (if different)
- `your-vps-ip` with your actual VPS IP address or domain
- You'll be prompted for your VPS password

### Example:
```powershell
scp backend/src/controllers/batch.controller.ts root@123.45.67.89:/var/www/primeacademy_backend/src/controllers/batch.controller.ts
```

## Method 2: Using WinSCP (GUI Tool)

1. Download and install WinSCP: https://winscp.net/
2. Connect to your VPS
3. Navigate to `/var/www/primeacademy_backend/src/controllers/`
4. Upload `batch.controller.ts` from your local `backend/src/controllers/` folder

## Method 3: Using VS Code Remote SSH

1. Install "Remote - SSH" extension in VS Code
2. Connect to your VPS
3. Open the file on VPS and copy-paste the content

## After Uploading - Run These Commands on VPS:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Navigate to backend directory
cd /var/www/primeacademy_backend

# Rebuild the backend
npm run build

# Restart the backend service
pm2 restart backend-api

# Watch logs to verify it's working
pm2 logs backend-api
```

## Quick One-Liner (if you have SSH key setup):

```bash
scp backend/src/controllers/batch.controller.ts root@your-vps-ip:/var/www/primeacademy_backend/src/controllers/batch.controller.ts && ssh root@your-vps-ip "cd /var/www/primeacademy_backend && npm run build && pm2 restart backend-api"
```

