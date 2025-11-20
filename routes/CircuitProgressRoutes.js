// server-go-fez/routes/CircuitProgressRoutes.js
const express = require('express');
const router = express.Router();
const circuitProgressController = require('../controllers/CircuitProgressController');

// Import authentication middleware
const { authenticateToken } = require('../middleware/authEnhanced');

// Apply authentication to ALL routes
router.use(authenticateToken);
// Routes
router.post('/start', circuitProgressController.startCircuit);
router.post('/update', circuitProgressController.updateCircuitProgress);
router.get('/user', circuitProgressController.getAllUserProgress);
router.get('/:circuitId', circuitProgressController.getCircuitProgress);

module.exports = router;