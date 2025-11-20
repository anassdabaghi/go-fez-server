// server-go-fez/routes/PartnerRoutes.js

const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/PartnerController');

// Importer middlewares
const { authenticate, isAdmin, upload } = require('../middleware/authEnhanced');

// --- Routes Publiques ---

/**
 * @route   GET /api/partners
 * @desc    Récupérer tous les partenaires actifs
 * @access  Public
 */
router.get('/', partnerController.getAllPartners);

/**
 * @route   GET /api/partners/:id
 * @desc    Récupérer un partenaire par ID
 * @access  Public
 */
router.get('/:id', partnerController.getPartnerById);

// --- Routes Utilisateur Connecté ---

/**
 * @route   POST /api/partners/visit
 * @desc    Enregistrer une visite chez un partenaire (via scan QR)
 * @access  Privé (Utilisateur connecté)
 * @body    { qrCode }
 */
router.post('/visit', partnerController.registerVisit);

// --- Routes Admin ---

/**
 * @route   POST /api/partners
 * @desc    Créer un nouveau partenaire
 * @access  Admin
 * @body    (voir controller)
 * @file    logo (optionnel)
 */
router.post(
	'/',
	partnerController.createPartner
);

/**
 * @route   PUT /api/partners/:id
 * @desc    Mettre à jour un partenaire
 * @access  Admin
 * @params  id
 * @body    (voir controller)
 * @file    logo (optionnel)
 */
router.put(
	'/:id',
	partnerController.updatePartner
);

/**
 * @route   DELETE /api/partners/:id
 * @desc    Supprimer (logiquement) un partenaire
 * @access  Admin
 * @params  id
 */
router.delete(
	'/:id',
	partnerController.deletePartner
);

module.exports = router;