/**
 * 📧 Email Configuration Test Script
 * 
 * This script tests your email configuration without starting the full server.
 * Run it with: node test-email.js your-email@example.com
 */

require('dotenv').config();
const { generateOTP, sendVerificationEmail } = require('./services/emailSender');

// Get email from command line argument
const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node test-email.js your-email@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(testEmail)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

// Check environment variables
console.log('\n🔍 Checking environment configuration...\n');

if (!process.env.EMAIL_USER) {
  console.error('❌ EMAIL_USER is not set in .env file');
  process.exit(1);
}

if (!process.env.EMAIL_PASS) {
  console.error('❌ EMAIL_PASS is not set in .env file');
  process.exit(1);
}

console.log('✅ EMAIL_USER:', process.env.EMAIL_USER);
console.log('✅ EMAIL_PASS:', '****' + process.env.EMAIL_PASS.slice(-4));
console.log('✅ SKIP_EMAIL:', process.env.SKIP_EMAIL || 'false');

// Test email sending
async function testEmailSetup() {
  console.log('\n📧 Testing email configuration...\n');
  console.log('Sending test email to:', testEmail);
  
  try {
    // Generate a test OTP
    const otp = generateOTP();
    console.log('Generated OTP:', otp);
    
    // Try to send the email
    console.log('\n⏳ Sending email...\n');
    await sendVerificationEmail(testEmail, otp);
    
    console.log('\n✅ SUCCESS! Email sent successfully!');
    console.log('\n📬 Check your inbox at:', testEmail);
    console.log('🔍 Also check your spam/junk folder if you don\'t see it');
    console.log('\n📝 Your test OTP code is:', otp);
    
  } catch (error) {
    console.error('\n❌ FAILED! Error sending email:');
    console.error(error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Troubleshooting steps:');
      console.log('1. Make sure you\'re using a Gmail App Password, not your regular password');
      console.log('2. Enable 2-Step Verification in your Google Account');
      console.log('3. Generate an App Password at: https://myaccount.google.com/apppasswords');
      console.log('4. Update EMAIL_PASS in your .env file with the App Password');
    } else if (error.message.includes('ECONNECTION') || error.message.includes('ETIMEDOUT')) {
      console.log('\n💡 Troubleshooting steps:');
      console.log('1. Check your internet connection');
      console.log('2. Make sure port 465 is not blocked by your firewall');
      console.log('3. Try using port 587 with TLS instead of SSL');
    }
    
    process.exit(1);
  }
}

testEmailSetup();
