const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const {
  authenticateToken,
  requireAdmin,
  authenticateHeaderToken,
} = require('../middleware/auth');
const { uploadImage } = require('../Config/cloudinary');
const {
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
  updateUserByAdmin,
  checkAdminRights,
} = require('../controllers/UserController.js');

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "Uploads/users/") // Assurez-vous que ce dossier existe
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
//     cb(null, "user-" + uniqueSuffix + path.extname(file.originalname))
//   },
// })

// Filtre pour n'accepter que les images
// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image/")) {
//     cb(null, true)
//   } else {
//     cb(new Error("Seules les images sont autorisées!"), false)
//   }
// }

// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // Limite à 5MB
//   },
// })

const UserRouter = express.Router();

// Routes
// Get all users (admin only)
UserRouter.get('/', authenticateToken, requireAdmin, findAllUsers);

UserRouter.post(
  '/register',
  [
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Le prénom doit contenir entre 2 et 100 caractères'),
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
      .withMessage(
        'Le mot de passe doit contenir au moins une lettre et un chiffre'
      ),
    handleValidationErrors,
  ],
  registerUser
);
UserRouter.post(
  '/otp/verify',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('otpCode')
      .isLength({ min: 6, max: 6 })
      .withMessage('Code OTP invalide'),
    handleValidationErrors,
  ],
  verifyOtp
);
UserRouter.post(
  '/login',
  [
    body('email')
      .notEmpty()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email requis et invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
    handleValidationErrors,
  ],
  loginUser
);

// Logout endpoint - clear httpOnly cookies
UserRouter.post('/logout', logoutUser);

UserRouter.post(
  '/verify-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('Code OTP invalide (6 chiffres requis)'),
    handleValidationErrors,
  ],
  verifyOTP
);

UserRouter.post(
  '/resend-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    handleValidationErrors,
  ],
  resendOTP
);
UserRouter.post(
  '/otp/send',
  [
    body('email').isEmail().withMessage('Email invalide'),
    handleValidationErrors,
  ],
  sendOtp
);
UserRouter.get('/profile', authenticateToken, getUserProfile);
UserRouter.get('/nc/profile', authenticateHeaderToken, getUserProfile);
UserRouter.get('/check-admin', authenticateToken, checkAdminRights);
UserRouter.put(
  '/profile',
  authenticateToken,
  uploadImage.single('profileImage'),
  updateUserProfile
);
UserRouter.put(
  '/profile/image',
  authenticateToken,
  uploadImage.single('profileImage'),
  updateUserProfile
);
UserRouter.get('/:id', findOneUser);
UserRouter.put('/update-password/:id', updatePassword);
UserRouter.post('/provider-register', registerWithProvider);

// Routes pour la réinitialisation de mot de passe
UserRouter.post(
  '/password-reset/send-otp',
  [
    body('email').isEmail().withMessage('Email invalide'),
    handleValidationErrors,
  ],
  sendPasswordResetOTP
);

UserRouter.post(
  '/password-reset/verify-otp',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('otpCode')
      .isLength({ min: 6, max: 6 })
      .withMessage('Code OTP invalide'),
    handleValidationErrors,
  ],
  verifyPasswordResetOTP
);

UserRouter.post(
  '/password-reset/reset',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('otpCode')
      .isLength({ min: 6, max: 6 })
      .withMessage('Code OTP invalide'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
      .withMessage(
        'Le mot de passe doit contenir au moins une lettre et un chiffre'
      ),
    handleValidationErrors,
  ],
  resetPassword
);

UserRouter.delete('/delete-account', authenticateToken, deleteUser);

// ===== ADMIN ROUTES =====
// Get all users (admin only)
UserRouter.get('/', authenticateToken, requireAdmin, findAllUsers);

// Create user (admin only)
UserRouter.post(
  '/admin/create',
  authenticateToken,
  requireAdmin,
  uploadImage.single('profileImage'),
  [
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Le prénom doit contenir entre 2 et 100 caractères'),
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères'),
    body('role')
      .optional()
      .isIn(['user', 'admin', 'moderator'])
      .withMessage('Rôle invalide'),
    handleValidationErrors,
  ],
  createUserByAdmin
);

// Update user (admin only)
UserRouter.put(
  '/admin/:id',
  authenticateToken,
  requireAdmin,
  uploadImage.single('profileImage'),
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Le prénom doit contenir entre 2 et 100 caractères'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email invalide'),
    body('password')
      .optional()
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
      .withMessage(
        'Le mot de passe doit contenir au moins une lettre et un chiffre'
      ),
    body('role')
      .optional()
      .isIn(['user', 'admin', 'moderator'])
      .withMessage('Rôle invalide'),
    handleValidationErrors,
  ],
  updateUserByAdmin
);

// Suspend/Unsuspend user (admin only)
UserRouter.put(
  '/admin/:id/suspend',
  authenticateToken,
  requireAdmin,
  suspendUser
);

// Update user role (admin only)
UserRouter.put(
  '/admin/:id/role',
  authenticateToken,
  requireAdmin,
  updateUserRole
);

// Delete user (admin only)
UserRouter.delete('/admin/:id', authenticateToken, requireAdmin, deleteUser);

module.exports = { UserRouter };
