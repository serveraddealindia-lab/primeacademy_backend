# Email Configuration Guide

This guide explains how to configure Nodemailer for sending password reset emails in the Prime Academy application.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@primeacademy.com
EMAIL_FROM_NAME=Prime Academy

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:5173
```

## Gmail Setup

If you're using Gmail, follow these steps:

1. **Enable 2-Step Verification** on your Google account
2. **Generate an App Password**:
   - Go to your Google Account settings
   - Navigate to Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password (not your regular Gmail password) in `EMAIL_PASSWORD`

## Other Email Providers

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### Yahoo Mail
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### Custom SMTP Server
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_SECURE=false  # Use true for port 465
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
```

## Testing Email Configuration

1. Start the backend server
2. Check the logs for email service initialization:
   - Success: "Email service is ready to send messages"
   - Failure: "Email service not configured" or error messages

3. Test password reset:
   - Go to the login page
   - Click "Forgot Password?"
   - Enter a registered email
   - Check the email inbox for the reset link

## Troubleshooting

### Email not sending
- Verify all environment variables are set correctly
- Check that `EMAIL_PASSWORD` is an app password (for Gmail), not your regular password
- Ensure the email service is configured (check server logs)
- Verify SMTP server settings (host, port, secure)

### Email goes to spam
- Ensure `EMAIL_FROM` matches a verified sender address
- Add SPF and DKIM records to your domain (for custom domains)
- Use a professional email address

### Connection timeout
- Check firewall settings
- Verify SMTP server host and port
- Try using `EMAIL_SECURE=true` with port 465

## Development Mode

In development mode, if email is not configured:
- The system will log a warning
- Password reset links will be logged to the console instead of being sent
- The application will continue to function normally

## Production Considerations

1. **Use a dedicated email service** (SendGrid, Mailgun, AWS SES) for better deliverability
2. **Set up SPF and DKIM records** for your domain
3. **Monitor email delivery rates**
4. **Use environment-specific email accounts**
5. **Implement rate limiting** to prevent abuse

