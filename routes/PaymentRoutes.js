// server-go-fez/routes/PaymentRoutes.js

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/PaymentController');

// Importer le middleware d'authentification et d'admin
const { authenticate, isAdmin } = require('../middleware/authEnhanced');

/**
 * @route   POST /api/payments/create-intent
 * @desc    Créer une intention de paiement pour un abonnement
 * @access  Privé (Utilisateur connecté ou Admin)
 * @body    { plan ('premium', 'pro'), userId? (Admin only) }
 */
router.post(
	'/create-intent',
	paymentController.createPaymentIntent
);

/**
 * @route   POST /api/payments/webhook
 * @desc    Recevoir les événements du fournisseur de paiement (ex: paiement réussi)
 * @access  Public (mais doit être sécurisé par vérification de signature)
 */
router.post(
	'/webhook',
	// Note: Le middleware bodyParser.raw est souvent nécessaire ici pour vérifier la signature
	// express.raw({ type: 'application/json' }), // À ajouter si vous utilisez Stripe
	paymentController.handlePaymentWebhook
);

module.exports = router;