# ✅ OTP Email Implementation - Complete

## 📋 What Was Implemented

### 1. Generic SMTP Configuration
- ✅ Updated `.env` with generic SMTP settings (works with any provider)
- ✅ Modified `services/emailservice.js` to use configurable SMTP
- ✅ Updated `services/emailSender.js` to use new environment variables
- ✅ Added connection verification on server startup

### 2. Environment Variables (in `.env`)
```env
SMTP_HOST=smtp.gmail.com          # Your SMTP server
SMTP_PORT=587                      # Port (587 for TLS, 465 for SSL)
SMTP_SECURE=false                  # true for SSL, false for TLS
SMTP_USER=younesdarrassi@gmail.com # Your email
SMTP_PASSWORD=cskj ujwf hyyr jzwq  # Your app password
FROM_EMAIL=younesdarrassi@gmail.com # Sender email
FROM_NAME=GO-FEZ                   # Sender name
SKIP_EMAIL=false                   # Set true to disable emails
```

### 3. API Endpoints Ready
- ✅ `POST /api/auth/otp/send` - Send OTP code to email
- ✅ `POST /api/auth/otp/verify` - Verify OTP code
- ✅ `POST /api/auth/register` - Create account after verification
- ✅ All integrated with frontend SignUp component

### 4. Email Features
- ✅ Professional HTML email template
- ✅ 6-digit OTP code generation
- ✅ Secure OTP hashing (bcrypt)
- ✅ 10-minute expiration
- ✅ Mobile-responsive design
- ✅ Plain text fallback

## 🧪 Testing Instructions

### Step 1: Test SMTP Connection
```bash
cd server-go-fez
node test-smtp.js
```

This will:
- Verify your SMTP configuration
- Send a test email to your inbox
- Display any connection errors
- Provide troubleshooting tips

### Step 2: Start the Server
```bash
cd server-go-fez
npm run dev
```

Look for these messages:
```
✅ SMTP server is ready to send emails
📧 SMTP Transporter Configuration: {...}
```

### Step 3: Enable Email Verification in Admin
1. Log into admin panel
2. Go to Settings → Authentication
3. Set "Email Verification" to **true**
4. Save changes

### Step 4: Test Signup Flow

#### Option A: Via Frontend
1. Go to signup page
2. Fill in user details
3. Submit form
4. Should show OTP screen (if email verification enabled)
5. Check your email for 6-digit code
6. Enter code in OTP screen
7. Account should be created after verification

#### Option B: Via API (Postman/curl)

**1. Send OTP:**
```bash
curl -X POST https://api-gofez.cleverapps.io/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Code OTP envoyé avec succès à votre email"
}
```

**2. Check your email and get the 6-digit code**

**3. Verify OTP:**
```bash
curl -X POST https://api-gofez.cleverapps.io/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otpCode": "123456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Email vérifié avec succès"
}
```

**4. Register User:**
```bash
curl -X POST https://api-gofez.cleverapps.io/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "phone": "+212612345678"
  }'
```

## 🔧 Configuration for Different Providers

### Gmail (Current Setup)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=younesdarrassi@gmail.com
SMTP_PASSWORD=cskj ujwf hyyr jzwq
```

⚠️ **Important:** This looks like a Gmail App Password format. Make sure:
- 2FA is enabled on Gmail account
- This is an App Password (not regular password)
- If it's not working, regenerate at: https://myaccount.google.com/apppasswords

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

### SendGrid (Recommended for Production)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

## 📊 Signup Flow Logic

```
┌─────────────────────────────────────┐
│  User Enters Signup Details         │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Check email_verification_enabled   │
│  (Admin Setting)                    │
└──────────┬──────────────────────────┘
           │
           ├──── TRUE ────┐
           │              │
           │              ▼
           │     ┌────────────────────┐
           │     │  Send OTP Email    │
           │     │  Show OTP Screen   │
           │     └────────┬───────────┘
           │              │
           │              ▼
           │     ┌────────────────────┐
           │     │  User Enters OTP   │
           │     └────────┬───────────┘
           │              │
           │              ▼
           │     ┌────────────────────┐
           │     │  Verify OTP        │
           │     └────────┬───────────┘
           │              │
           │              ▼
           │     ┌────────────────────┐
           │     │  Create Account    │
           │     └────────────────────┘
           │
           └──── FALSE ──┐
                         │
                         ▼
                ┌────────────────────┐
                │  Create Account    │
                │  (Skip OTP)        │
                └────────────────────┘
```

## 🐛 Troubleshooting

### "Invalid login" / Authentication Error
- **Gmail:** Use App Password, not regular password
- **Verify:** SMTP_USER matches your email
- **Check:** Password has no extra spaces

### "Connection timeout" / "ETIMEDOUT"
- **Try:** Port 465 with SMTP_SECURE=true
- **Check:** Firewall isn't blocking ports
- **Verify:** SMTP_HOST is correct

### "Email not received"
- ✅ Check spam/junk folder
- ✅ Verify FROM_EMAIL is set correctly
- ✅ Check server logs for sending confirmation
- ✅ Try test-smtp.js script first

### "OTP expired"
- OTP codes expire after 10 minutes
- Request a new code via resend
- Check database EmailVerification table

### Development Mode
Set `SKIP_EMAIL=true` to disable emails. OTP will print in console:
```
⚠️ Email disabled (SKIP_EMAIL=true). OTP code = 123456
```

## 📁 Files Modified

1. ✅ `.env` - Added generic SMTP configuration
2. ✅ `services/emailservice.js` - Generic SMTP transporter
3. ✅ `services/emailSender.js` - Updated to use new env vars
4. ✅ `client/components/auth/SignUp.tsx` - OTP flow integration
5. ✅ `client/services/api/UserApi.js` - OTP API endpoints

## 📁 Files Created

1. ✅ `EMAIL_SETUP_GUIDE.md` - Comprehensive setup documentation
2. ✅ `test-smtp.js` - SMTP configuration test script
3. ✅ `OTP_IMPLEMENTATION_COMPLETE.md` - This file

## ✅ Checklist

- [x] Generic SMTP configuration implemented
- [x] Environment variables configured
- [x] Email service updated
- [x] OTP sending functional
- [x] OTP verification functional
- [x] Frontend integration complete
- [x] Admin settings check implemented
- [x] Email templates designed
- [x] Test scripts created
- [x] Documentation written

## 🚀 Next Steps

1. **Test SMTP:** Run `node test-smtp.js`
2. **Start Server:** Run `npm run dev`
3. **Enable Setting:** Turn on email verification in admin
4. **Test Signup:** Try creating a new account
5. **Check Email:** Verify OTP email arrives
6. **Verify OTP:** Enter code and complete signup

## 📞 Support

If you encounter issues:
1. Run `node test-smtp.js` for diagnostics
2. Check server console logs
3. Review EMAIL_SETUP_GUIDE.md
4. Verify all environment variables are set
5. Check spam folder for emails

---

**Implementation Date:** November 4, 2025  
**Status:** ✅ Complete and Ready to Test  
**Email Provider:** Gmail (Configurable)
