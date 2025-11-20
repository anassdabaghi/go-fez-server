const transporter = require('./emailservice');
const bcrypt = require('bcryptjs');

/**
 * Génère un code OTP à 6 chiffres
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash le code OTP avant de le sauvegarder
 */
const hashOTP = async (otp) => {
  const saltRounds = 10;
  return await bcrypt.hash(otp, saltRounds);
};

/**
 * Vérifie si le code OTP correspond au hash
 */
const verifyOTPCode = async (otp, hashedOtp) => {
  return await bcrypt.compare(otp, hashedOtp);
};

/**
 * Envoie un email de vérification avec le code OTP
 */
const sendVerificationEmail = async (email, otp, userName = '') => {
  try {
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'GO-FEZ'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Vérification de votre email - GO-FEZ',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f4f7fa;
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 40px 30px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo-img {
              width: 80px;
              height: 80px;
              margin: 0 auto 15px;
              display: block;
            }
            .title {
              color: #10b981;
              font-size: 24px;
              font-weight: 600;
              margin: 0;
            }
            .content {
              color: #333;
              line-height: 1.6;
              margin-bottom: 30px;
            }
            .otp-box {
              background: linear-gradient(135deg, #02355E 0%, #10b981 100%);
              padding: 30px;
              border-radius: 10px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #ffffff;
              letter-spacing: 8px;
              margin: 10px 0;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            }
            .otp-label {
              color: #ffffff;
              font-size: 14px;
              margin-bottom: 10px;
              opacity: 0.9;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning-text {
              color: #92400e;
              margin: 0;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 13px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .footer-link {
              color: #10b981;
              text-decoration: none;
            }
            @media only screen and (max-width: 600px) {
              .container {
                padding: 30px 20px;
              }
              .otp-code {
                font-size: 28px;
                letter-spacing: 6px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://i.postimg.cc/K8hYSMyW/logo-nonhomepage.png" alt="GO-FEZ Logo" class="logo-img" />
              <h1 class="title">Vérifiez votre email</h1>
            </div>
            
            <div class="content">
              <p>Bonjour${userName ? ` <strong>${userName}</strong>` : ''},</p>
              <p>Merci de vous inscrire sur <strong>GO-FEZ</strong> ! Pour continuer, veuillez vérifier votre adresse email en utilisant le code ci-dessous :</p>
            </div>
            
            <div class="otp-box">
              <div class="otp-label">VOTRE CODE DE VÉRIFICATION</div>
              <div class="otp-code">${otp}</div>
            </div>
            
            <div class="warning">
              <p class="warning-text">⏱️ <strong>Ce code expire dans 10 minutes.</strong> Si vous n'avez pas demandé ce code, veuillez ignorer cet email.</p>
            </div>
            
            <div class="content">
              <p>Une fois votre email vérifié, vous pourrez profiter pleinement de votre expérience sur GO-FEZ et découvrir les merveilles de Fès !</p>
              <p>Bonne exploration ! 🗺️</p>
            </div>
            
            <div class="footer">
              <p>Cet email a été envoyé par <strong>GO-FEZ</strong></p>
              <p>Vous avez des questions ? <a href="mailto:support@go-fez.com" class="footer-link">Contactez-nous</a></p>
              <p style="margin-top: 15px; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} GO-FEZ. Tous droits réservés.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de vérification envoyé:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw new Error('Erreur lors de l\'envoi de l\'email de vérification');
  }
};

/**
 * Envoie un email de réinitialisation de mot de passe avec le code OTP
 */
const sendPasswordResetEmail = async (email, otp, userName = '') => {
  try {
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'GO-FEZ'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe - GO-FEZ',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f4f7fa;
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 40px 30px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo-img {
              width: 80px;
              height: 80px;
              margin: 0 auto 15px;
              display: block;
            }
            .title {
              color: #10b981;
              font-size: 24px;
              font-weight: 600;
              margin: 0;
            }
            .content {
              color: #333;
              line-height: 1.6;
              margin-bottom: 30px;
            }
            .otp-box {
              background: linear-gradient(135deg, #02355E 0%, #10b981 100%);
              padding: 30px;
              border-radius: 10px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #ffffff;
              letter-spacing: 8px;
              margin: 10px 0;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            }
            .otp-label {
              color: #ffffff;
              font-size: 14px;
              margin-bottom: 10px;
              opacity: 0.9;
            }
            .warning {
              background-color: #fee2e2;
              border-left: 4px solid #ef4444;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning-text {
              color: #991b1b;
              margin: 0;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 13px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .footer-link {
              color: #10b981;
              text-decoration: none;
            }
            @media only screen and (max-width: 600px) {
              .container {
                padding: 30px 20px;
              }
              .otp-code {
                font-size: 28px;
                letter-spacing: 6px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://i.postimg.cc/K8hYSMyW/logo-nonhomepage.png" alt="GO-FEZ Logo" class="logo-img" />
              <h1 class="title">Réinitialisation du mot de passe</h1>
            </div>
            
            <div class="content">
              <p>Bonjour${userName ? ` <strong>${userName}</strong>` : ''},</p>
              <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>GO-FEZ</strong>. Utilisez le code ci-dessous pour continuer :</p>
            </div>
            
            <div class="otp-box">
              <div class="otp-label">VOTRE CODE DE RÉINITIALISATION</div>
              <div class="otp-code">${otp}</div>
            </div>
            
            <div class="warning">
              <p class="warning-text">🔒 <strong>Ce code expire dans 10 minutes.</strong> Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email et votre mot de passe restera inchangé.</p>
            </div>
            
            <div class="content">
              <p>Une fois le code vérifié, vous pourrez définir un nouveau mot de passe sécurisé pour votre compte.</p>
            </div>
            
            <div class="footer">
              <p>Cet email a été envoyé par <strong>GO-FEZ</strong></p>
              <p>Vous avez des questions ? <a href="mailto:support@go-fez.com" class="footer-link">Contactez-nous</a></p>
              <p style="margin-top: 15px; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} GO-FEZ. Tous droits réservés.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de réinitialisation envoyé:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
    throw new Error('Erreur lors de l\'envoi de l\'email de réinitialisation');
  }
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP: verifyOTPCode,
  sendVerificationEmail,
  sendPasswordResetEmail
};

