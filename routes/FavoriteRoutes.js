// server-go-fez/routes/FavoriteRoutes.js

const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/FavoriteController');

// Importer le middleware d'authentification
const { authenticate } = require('../middleware/authEnhanced');

// Toutes les routes de favoris nécessitent que l'utilisateur soit connecté
//router.use(authenticate);

/**
 * @route   POST /api/favorites/toggle
 * @desc    Ajouter ou supprimer un POI des favoris
 * @access  Privé
 * @body    { poiId }
 */
router.post('/toggle', favoriteController.toggleFavorite);

/**
 * @route   GET /api/favorites
 * @desc    Récupérer tous les POIs favoris de l'utilisateur
 * @access  Privé
 */
router.get('/', favoriteController.getFavoritePOIs);

module.exports = router;