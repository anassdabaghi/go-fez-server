// server-go-fez/routes/CustomCircuitRoutes.js

const express = require('express');
const router = express.Router();
const customCircuitController = require('../controllers/CustomCircuitController');

// Importer le middleware d'authentification
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// TESTING MODE: Use optionalAuth instead of authenticateToken to allow testing without login
// Change back to authenticateToken when ready for production

/**
 * @route   POST /api/custom-circuits
 * @desc    Créer un nouveau circuit personnalisé
 * @access  Privé (Testing: Public avec userId par défaut)
 */
router.post('/', customCircuitController.createCustomCircuit);

/**
 * @route   GET /api/custom-circuits/user
 * @desc    Récupérer tous les circuits personnalisés de l'utilisateur connecté
 * @access  Privé (Testing: Public avec userId par défaut)
 */
router.get('/user', customCircuitController.getUserCustomCircuits);

/**
 * @route   GET /api/custom-circuits/:id
 * @desc    Récupérer un circuit personnalisé par ID (propriétaire ou public)
 * @access  Privé (Testing: Public avec userId par défaut)
 * @params  id
 */
router.get('/:id', customCircuitController.getCustomCircuitById);

/**
 * @route   PUT /api/custom-circuits/:id
 * @desc    Mettre à jour un circuit personnalisé (propriétaire uniquement)
 * @access  Privé (Testing: Public avec userId par défaut)
 * @params  id
 */
router.put('/:id', customCircuitController.updateCustomCircuit);

/**
 * @route   DELETE /api/custom-circuits/:id
 * @desc    Supprimer (logiquement) un circuit personnalisé (propriétaire uniquement)
 * @access  Privé (Testing: Public avec userId par défaut)
 * @params  id
 */
router.delete('/:id', customCircuitController.deleteCustomCircuit);

module.exports = router;