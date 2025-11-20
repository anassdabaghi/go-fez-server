const express = require('express');
const router = express.Router();
const themeCircuitController = require('../controllers/themeCircuitController');

router.post('/', themeCircuitController.addThemeToCircuit);
router.get('/', themeCircuitController.getAllThemeCircuits);
router.delete('/:id', themeCircuitController.deleteThemeCircuit);

module.exports = router;
