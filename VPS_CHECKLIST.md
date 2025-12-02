# VPS Deployment Checklist

Use this checklist to ensure everything is deployed correctly.

## Pre-Deployment

- [ ] VPS server access (SSH)
- [ ] Domain name configured (DNS pointing to VPS IP)
- [ ] All source code files ready
- [ ] Orientation PDFs ready
- [ ] Database backup plan ready

## Server Setup

- [ ] System updated (`apt update && apt upgrade`)
- [ ] Node.js 18+ installed
- [ ] MySQL/MariaDB installed and secured
- [ ] Nginx installed
- [ ] PM2 installed globally
- [ ] Firewall configured (UFW)

## Database

- [ ] Database created (`primeacademy_db`)
- [ ] Database user created with proper permissions
- [ ] Database migrations run successfully
- [ ] All tables created
- [ ] AUTO_INCREMENT fixes applied (if needed)
- [ ] Admin user created (if needed)

## Backend

- [ ] Files uploaded to `/var/www/primeacademy/backend`
- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript compiled (`npm run build`)
- [ ] `.env` file created with all required variables
- [ ] JWT_SECRET generated and set
- [ ] Database credentials configured
- [ ] Frontend URL configured
- [ ] Directories created:
  - [ ] `uploads/general`
  - [ ] `uploads/attendance`
  - [ ] `orientations`
  - [ ] `receipts`
  - [ ] `certificates`
- [ ] Orientation PDFs copied:
  - [ ] `Student_Orientation_English.pdf`
  - [ ] `Student_Orientation_Gujarati.pdf`
- [ ] Backend started with PM2
- [ ] PM2 configured to start on boot
- [ ] Backend health check passes (`/api/health`)

## Frontend

- [ ] Files uploaded to `/var/www/primeacademy/frontend`
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with `VITE_API_BASE_URL`
- [ ] Frontend built (`npm run build`)
- [ ] Build output in `frontend/dist`

## Nginx Configuration

- [ ] Nginx config file created (`/etc/nginx/sites-available/primeacademy`)
- [ ] Site enabled (symlink created)
- [ ] Nginx config tested (`nginx -t`)
- [ ] Nginx restarted
- [ ] Frontend accessible at domain
- [ ] API endpoints accessible (`/api/*`)
- [ ] Static files accessible:
  - [ ] `/uploads/*`
  - [ ] `/orientations/*`
  - [ ] `/receipts/*`
  - [ ] `/certificates/*`

## SSL Certificate

- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] Nginx automatically updated with SSL
- [ ] HTTPS working
- [ ] HTTP redirects to HTTPS
- [ ] Auto-renewal configured

## Testing

- [ ] Frontend loads correctly
- [ ] Login works
- [ ] API endpoints respond
- [ ] File uploads work
- [ ] Orientation PDFs display
- [ ] Receipts generate and download
- [ ] Database operations work
- [ ] All features tested

## Security

- [ ] Firewall enabled and configured
- [ ] SSH key authentication (recommended)
- [ ] Strong passwords set
- [ ] `.env` file permissions secure (600)
- [ ] Database user has minimal required permissions
- [ ] Regular backups configured

## Monitoring

- [ ] PM2 monitoring set up
- [ ] Log rotation configured
- [ ] Database backup script created
- [ ] Backup cron job configured
- [ ] Monitoring alerts set up (optional)

## Documentation

- [ ] Deployment guide reviewed
- [ ] Server credentials documented (securely)
- [ ] Database credentials documented (securely)
- [ ] Backup procedures documented
- [ ] Rollback procedures documented

## Post-Deployment

- [ ] All features tested in production
- [ ] Performance checked
- [ ] Error logs reviewed
- [ ] User access verified
- [ ] Support team notified

---

## Quick Commands Reference

```bash
# Backend
pm2 status
pm2 logs primeacademy-backend
pm2 restart primeacademy-backend
pm2 stop primeacademy-backend

# Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log

# Database
sudo mysql -u primeacademy_user -p primeacademy_db
SHOW TABLES;

# System
df -h  # Check disk space
free -h  # Check memory
top  # Check system resources
```

---

## Emergency Rollback

If something goes wrong:

1. Stop PM2: `pm2 stop primeacademy-backend`
2. Restore database from backup
3. Revert code changes
4. Restart: `pm2 restart primeacademy-backend`

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Version:** _______________


