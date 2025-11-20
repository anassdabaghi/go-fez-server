const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
    getAllSettings,
    getSetting,
    updateSetting,
    updateMultipleSettings
} = require('../controllers/SettingsController');

const SettingsRouter = express.Router();

// Get all settings
SettingsRouter.get('/', getAllSettings);

// Get a specific setting by key
SettingsRouter.get('/:key', getSetting);

// Update a specific setting (admin only)
SettingsRouter.put('/:key', authenticateToken, updateSetting);

// Update multiple settings at once (admin only)
SettingsRouter.put('/', authenticateToken, updateMultipleSettings);

module.exports = { SettingsRouter };
