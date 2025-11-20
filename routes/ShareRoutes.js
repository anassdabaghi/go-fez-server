// server-go-fez/routes/ShareRoutes.js

const express = require('express');
const router = express.Router();
const shareController = require('../controllers/ShareController');

// Importer le middleware d'authentification
const { authenticateToken } = require('../middleware/authEnhanced');

/**
 * @route   POST /api/shares/register
 * @desc    Enregistrer une action de partage
 * @access  Privé (Utilisateur connecté)
 * @body    { resourceType, resourceId, platform }
 */
router.post(
	'/register',
	authenticateToken,
	shareController.registerShare
);

module.exports = router;