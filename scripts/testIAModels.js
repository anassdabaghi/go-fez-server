const fetch = require('node-fetch');

const BASE_URL = 'https://api-gofez.cleverapps.io';

async function testIAModels() {
    console.log('🧪 Testing IA Models System\n');

    try {
        // Test 1: Get all models
        console.log('📋 Test 1: Fetching all IA models...');
        const modelsResponse = await fetch(`${BASE_URL}/api/ia-models`);
        const models = await modelsResponse.json();
        console.log(`✅ Found ${models.length} models`);
        models.forEach(model => {
            console.log(`   - ${model.provider}: ${model.selected_model} (Default: ${model.is_default}, Active: ${model.is_active})`);
        });
        console.log('');

        // Test 2: Get default model
        console.log('🎯 Test 2: Fetching default model...');
        const defaultResponse = await fetch(`${BASE_URL}/api/ia-models/default`);
        if (defaultResponse.ok) {
            const defaultModel = await defaultResponse.json();
            console.log(`✅ Default: ${defaultModel.provider} (${defaultModel.selected_model})`);
        } else {
            console.log('⚠️  No default model configured yet');
        }
        console.log('');

        // Test 3: Translation test (only if a model is active)
        const activeModel = models.find(m => m.is_active && m.api_key);
        
        if (activeModel) {
            console.log('🌍 Test 3: Testing batch translation...');
            console.log(`   Using: ${activeModel.provider} (${activeModel.selected_model})`);
            
            const translateResponse = await fetch(`${BASE_URL}/api/ia-models/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: 'Welcome to Fez',
                    targetLanguages: ['fr', 'ar', 'en']
                })
            });

            if (translateResponse.ok) {
                const result = await translateResponse.json();
                console.log('✅ Translation successful!');
                console.log(`   Provider: ${result.provider}`);
                console.log(`   Model: ${result.model || 'N/A'}`);
                console.log('   Translations:');
                console.log(`   FR: ${result.translations.fr}`);
                console.log(`   AR: ${result.translations.ar}`);
                console.log(`   EN: ${result.translations.en}`);
            } else {
                const error = await translateResponse.json();
                console.log(`❌ Translation failed: ${error.message}`);
            }
        } else {
            console.log('⚠️  Test 3: Skipped (no active model with API key configured)');
            console.log('   💡 Configure an API key in the admin panel to test translation');
        }
        console.log('');

        // Summary
        console.log('📊 Summary:');
        console.log(`   Total Models: ${models.length}`);
        console.log(`   Active Models: ${models.filter(m => m.is_active).length}`);
        console.log(`   With API Keys: ${models.filter(m => m.api_key).length}`);
        console.log(`   Default Model: ${models.find(m => m.is_default)?.provider || 'None'}`);
        console.log('');

        // Next Steps
        if (!activeModel || !activeModel.api_key) {
            console.log('📝 Next Steps:');
            console.log('   1. Go to Admin Panel → IA Models Management');
            console.log('   2. Click "Edit" on your preferred provider');
            console.log('   3. Add your API key');
            console.log('   4. Set as "Default" and "Active"');
            console.log('   5. Run this test again!');
            console.log('');
        }

        console.log('✅ All tests completed!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('   1. Make sure the server is running (npm start)');
        console.log('   2. Check if database is initialized');
        console.log('   3. Run: node scripts/initializeIAModels.js');
        console.log('');
    }
}

// Run tests
testIAModels();
