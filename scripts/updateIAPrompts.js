const { sequelize } = require('../Config/db');

async function updateIAPromptsForTesting() {
    try {
        console.log('🔄 Updating IA Model prompts for better translation...');
        
        // Update Gemini - Simple prompt, backend will handle variables
        await sequelize.query(`
            UPDATE IAModels 
            SET prompt = 'Translate the following text to TARGET_LANG. Provide ONLY the direct translation without any introduction, explanation, quotes, or additional context.'
            WHERE provider = 'gemini';
        `);
        console.log('✅ Gemini prompt updated');

        // Update Grok
        await sequelize.query(`
            UPDATE IAModels 
            SET prompt = 'Translate this text to TARGET_LANG. Return ONLY the translated text, nothing else. No quotes, no explanations.'
            WHERE provider = 'grok';
        `);
        console.log('✅ Grok prompt updated');

        // Update OpenAI
        await sequelize.query(`
            UPDATE IAModels 
            SET prompt = 'Translate to TARGET_LANG. Provide only the translation without quotes, explanations, or extra text.'
            WHERE provider = 'openai';
        `);
        console.log('✅ OpenAI prompt updated');

        console.log('\n✨ All prompts updated successfully!');
        console.log('💡 Restart your server to use the new prompts');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating prompts:', error.message);
        process.exit(1);
    }
}

updateIAPromptsForTesting();
