// server-go-fez/services/OtpService.js
//const twilio = require('twilio');

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

let client = null;

// Only initialize if credentials are provided
if (accountSid && authToken) {
 // client = twilio(accountSid, authToken);
}

/**
 * Send OTP to phone number
 * @param {string} phone - Phone number with country code (e.g., +212612345678)
 * @returns {Promise<boolean>}
 */
async function sendOTP(phone) {
  if (!client || !serviceSid) {
    console.warn('⚠️ Twilio not configured. OTP not sent.');
    // For development: return true to allow testing
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 [DEV MODE] OTP would be sent to ${phone}`);
      return true;
    }
    return false;
  }

  try {
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: phone,
        channel: 'sms'
      });

    console.log(`✅ OTP sent to ${phone}: ${verification.status}`);
    return verification.status === 'pending';
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    return false;
  }
}

/**
 * Verify OTP code
 * @param {string} phone - Phone number with country code
 * @param {string} code - OTP code to verify
 * @returns {Promise<string>} - 'approved' if valid, 'pending' otherwise
 */
async function verifyOTP(phone, code) {
  if (!client || !serviceSid) {
    console.warn('⚠️ Twilio not configured. OTP verification skipped.');
    // For development: accept any 6-digit code
    if (process.env.NODE_ENV === 'development' && code.length === 6) {
      console.log(`📱 [DEV MODE] OTP ${code} would be verified for ${phone}`);
      return 'approved';
    }
    return 'pending';
  }

  try {
    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phone,
        code: code
      });

    console.log(`✅ OTP verification for ${phone}: ${verificationCheck.status}`);
    return verificationCheck.status;
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    return 'pending';
  }
}

module.exports = {
  sendOTP,
  verifyOTP
};