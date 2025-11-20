const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models/User');
const { EmailVerification } = require('../models/EmailVerification');
const { Settings } = require('../models/Settings');
const {
  generateOTP,
  hashOTP,
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../services/emailSender');
const { checkStreakBonus } = require('../services/GamificationService');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const generateTokens = (user) => {
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      primaryIdentifier: user.primaryIdentifier,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      primaryIdentifier: user.primaryIdentifier,
      authProvider: user.authProvider,
    },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );

  return { token, refreshToken };
};
const generateAndSetTokens = (user, res) => {
  const tokens = generateTokens(user);
  const isProduction = process.env.NODE_ENV === 'production';
  const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction, // requis si sameSite=None
    sameSite: isProduction ? 'None' : 'Lax',
    path: '/',
  };

  // Cookie pour le token d'accès (tk)
  res.cookie('tk', tokens.token, {
    ...baseCookieOptions,
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
  });

  // Cookie pour le refresh token
  res.cookie('refreshToken', tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
  });

  return tokens;
};
// Middleware pour vérifier les erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erreurs de validation',
      errors: errors.array(),
    });
  }
  next();
};

// Méthode d'inscription (SignUp)
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Vérifier que l'email est fourni
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis',
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    // Hacher le mot de passe
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Check if email verification is enabled
    const emailVerificationSetting = await Settings.findOne({
      where: { key: 'email_verification_enabled' },
    });

    const isEmailVerificationEnabled = emailVerificationSetting
      ? emailVerificationSetting.value === 'true'
      : true; // Default to true if setting doesn't exist

    // Créer l'utilisateur - always set isVerified to false initially
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      authProvider: 'email',
      primaryIdentifier: email,
      isVerified: false, // Always false - verification handled by settings
      role: 'user',
    });

    // Only send OTP if email verification is enabled
    if (isEmailVerificationEnabled) {
      // Générer un code OTP à 6 chiffres
      const otp = generateOTP();

      // Hasher l'OTP avant de le sauvegarder
      const hashedOTP = await hashOTP(otp);

      // Calculer la date d'expiration (10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Supprimer l'ancien OTP s'il existe pour cet email
      await EmailVerification.destroy({
        where: { email },
      });

      // Sauvegarder l'OTP dans la base de données
      await EmailVerification.create({
        email,
        otp: hashedOTP,
        expiresAt,
      });

      // Envoyer l'email avec le code OTP
      if (process.env.SKIP_EMAIL !== 'true') {
        try {
          await sendVerificationEmail(email, otp);
          console.log(`📧 Code OTP envoyé à ${email}`);
        } catch (emailError) {
          console.error("❌ Erreur lors de l'envoi de l'email:", emailError);
          console.log(`⚠️ Mode développement : Code OTP = ${otp}`);
        }
      } else {
        console.log(`⚠️ Email désactivé (SKIP_EMAIL=true). Code OTP = ${otp}`);
      }
    }

    // Retourner la réponse sans le mot de passe
    const userResponse = {
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      authProvider: newUser.authProvider,
      isVerified: newUser.isVerified,
      role: newUser.role,
      profileImage: newUser.profileImage,
      createdAt: newUser.createdAt,
    };

    const message = isEmailVerificationEnabled
      ? 'Utilisateur créé avec succès. Veuillez vérifier votre email pour activer votre compte.'
      : 'Utilisateur créé avec succès. Votre compte est déjà activé.';

    res.status(201).json({
      success: true,
      message,
      user: userResponse,
      requiresVerification: isEmailVerificationEnabled,
    });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Méthode de connexion (Login)
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier que l'email est fourni
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis',
      });
    }

    // Trouver l'utilisateur par email
    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides',
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides',
      });
    }

    // Générer le token JWT
    const tokens = generateAndSetTokens(user, res);

    // Check and award daily login streak
    checkStreakBonus(user.id).catch((err) =>
      console.error('Error checking streak bonus:', err)
    );

    // Retourner la réponse sans le mot de passe
    const userResponse = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      authProvider: user.authProvider,
      isVerified: user.isVerified,
      role: user.role,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    };

    console.log('Tokens set in httpOnly cookies');

    const responseData = {
      success: true,
      message: 'Connexion réussie',
      user: userResponse,
      // token and refresh token should be removed from response body for security reasons
      //the web apps(izidoor, go-fes) doesnt use it , but mobile apps need it
      token: tokens.token,
      refreshToken: tokens.refreshToken,
    };

    console.log('Response being sent:', JSON.stringify(responseData, null, 2));

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Méthode pour obtenir le profil utilisateur
const getUserProfile = async (req, res) => {
  try {
    // The authenticateToken middleware has already verified the token
    // and added req.user with userId
    const userId = req.user.userId;

    // Récupérer l'utilisateur
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    res.status(200).json({
      success: true,
      data: user, // Changed from 'user' to 'data' for consistency with other APIs
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Méthode pour mettre à jour le profil utilisateur

const updateUserProfile = async (req, res) => {
  try {
    console.log('📝 [updateUserProfile] Starting profile update...');
    console.log('📝 [updateUserProfile] Request body:', req.body);
    console.log('📝 [updateUserProfile] Request file:', req.file);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(
        '❌ [updateUserProfile] Missing or invalid authorization header'
      );
      return res.status(401).json({
        success: false,
        message: "Jeton d'authentification (Token) manquant ou invalide",
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-fallback'
    );

    const userId = decoded.userId;
    console.log('👤 [updateUserProfile] User ID:', userId);

    const rawUpdateData = req.body;

    const ALLOWED_FIELDS = [
      'firstName',
      'lastName',
      'phone',
      'location',
      'email',
    ];

    const updateData = {};

    for (const key of ALLOWED_FIELDS) {
      if (rawUpdateData[key] !== undefined) {
        updateData[key] = rawUpdateData[key];
      }
    }

    // Handle password update separately (needs hashing)
    if (rawUpdateData.password && rawUpdateData.password.trim() !== '') {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(
        rawUpdateData.password,
        saltRounds
      );
    }

    if (req.file) {
      console.log('📷 [updateUserProfile] Image file received:', req.file.path);
      updateData.profileImage = req.file.path;
    }

    if (Object.keys(updateData).length === 0) {
      console.warn('⚠️ [updateUserProfile] No valid fields to update');
      return res.status(400).json({
        success: false,
        message: 'Veuillez envoyer des champs valides pour la mise à jour',
      });
    }

    console.log('💾 [updateUserProfile] Update data:', updateData);

    const [updatedRowsCount] = await User.update(updateData, {
      where: { id: userId },
      fields: Object.keys(updateData),
      validate: false,
    });

    if (updatedRowsCount === 0) {
      console.error('❌ [updateUserProfile] User not found or no data updated');
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable ou aucune donnée n'a été mise à jour",
      });
    }

    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
    });

    console.log('✅ [updateUserProfile] Profile updated successfully');
    res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: updatedUser,
    });
  } catch (error) {
    console.error('❌ [updateUserProfile] Error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res
        .status(401)
        .json({ success: false, message: "Jeton d'authentification invalide" });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur lors de la mise à jour du profil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Méthode pour récupérer tous les utilisateurs (admin)
const findAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

// Méthode pour récupérer un utilisateur par ID
const findOneUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};
const sendOtp = async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis',
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();

    // Hash the OTP before storing
    const hashedOTP = await hashOTP(otp);

    // Calculate expiration time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete old OTP if exists
    await EmailVerification.destroy({
      where: { email },
    });

    // Save OTP to database
    await EmailVerification.create({
      email,
      otp: hashedOTP,
      expiresAt,
    });

    // Send email with OTP
    if (process.env.SKIP_EMAIL !== 'true') {
      try {
        // Create full name for email greeting
        const userName =
          firstName && lastName ? `${firstName} ${lastName}` : firstName || '';
        await sendVerificationEmail(email, otp, userName);
        console.log(`📧 OTP sent to ${email}`);
      } catch (emailError) {
        console.error('❌ Error sending email:', emailError);
        console.log(`⚠️ Development mode: OTP code = ${otp}`);
      }
    } else {
      console.log(`⚠️ Email disabled (SKIP_EMAIL=true). OTP code = ${otp}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Code OTP envoyé avec succès à votre email',
    });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de l'envoi du code OTP",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email et code OTP requis',
      });
    }

    // Find OTP record
    const otpRecord = await EmailVerification.findOne({
      where: { email },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message:
          'Aucun code OTP trouvé pour cet email. Veuillez demander un nouveau code.',
      });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await EmailVerification.destroy({ where: { email } });
      return res.status(400).json({
        success: false,
        message: 'Le code OTP a expiré. Veuillez demander un nouveau code.',
      });
    }

    // Verify OTP
    const { verifyOTP: verifyOTPCode } = require('../services/emailSender');
    const isValid = await verifyOTPCode(otpCode, otpRecord.otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Code OTP invalide',
      });
    }

    // Delete OTP after successful verification
    await EmailVerification.destroy({ where: { email } });

    // Update user verification status if user exists
    const user = await User.findOne({ where: { email } });
    if (user && !user.isVerified) {
      await user.update({ isVerified: true });
    }

    return res.status(200).json({
      success: true,
      message: 'Email vérifié avec succès',
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification du code OTP',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};
const registerWithProvider = async (req, res) => {
  try {
    const { provider, id, firstName, lastName, email, phone } = req.body;

    if (!provider || !['google', 'facebook'].includes(provider)) {
      return res
        .status(400)
        .json({ success: false, message: 'Provider invalide' });
    }

    const primaryIdentifier = provider === 'google' ? email : id;

    const existingUser = await User.findOne({
      where: {
        [User.sequelize.Sequelize.Op.or]: [
          { primaryIdentifier },
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      const tokens = generateAndSetTokens(existingUser, res);
      return res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        user: {
          id: existingUser.id,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email,
          phone: existingUser.phone,
          authProvider: existingUser.authProvider,
          primaryIdentifier: existingUser.primaryIdentifier,
          profileImage: existingUser.profileImage,
          role: existingUser.role,
        },
        tokens,
      });
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      authProvider: provider,
      primaryIdentifier,
      googleId: provider === 'google' ? id : null,
      facebookId: provider === 'facebook' ? id : null,
      facebookEmail: provider === 'facebook' ? email : null,
      facebookPhone: provider === 'facebook' ? phone : null,
      isVerified: true,
      role: 'user',
    });

    const tokens = generateAndSetTokens(newUser, res);

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        authProvider: newUser.authProvider,
        primaryIdentifier: newUser.primaryIdentifier,
        profileImage: newUser.profileImage,
        role: newUser.role,
      },
      tokens,
    });
  } catch (error) {
    console.error('Erreur provider signup:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
// Méthode pour mettre à jour le mot de passe
const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect',
      });
    }

    // Hacher le nouveau mot de passe
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe
    await User.update({ password: hashedNewPassword }, { where: { id } });

    res.status(200).json({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

// Méthode pour renvoyer un code OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis',
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur trouvé avec cet email',
      });
    }

    // Vérifier que l'utilisateur n'est pas déjà vérifié
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà vérifié',
      });
    }

    // Générer un nouveau code OTP
    const otp = generateOTP();

    // Hasher l'OTP
    const hashedOTP = await hashOTP(otp);

    // Calculer la nouvelle date d'expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Supprimer l'ancien OTP
    await EmailVerification.destroy({
      where: { email },
    });

    // Créer un nouveau OTP
    await EmailVerification.create({
      email,
      otp: hashedOTP,
      expiresAt,
    });

    // Envoyer l'email avec le nouveau code
    if (process.env.SKIP_EMAIL !== 'true') {
      try {
        await sendVerificationEmail(email, otp);
        console.log(`📧 Nouveau code OTP envoyé à ${email}`);
      } catch (emailError) {
        console.error("❌ Erreur lors de l'envoi de l'email:", emailError);
        console.log(`⚠️ Mode développement : Nouveau code OTP = ${otp}`);
      }
    } else {
      console.log(
        `⚠️ Email désactivé (SKIP_EMAIL=true). Nouveau code OTP = ${otp}`
      );
    }

    res.status(200).json({
      success: true,
      message: 'Un nouveau code de vérification a été envoyé à votre email',
    });
  } catch (error) {
    console.error("Erreur lors du renvoi de l'OTP:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

// Méthode pour vérifier l'OTP et activer le compte
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email et code OTP requis',
      });
    }

    // Récupérer l'enregistrement de vérification
    const verification = await EmailVerification.findOne({
      where: { email },
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Aucun code de vérification trouvé pour cet email',
      });
    }

    // Vérifier si l'OTP est expiré
    if (new Date(verification.expiresAt) < new Date()) {
      // Supprimer l'OTP expiré
      await EmailVerification.destroy({ where: { id: verification.id } });
      return res.status(400).json({
        success: false,
        message: 'Le code OTP a expiré. Veuillez demander un nouveau code.',
      });
    }

    // Vérifier si le code OTP correspond
    const { verifyOTP: checkOTP } = require('../services/emailSender');
    const isOTPValid = await checkOTP(otp.toString(), verification.otp);

    if (!isOTPValid) {
      return res.status(400).json({
        success: false,
        message: 'Code OTP invalide',
      });
    }

    // Mettre à jour l'utilisateur : isVerified = true
    await User.update(
      { isVerified: true },
      { where: { email }, validate: false }
    );

    // Supprimer l'enregistrement de vérification
    await EmailVerification.destroy({ where: { id: verification.id } });

    // Récupérer l'utilisateur vérifié pour générer les tokens
    const verifiedUser = await User.findOne({ where: { email } });

    if (!verifiedUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    // Générer les tokens JWT
    const tokens = generateAndSetTokens(verifiedUser, res);

    console.log(`✅ Email vérifié pour : ${email}`);

    // Retourner la réponse sans le mot de passe
    const userResponse = {
      id: verifiedUser.id,
      firstName: verifiedUser.firstName,
      lastName: verifiedUser.lastName,
      email: verifiedUser.email,
      authProvider: verifiedUser.authProvider,
      isVerified: verifiedUser.isVerified,
      role: verifiedUser.role,
      createdAt: verifiedUser.createdAt,
    };

    res.status(200).json({
      success: true,
      message: 'Email vérifié avec succès. Votre compte est maintenant actif.',
      user: userResponse,
      token: tokens.token,
    });
  } catch (error) {
    console.error("Erreur lors de la vérification de l'OTP:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

// Méthode pour envoyer un OTP de réinitialisation de mot de passe
const sendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis',
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur trouvé avec cet email',
      });
    }

    // Générer un code OTP à 6 chiffres
    const otp = generateOTP();

    // Hasher l'OTP avant de le sauvegarder
    const hashedOTP = await hashOTP(otp);

    // Calculer la date d'expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Supprimer l'ancien OTP s'il existe pour cet email
    await EmailVerification.destroy({
      where: { email },
    });

    // Sauvegarder l'OTP dans la base de données
    await EmailVerification.create({
      email,
      otp: hashedOTP,
      expiresAt,
    });

    // Envoyer l'email avec le code OTP
    if (process.env.SKIP_EMAIL !== 'true') {
      try {
        const userName =
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.firstName || '';
        await sendPasswordResetEmail(email, otp, userName);
        console.log(`📧 Code OTP de réinitialisation envoyé à ${email}`);
      } catch (emailError) {
        console.error("❌ Erreur lors de l'envoi de l'email:", emailError);
        console.log(`⚠️ Mode développement : Code OTP = ${otp}`);
      }
    } else {
      console.log(`⚠️ Email désactivé (SKIP_EMAIL=true). Code OTP = ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'Code OTP de réinitialisation envoyé avec succès à votre email',
    });
  } catch (error) {
    console.error(
      "Erreur lors de l'envoi de l'OTP de réinitialisation:",
      error
    );
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

// Méthode pour vérifier l'OTP de réinitialisation de mot de passe
const verifyPasswordResetOTP = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email et code OTP requis',
      });
    }

    // Récupérer l'enregistrement de vérification
    const verification = await EmailVerification.findOne({
      where: { email },
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message:
          'Aucun code OTP trouvé pour cet email. Veuillez demander un nouveau code.',
      });
    }

    // Vérifier si l'OTP est expiré
    if (new Date(verification.expiresAt) < new Date()) {
      await EmailVerification.destroy({ where: { email } });
      return res.status(400).json({
        success: false,
        message: 'Le code OTP a expiré. Veuillez demander un nouveau code.',
      });
    }

    // Vérifier si le code OTP correspond
    const { verifyOTP: checkOTP } = require('../services/emailSender');
    const isOTPValid = await checkOTP(otpCode.toString(), verification.otp);

    if (!isOTPValid) {
      return res.status(400).json({
        success: false,
        message: 'Code OTP invalide',
      });
    }

    // Ne pas supprimer l'OTP ici - on le garde pour la vérification finale dans resetPassword
    // On retourne juste un succès pour permettre de passer à l'étape suivante

    res.status(200).json({
      success: true,
      message:
        'Code OTP vérifié avec succès. Vous pouvez maintenant définir un nouveau mot de passe.',
    });
  } catch (error) {
    console.error(
      "Erreur lors de la vérification de l'OTP de réinitialisation:",
      error
    );
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

// Méthode pour réinitialiser le mot de passe après vérification OTP
const resetPassword = async (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body;

    if (!email || !otpCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, code OTP et nouveau mot de passe requis',
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    // Récupérer l'enregistrement de vérification
    const verification = await EmailVerification.findOne({
      where: { email },
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message:
          'Aucun code OTP trouvé pour cet email. Veuillez recommencer le processus.',
      });
    }

    // Vérifier si l'OTP est expiré
    if (new Date(verification.expiresAt) < new Date()) {
      await EmailVerification.destroy({ where: { email } });
      return res.status(400).json({
        success: false,
        message: 'Le code OTP a expiré. Veuillez demander un nouveau code.',
      });
    }

    // Vérifier si le code OTP correspond
    const { verifyOTP: checkOTP } = require('../services/emailSender');
    const isOTPValid = await checkOTP(otpCode.toString(), verification.otp);

    if (!isOTPValid) {
      return res.status(400).json({
        success: false,
        message: 'Code OTP invalide',
      });
    }

    // Hacher le nouveau mot de passe
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe (désactiver la validation pour éviter les erreurs de primaryIdentifier)
    await User.update(
      { password: hashedNewPassword },
      { where: { id: user.id }, validate: false }
    );

    // Supprimer l'OTP après utilisation
    await EmailVerification.destroy({ where: { email } });

    // Générer les tokens JWT (comme dans loginUser)
    const tokens = generateAndSetTokens(user, res);

    console.log(`✅ Mot de passe réinitialisé pour : ${email}`);

    // Retourner la réponse avec les tokens (même structure que loginUser)
    const userResponse = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      authProvider: user.authProvider,
      isVerified: user.isVerified,
      role: user.role,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      message:
        'Mot de passe réinitialisé avec succès. Vous êtes maintenant connecté.',
      user: userResponse,
      // Note: tokens are sent via httpOnly cookies, not in response body
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

/**
 * Fonction: deleteUser
 * *  Objectif: Exécute la suppression douce (Soft Delete) du compte utilisateur authentifié.
 * Elle anonymise les informations personnelles sensibles (conformité CNPD - Droit à l'effacement)
 * et marque le compte comme supprimé (isDeleted: true) sans effacer l'enregistrement physique.
 * * @param {object} req - Objet de requête Express (doit contenir le JWT).
 * @param {object} res - Objet de réponse Express.
 */
const deleteUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: "Jeton d'authentification manquant ou invalide",
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-fallback'
    );

    const userId = decoded.userId;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "L'utilisateur est introuvable.",
      });
    }

    const anonymizationData = {
      firstName: 'Utilisateur',
      lastName: 'supprimé',
      email: null,
      phone: null,
      profileImage: null,
      authProvider: null,
      primaryIdentifier: null,
      password: null,
      username: 'Utilisateur supprimé',
      isDeleted: true,
      deletedAt: new Date(),
    };

    const [updatedRowsCount] = await User.update(anonymizationData, {
      where: { id: userId },
      validate: false,
    });

    if (updatedRowsCount === 0) {
      return res.status(500).json({
        success: false,
        message: 'Échec de la mise à jour du statut de suppression.',
      });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message:
        'Compte supprimé et données personnelles anonymisées avec succès (Conformité CNPD).',
      data: {
        id: userId,
        email: null,
        username: 'Utilisateur supprimé',
        deletedAt: anonymizationData.deletedAt,
        isDeleted: true,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);

    if (error.name === 'JsonWebTokenError') {
      return res
        .status(401)
        .json({ success: false, message: "Jeton d'authentification invalide" });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur lors de la suppression du profil.',
    });
  }
};

/**
 * Admin: Suspend/Unsuspend user account
 */
const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable',
      });
    }

    // Toggle the suspension state
    const newSuspendState = !user.isDeleted;

    await user.update({
      isDeleted: newSuspendState,
      deletedAt: newSuspendState ? new Date() : null,
    });

    res.status(200).json({
      success: true,
      message: newSuspendState
        ? 'Utilisateur suspendu avec succès'
        : 'Suspension levée avec succès',
      user: {
        id: user.id,
        isDeleted: user.isDeleted,
        deletedAt: user.deletedAt,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la suspension:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

/**
 * Admin: Update user role
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide',
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable',
      });
    }

    await user.update({ role });

    res.status(200).json({
      success: true,
      message: 'Rôle mis à jour avec succès',
      user: {
        id: user.id,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rôle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

/**
 * Admin: Create new user
 */
const createUserByAdmin = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role = 'user',
      location,
    } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      authProvider: 'email',
      primaryIdentifier: email,
      isVerified: true,
      role,
      location,
      profileImage: req.file ? req.file.path : null,
    });

    const userResponse = {
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role,
      location: newUser.location,
      profileImage: newUser.profileImage,
      isVerified: newUser.isVerified,
      createdAt: newUser.createdAt,
    };

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: userResponse,
    });
  } catch (error) {
    console.error('Erreur lors de la création:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

/**
 * Admin: Update user by ID
 */
const updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, location, password } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable',
      });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Cet email est déjà utilisé',
        });
      }
    }

    // Prepare update data
    const updateData = {
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      email: email || user.email,
      role: role || user.role,
      location: location !== undefined ? location : user.location,
      profileImage: req.file ? req.file.path : user.profileImage,
    };

    // Hash new password if provided
    if (password && password.trim() !== '') {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    await user.update(updateData);

    const userResponse = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      location: user.location,
      profileImage: user.profileImage,
      isVerified: user.isVerified,
      isDeleted: user.isDeleted,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      user: userResponse,
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

// Check if user has admin or moderator rights
const checkAdminRights = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'role', 'email']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
        isAdmin: false
      });
    }

    const isAdmin = user.role === 'admin';

    return res.status(200).json({
      success: true,
      isAdmin: isAdmin,
      role: user.role
    });
  } catch (error) {
    console.error('Erreur lors de la vérification des droits admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      isAdmin: false
    });
  }
};

// Logout endpoint - clear httpOnly cookies
const logoutUser = async (req, res) => {
  try {
    // Clear httpOnly cookies
    res.clearCookie('tk', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
    });

    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie',
    });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

module.exports = {
  registerWithProvider,
  verifyOtp,
  sendOtp,
  handleValidationErrors,
  registerUser,
  loginUser,
  logoutUser,
  verifyOTP,
  resendOTP,
  getUserProfile,
  updateUserProfile,
  findAllUsers,
  findOneUser,
  updatePassword,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
  deleteUser,
  suspendUser,
  updateUserRole,
  createUserByAdmin,
  checkAdminRights,
  updateUserByAdmin,
};
