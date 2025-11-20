# Email SMTP Setup Guide - GO-FEZ

This guide explains how to configure email sending using generic SMTP settings that work with any email provider.

## 📧 Environment Variables

Add these variables to your `.env` file:

```env
# SMTP Configuration (Generic Email Settings)
SMTP_HOST=smtp.gmail.com          # SMTP server hostname
SMTP_PORT=587                      # SMTP port (587 for TLS, 465 for SSL)
SMTP_SECURE=false                  # true for SSL (port 465), false for TLS (port 587)
SMTP_USER=your-email@gmail.com     # Your email address
SMTP_PASSWORD=your-app-password    # Your email password or app-specific password
FROM_EMAIL=your-email@gmail.com    # Email address to send from
FROM_NAME=GO-FEZ                   # Display name for emails
SKIP_EMAIL=false                   # Set to 'true' to disable email sending in development
```

## 🔧 Configuration Examples

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=youremail@gmail.com
SMTP_PASSWORD=your-16-digit-app-password
FROM_EMAIL=youremail@gmail.com
FROM_NAME=GO-FEZ
```

**⚠️ Important for Gmail:**
1. Enable 2-Factor Authentication in your Google Account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-digit password (no spaces)
   - Use this as `SMTP_PASSWORD`

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=youremail@outlook.com
SMTP_PASSWORD=your-password
FROM_EMAIL=youremail@outlook.com
FROM_NAME=GO-FEZ
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
FROM_EMAIL=verified-sender@yourdomain.com
FROM_NAME=GO-FEZ
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-smtp-password
FROM_EMAIL=noreply@your-domain.com
FROM_NAME=GO-FEZ
```

### Custom SMTP Server
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=GO-FEZ
```

## 🔐 Port Selection Guide

| Port | Security | Description |
|------|----------|-------------|
| 25   | None     | Standard SMTP (often blocked by ISPs) |
| 587  | TLS      | **Recommended** - Modern secure SMTP (set `SMTP_SECURE=false`) |
| 465  | SSL      | Secure SMTP with SSL (set `SMTP_SECURE=true`) |
| 2525 | TLS      | Alternative port (used by some providers like Mailgun) |

## 📝 API Endpoints

### 1. Send OTP
```http
POST /api/auth/otp/send
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Code OTP envoyé avec succès à votre email"
}
```

### 2. Verify OTP
```http
POST /api/auth/otp/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "otpCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email vérifié avec succès"
}
```

### 3. Register User (after OTP verification)
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "phone": "+212612345678"
}
```

## 🔄 Signup Flow with OTP

```
1. User enters signup details
   ↓
2. Client checks if email_verification_enabled = 'true' in settings
   ↓
3. If enabled:
   a. POST /api/auth/otp/send { email }
   b. Show OTP input screen
   c. User enters 6-digit code
   d. POST /api/auth/otp/verify { email, otpCode }
   e. On success: POST /api/auth/register (create account)
   ↓
4. If disabled:
   POST /api/auth/register directly
```

## 🧪 Testing Email Configuration

### Method 1: Run Test Script
```bash
cd server-go-fez
node test-email.js
```

### Method 2: Test via API
```bash
# Send OTP
curl -X POST https://api-gofez.cleverapps.io/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@gmail.com"}'

# Verify OTP (check your email for the code)
curl -X POST https://api-gofez.cleverapps.io/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@gmail.com","otpCode":"123456"}'
```

### Method 3: Check Server Logs
When the server starts, you should see:
```
✅ SMTP server is ready to send emails
📧 SMTP Transporter Configuration: {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: 'youremail@gmail.com'
}
```

## 🐛 Troubleshooting

### Error: "Invalid login"
- **Gmail:** Make sure you're using an App Password, not your regular password
- **Outlook:** Verify your password is correct
- Check `SMTP_USER` matches your email address

### Error: "Connection timeout"
- Check your `SMTP_HOST` and `SMTP_PORT`
- Verify your firewall isn't blocking SMTP ports
- Try port 465 with `SMTP_SECURE=true`

### Error: "self signed certificate"
- The code already handles this with `rejectUnauthorized: false`
- This is normal for some SMTP servers

### Emails not arriving
- Check spam/junk folder
- Verify `FROM_EMAIL` is correct
- For production, use a verified domain email
- Enable "Less secure app access" for Gmail (not recommended, use App Password instead)

### Development Mode
Set `SKIP_EMAIL=true` to disable email sending. The OTP code will be printed in console:
```
⚠️ Email disabled (SKIP_EMAIL=true). OTP code = 123456
```

## 🔒 Security Best Practices

1. **Never commit `.env` file** to version control
2. Use **App Passwords** for Gmail (not your main password)
3. In production, use **verified domain emails**
4. Enable **2FA** on email accounts
5. Consider using **dedicated email services** (SendGrid, Mailgun) for production
6. Set `SMTP_SECURE=true` when using port 465
7. Rotate credentials regularly

## 📊 Email Templates

The OTP email includes:
- Professional HTML design
- Gradient header with GO-FEZ branding
- Large, easy-to-read OTP code
- Expiration warning (10 minutes)
- Mobile-responsive layout
- Plain text fallback

## 🎯 Admin Settings

To enable/disable email verification:

1. Go to Admin Panel → Settings
2. Find "Email Verification" setting
3. Set to `true` to require OTP verification
4. Set to `false` to skip OTP and register directly

This is stored in database as `email_verification_enabled` setting.

## 📞 Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test with `node test-email.js`
4. Review the troubleshooting section above

---

**Last Updated:** November 2025
**Version:** 1.0.0
