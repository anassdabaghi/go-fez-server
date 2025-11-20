const express = require('express');
const router = express.Router();
const SavePOIController = require('../controllers/SavePOIController');
const { authenticateToken } = require('../middleware/authEnhanced');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Sauvegarder un POI
router.post('/:poiId', SavePOIController.savePOI);

// Retirer un POI des sauvegardes
router.delete('/:poiId', SavePOIController.unsavePOI);

// Récupérer tous les POIs sauvegardés par l'utilisateur
router.get('/', SavePOIController.getSavedPOIs);

// Vérifier si un POI est sauvegardé
router.get('/check/:poiId', SavePOIController.checkIfSaved);

module.exports = router;

