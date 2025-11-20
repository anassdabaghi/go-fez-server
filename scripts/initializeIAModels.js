const { IAModel } = require('../models');
const logger = require('../Config/logger');

async function initializeIAModels() {
    try {
        logger.info('🤖 Initializing IA Models...');

        // Check if models already exist
        const existingModels = await IAModel.findAll();
        
        if (existingModels.length > 0) {
            logger.info(`✅ Found ${existingModels.length} existing IA models. Skipping initialization.`);
            return;
        }

        // Suggested models for each provider
        const suggestedModels = {
            gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-pro'],
            grok: ['grok-beta', 'grok-2-latest', 'grok-2-vision-1212'],
            openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
        };

        // Create Gemini model (default)
        await IAModel.create({
            provider: 'gemini',
            models_list: suggestedModels.gemini,
            selected_model: 'gemini-2.5-flash',
            api_key: null, // To be configured by admin
            api_endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            prompt: 'You are a professional multilingual translator. Translate text accurately to multiple languages simultaneously. Return ONLY a JSON object with language codes as keys and translations as values. No explanations, no markdown, just clean JSON.',
            is_default: true,
            is_active: false // Inactive until API key is configured
        });
        logger.info('✨ Created Gemini model (default)');

        // Create Grok model
        await IAModel.create({
            provider: 'grok',
            models_list: suggestedModels.grok,
            selected_model: 'grok-beta',
            api_key: null,
            api_endpoint: 'https://api.x.ai/v1/chat/completions',
            prompt: 'You are an expert translator. Translate the given text to multiple languages with speed and accuracy. Respond with a clean JSON object containing language codes and their translations. Format: {"fr": "...", "ar": "...", "en": "..."}',
            is_default: false,
            is_active: false
        });
        logger.info('🚀 Created Grok model');

        // Create OpenAI model
        await IAModel.create({
            provider: 'openai',
            models_list: suggestedModels.openai,
            selected_model: 'gpt-4o-mini',
            api_key: null,
            api_endpoint: 'https://api.openai.com/v1/chat/completions',
            prompt: 'You are a professional translator. Translate text to multiple languages precisely. Return only a JSON object with language codes as keys and accurate translations as values. Example: {"fr": "French text", "ar": "Arabic text", "en": "English text"}',
            is_default: false,
            is_active: false
        });
        logger.info('🤖 Created OpenAI model');

        logger.info('✅ IA Models initialized successfully!');
        logger.info('⚠️  Remember to configure API keys in the admin panel to activate the models.');
        logger.info('💡 You can now edit the models list in the admin panel to add or remove models.');

    } catch (error) {
        logger.error('❌ Error initializing IA models:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    const db = require('../Config/db');
    const sequelize = db.getSequelize();

    sequelize.authenticate()
        .then(() => {
            logger.info('✅ Database connected');
            return initializeIAModels();
        })
        .then(() => {
            logger.info('🎉 Initialization complete!');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Initialization failed:', error);
            process.exit(1);
        });
}

module.exports = { initializeIAModels };
