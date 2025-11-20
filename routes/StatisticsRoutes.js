// server-go-fez/routes/StatisticsRoutes.js

const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/StatisticsController');

// Importer middlewares
const { authenticate, isAdmin } = require('../middleware/authEnhanced');

// Toutes les routes statistiques sont réservées aux admins

/**
 * @route   GET /api/stats/overview
 * @desc    Récupérer les statistiques d'aperçu
 * @access  Admin
 */
router.get('/overview', statisticsController.getOverviewStats);

/**
 * @route   GET /api/stats/user-growth
 * @desc    Récupérer la croissance des utilisateurs (nouvelles inscriptions)
 * @access  Admin
 * @query   days? (défaut 7)
 */
router.get('/user-growth', statisticsController.getUserGrowth); // NOUVEAU

/**
 * @route   GET /api/stats/popular-pois
 * @desc    Récupérer les POIs les plus populaires par nombre d'avis
 * @access  Admin
 * @query   limit? (défaut 5)
 */
router.get('/popular-pois', statisticsController.getPopularPois);

/**
 * @route   GET /api/stats/theme-popularity
 * @desc    Récupérer les thèmes les plus populaires
 * @access  Admin
 * @query   limit? (défaut 3)
 */
router.get('/theme-popularity', statisticsController.getThemePopularity);

/**
 * @route   GET /api/stats/poi-category-distribution
 * @desc    Récupérer la distribution des catégories de POI
 * @access  Admin
 */
router.get('/poi-category-distribution', statisticsController.getPOICategoryDistribution);

module.exports = router;