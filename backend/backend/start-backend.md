# Backend Server Startup Instructions

## To start the backend server:

### For Development:
```bash
cd backend
npm run dev
```

### For Production:
```bash
cd backend
npm run build
npm start
```

## Verify the server is running:
The server should start on port 3001 (or the port specified in your .env file).

You should see logs like:
```
Server is running on port 3001
Database connection established successfully.
```

## Check if backend is accessible:
- Health check: `http://localhost:3001/api/health`
- If deployed: `https://api.prashantthakar.com/api/health`

## Common Issues:

1. **Port already in use**: Change PORT in .env file or kill the process using the port
2. **Database connection error**: Check database credentials in .env
3. **CORS errors**: Backend CORS is configured to allow requests from:
   - http://localhost:5173
   - https://crm.prashantthakar.com
   - https://api.prashantthakar.com

## Environment Variables Needed:
- `PORT` (default: 3001)
- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `FRONTEND_URL` (optional, for CORS)

