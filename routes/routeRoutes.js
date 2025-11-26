const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { authenticateToken }= require('../middleware/authEnhanced')

// POST /api/routes/start
router.post('/start', authenticateToken, routeController.startRoute);

// NEW: Save a completed navigation route
// POST /api/routes/save
router.post('/save', authenticateToken, routeController.saveRoute);

// 2. Enregistrer une trace GPS et/ou une visite de POI
// POST /api/routes/trace
router.post('/trace', authenticateToken, routeController.addVisitedTrace);

// 5. Retirer un POI du circuit (Personnalisation)
// POST /api/routes/remove-poi
router.post('/remove-poi', authenticateToken, routeController.removePOIFromRoute);

// 6. Rajouter un POI au circuit (Personnalisation)
// POST /api/routes/add-poi
router.post('/add-poi', authenticateToken, routeController.addPOIToRoute);

// 7. Reorder POIs in custom circuit during navigation
// POST /api/routes/reorder-pois
router.post('/reorder-pois', authenticateToken, routeController.reorderCustomCircuitPOIs);

// NEW: Get user's saved routes with statistics (must be before /:id)
// GET /api/routes/user
router.get('/user', authenticateToken, routeController.getUserRoutes);

// Get all routes (admin)
router.get('/', authenticateToken, routeController.getAllRoutes);

// NEW: Get detailed route information for admin (must be before /:id but after more specific routes)
// GET /api/routes/admin/:id
router.get('/admin/:id', authenticateToken, routeController.getRouteDetailAdmin);

// GET /api/routes/:id → détail route (pois non retirés + traces)
// This must be last to avoid catching /user, /start, etc.
router.get('/:id', authenticateToken, routeController.getRouteById);

module.exports = router;