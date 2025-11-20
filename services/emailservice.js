require("dotenv").config();
const nodemailer = require("nodemailer");

/**
 * Generic SMTP Transporter Configuration
 * Supports any email provider (Gmail, Outlook, SendGrid, Mailgun, etc.)
 * 
 * Configuration via .env:
 * - SMTP_HOST: SMTP server hostname (e.g., smtp.gmail.com)
 * - SMTP_PORT: SMTP port (587 for TLS, 465 for SSL, 25 for unencrypted)
 * - SMTP_SECURE: true for SSL (port 465), false for TLS (port 587)
 * - SMTP_USER: SMTP username (usually your email)
 * - SMTP_PASSWORD: SMTP password or app-specific password
 * - FROM_EMAIL: Email address to send from
 * - FROM_NAME: Display name for emails
 */

const createTransporter = () => {
  // Skip email in development if configured
  if (process.env.SKIP_EMAIL === 'true') {
    console.log('⚠️ Email sending is disabled (SKIP_EMAIL=true)');
    return null;
  }

  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    // Connection settings
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,    // 5 seconds
    socketTimeout: 10000,     // 10 seconds
  };

  // Only add TLS options if not using SSL
  if (!config.secure) {
    config.tls = {
      rejectUnauthorized: false, // Allow self-signed certificates (use with caution in production)
    };
  }

  console.log('📧 SMTP Transporter Configuration:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user,
  });

  return nodemailer.createTransport(config);
};

// Create and export the transporter
const transporter = createTransporter();

// Test connection on startup (optional)
if (transporter && process.env.NODE_ENV !== 'production') {
  transporter.verify(function (error, success) {
    if (error) {
      console.error('❌ SMTP connection error:', error.message);
    } else {
      console.log('✅ SMTP server is ready to send emails');
    }
  });
}

module.exports = transporter;