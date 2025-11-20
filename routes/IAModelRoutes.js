const express = require('express');
const router = express.Router();
const IAModelController = require('../controllers/IAModelController');

// All routes are public for now (remove authentication)
router.post('/translate', IAModelController.translateText);

// CRUD routes - specific routes first, then parameterized
router.get('/default', IAModelController.getDefaultIAModel); // Must be before /:id
router.get('/', IAModelController.getAllIAModels);
router.post('/', IAModelController.createIAModel);
router.get('/:id', IAModelController.getIAModelById); // After /default
router.put('/:id', IAModelController.updateIAModel);
router.delete('/:id', IAModelController.deleteIAModel);

module.exports = router;
