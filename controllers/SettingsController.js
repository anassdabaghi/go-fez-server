const { Settings } = require('../models/Settings');

// Initialize default settings
const initializeDefaultSettings = async () => {
    const defaultSettings = [
        {
            key: 'email_verification_enabled',
            value: 'true',
            type: 'boolean',
            description: 'Enable or disable email verification during user signup'
        },
        {
            key: 'app_name',
            value: 'GO-FEZ',
            type: 'string',
            description: 'Application name'
        }
    ];

    for (const setting of defaultSettings) {
        await Settings.findOrCreate({
            where: { key: setting.key },
            defaults: setting
        });
    }
};

// Get all settings
const getAllSettings = async (req, res) => {
    try {
        const settings = await Settings.findAll({
            order: [['key', 'ASC']]
        });

        // Transform settings into a more usable format
        const settingsObject = {};
        settings.forEach(setting => {
            let value = setting.value;
            
            // Parse value based on type
            if (setting.type === 'boolean') {
                value = value === 'true' || value === true;
            } else if (setting.type === 'number') {
                value = parseFloat(value);
            } else if (setting.type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    console.error('Error parsing JSON setting:', setting.key);
                }
            }
            
            settingsObject[setting.key] = {
                value,
                type: setting.type,
                description: setting.description
            };
        });

        res.status(200).json({
            success: true,
            settings: settingsObject,
            settingsArray: settings
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching settings',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get a specific setting by key
const getSetting = async (req, res) => {
    try {
        const { key } = req.params;
        
        const setting = await Settings.findOne({
            where: { key }
        });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: `Setting '${key}' not found`
            });
        }

        let value = setting.value;
        
        // Parse value based on type
        if (setting.type === 'boolean') {
            value = value === 'true' || value === true;
        } else if (setting.type === 'number') {
            value = parseFloat(value);
        } else if (setting.type === 'json') {
            try {
                value = JSON.parse(value);
            } catch (e) {
                console.error('Error parsing JSON setting:', setting.key);
            }
        }

        res.status(200).json({
            success: true,
            setting: {
                key: setting.key,
                value,
                type: setting.type,
                description: setting.description
            }
        });
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching setting',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update a setting
const updateSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        const setting = await Settings.findOne({
            where: { key }
        });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: `Setting '${key}' not found`
            });
        }

        // Convert value to string for storage based on type
        let stringValue = value;
        if (setting.type === 'boolean') {
            stringValue = value ? 'true' : 'false';
        } else if (setting.type === 'number') {
            stringValue = value.toString();
        } else if (setting.type === 'json') {
            stringValue = JSON.stringify(value);
        }

        await setting.update({ value: stringValue });

        res.status(200).json({
            success: true,
            message: `Setting '${key}' updated successfully`,
            setting: {
                key: setting.key,
                value,
                type: setting.type,
                description: setting.description
            }
        });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating setting',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update multiple settings at once
const updateMultipleSettings = async (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Settings object is required'
            });
        }

        const results = [];
        
        for (const [key, value] of Object.entries(settings)) {
            const setting = await Settings.findOne({ where: { key } });
            
            if (setting) {
                let stringValue = value;
                if (setting.type === 'boolean') {
                    stringValue = value ? 'true' : 'false';
                } else if (setting.type === 'number') {
                    stringValue = value.toString();
                } else if (setting.type === 'json') {
                    stringValue = JSON.stringify(value);
                }
                
                await setting.update({ value: stringValue });
                results.push({ key, success: true });
            } else {
                results.push({ key, success: false, message: 'Not found' });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Settings updated',
            results
        });
    } catch (error) {
        console.error('Error updating multiple settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating settings',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    initializeDefaultSettings,
    getAllSettings,
    getSetting,
    updateSetting,
    updateMultipleSettings
};
