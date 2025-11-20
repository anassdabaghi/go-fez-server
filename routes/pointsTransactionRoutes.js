const express = require('express');
const { createPointsTransaction, findUserTransactions } = require('../controllers/PointsTransactionController');
const { authenticateToken }= require('../middleware/authEnhanced')

const router = express.Router();

// Route pour créer une nouvelle transaction de points
router.post('/:activity', authenticateToken, createPointsTransaction);

// Route pour récupérer toutes les transactions d'un utilisateur
router.get('/user/:userId', authenticateToken, findUserTransactions);

module.exports = router;