require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * Test SMTP Configuration
 * Run this script to verify your email settings work correctly
 * 
 * Usage: node test-smtp.js
 */

async function testSMTPConnection() {
  console.log('\n🧪 Testing SMTP Configuration...\n');
  
  // Display configuration
  console.log('📧 Current SMTP Settings:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
  console.log('  SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
  console.log('  SMTP_SECURE:', process.env.SMTP_SECURE || 'NOT SET');
  console.log('  SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
  console.log('  SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***HIDDEN***' : 'NOT SET');
  console.log('  FROM_EMAIL:', process.env.FROM_EMAIL || 'NOT SET');
  console.log('  FROM_NAME:', process.env.FROM_NAME || 'NOT SET');
  console.log('  SKIP_EMAIL:', process.env.SKIP_EMAIL || 'false');
  console.log('');

  // Check if email is disabled
  if (process.env.SKIP_EMAIL === 'true') {
    console.log('⚠️  Email sending is disabled (SKIP_EMAIL=true)');
    console.log('   Set SKIP_EMAIL=false in .env to test email sending\n');
    return;
  }

  // Validate required fields
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.log('\n   Please set these in your .env file\n');
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Test 1: Verify connection
    console.log('🔌 Test 1: Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Test 2: Send test email
    console.log('📨 Test 2: Sending test email...');
    const testOTP = '123456';
    const testEmail = process.env.SMTP_USER; // Send to yourself
    
    const mailOptions = {
      from: {
        name: process.env.FROM_NAME || 'GO-FEZ',
        address: process.env.FROM_EMAIL || process.env.SMTP_USER,
      },
      to: testEmail,
      subject: '✅ GO-FEZ Email Test - Your SMTP is Working!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            .header { text-align: center; color: #02355E; margin-bottom: 20px; }
            .success { background: #10b981; color: white; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
            .otp-box { background: linear-gradient(135deg, #02355E 0%, #10b981 100%); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: white; letter-spacing: 5px; }
            .info { background: #f0f9ff; padding: 15px; border-left: 4px solid #0284c7; margin: 15px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 GO-FEZ Email Test</h1>
            </div>
            
            <div class="success">
              <strong>✅ SUCCESS!</strong> Your SMTP configuration is working correctly.
            </div>
            
            <div class="info">
              <strong>📧 SMTP Details:</strong><br>
              Host: ${process.env.SMTP_HOST}<br>
              Port: ${process.env.SMTP_PORT}<br>
              Secure: ${process.env.SMTP_SECURE || 'false'}<br>
              User: ${process.env.SMTP_USER}
            </div>
            
            <p>This is a test OTP email. Your users will receive emails like this when they sign up:</p>
            
            <div class="otp-box">
              <div style="color: white; font-size: 14px; margin-bottom: 10px;">VERIFICATION CODE</div>
              <div class="otp-code">${testOTP}</div>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>✅ SMTP configuration is working</li>
              <li>📧 Emails will be sent successfully</li>
              <li>🔐 OTP verification is ready to use</li>
              <li>🚀 You can now test the signup flow</li>
            </ul>
            
            <div class="footer">
              <p>This is an automated test email from GO-FEZ</p>
              <p>Sent: ${new Date().toLocaleString()}</p>
              <p>© ${new Date().getFullYear()} GO-FEZ. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
🎉 GO-FEZ Email Test

✅ SUCCESS! Your SMTP configuration is working correctly.

📧 SMTP Details:
Host: ${process.env.SMTP_HOST}
Port: ${process.env.SMTP_PORT}
Secure: ${process.env.SMTP_SECURE || 'false'}
User: ${process.env.SMTP_USER}

This is a test OTP code: ${testOTP}

Next Steps:
- ✅ SMTP configuration is working
- 📧 Emails will be sent successfully
- 🔐 OTP verification is ready to use
- 🚀 You can now test the signup flow

Sent: ${new Date().toLocaleString()}
© ${new Date().getFullYear()} GO-FEZ. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', testEmail);
    console.log('\n📬 Check your inbox (and spam folder) for the test email\n');
    
    console.log('🎉 All tests passed! Your SMTP configuration is working perfectly.\n');
    console.log('Next steps:');
    console.log('  1. Check your email inbox');
    console.log('  2. Enable email verification in Admin Settings');
    console.log('  3. Test the signup flow with OTP verification\n');
    
  } catch (error) {
    console.error('\n❌ Test failed!\n');
    console.error('Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication failed. Common fixes:');
      console.log('   - Gmail: Use App Password (not your regular password)');
      console.log('   - Enable 2FA and generate App Password at: https://myaccount.google.com/apppasswords');
      console.log('   - Make sure SMTP_USER and SMTP_PASSWORD are correct');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log('\n💡 Connection failed. Common fixes:');
      console.log('   - Check SMTP_HOST and SMTP_PORT are correct');
      console.log('   - Try port 465 with SMTP_SECURE=true');
      console.log('   - Check if firewall is blocking SMTP ports');
    } else if (error.code === 'ESOCKET') {
      console.log('\n💡 Socket error. Common fixes:');
      console.log('   - Try different port (587 or 465)');
      console.log('   - Toggle SMTP_SECURE setting');
    }
    
    console.log('\n📖 For more help, see EMAIL_SETUP_GUIDE.md\n');
  }
}

// Run the test
testSMTPConnection()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
