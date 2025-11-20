// scripts/seedSettings.js

require('dotenv').config();
const db = require('../Config/db'); 
const { Settings } = require('../models/Settings');
const { initializeDefaultSettings } = require('../controllers/SettingsController');

(async () => {
    try {
        console.log('⏳ Connecting to database...');
        await db.initializeDatabase();   // ensures authenticate() + sync if ASYNC_DB=true

        console.log('⏳ Ensuring Settings table exists...');
        await Settings.sync();  // safe — does NOT drop anything

        console.log('⏳ Inserting default settings...');
        await initializeDefaultSettings();

        console.log('✅ Default settings inserted successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding settings:', error);
        process.exit(1);
    }
})();
