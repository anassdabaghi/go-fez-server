const { IAModel } = require('../models/IAModel');
const logger = require('../Config/logger');

// Get all IA Models
exports.getAllIAModels = async (req, res) => {
    try {
        const models = await IAModel.findAll({
            order: [['is_default', 'DESC'], ['created_at', 'DESC']]
        });
        res.json(models);
    } catch (error) {
        logger.error('Error fetching IA models:', error);
        res.status(500).json({ message: 'Error fetching IA models', error: error.message });
    }
};

// Get single IA Model by ID
exports.getIAModelById = async (req, res) => {
    try {
        const model = await IAModel.findByPk(req.params.id);
        if (!model) {
            return res.status(404).json({ message: 'IA Model not found' });
        }
        res.json(model);
    } catch (error) {
        logger.error('Error fetching IA model:', error);
        res.status(500).json({ message: 'Error fetching IA model', error: error.message });
    }
};

// Get default IA Model
exports.getDefaultIAModel = async (req, res) => {
    try {
        const model = await IAModel.findOne({ where: { is_default: true, is_active: true } });
        if (!model) {
            return res.status(404).json({ message: 'No default IA Model found' });
        }
        res.json(model);
    } catch (error) {
        logger.error('Error fetching default IA model:', error);
        res.status(500).json({ message: 'Error fetching default IA model', error: error.message });
    }
};

// Create new IA Model
exports.createIAModel = async (req, res) => {
    try {
        const { provider, models_list, selected_model, api_key, api_endpoint, prompt, is_default, is_active } = req.body;

        // If setting as default, unset other defaults
        if (is_default) {
            await IAModel.update({ is_default: false }, { where: { is_default: true } });
        }

        const newModel = await IAModel.create({
            provider,
            models_list,
            selected_model,
            api_key,
            api_endpoint,
            prompt,
            is_default: is_default || false,
            is_active: is_active !== undefined ? is_active : true
        });

        res.status(201).json(newModel);
    } catch (error) {
        logger.error('Error creating IA model:', error);
        res.status(500).json({ message: 'Error creating IA model', error: error.message });
    }
};

// Update IA Model
exports.updateIAModel = async (req, res) => {
    try {
        const { id } = req.params;
        const { provider, models_list, selected_model, api_key, api_endpoint, prompt, is_default, is_active } = req.body;

        const model = await IAModel.findByPk(id);
        if (!model) {
            return res.status(404).json({ message: 'IA Model not found' });
        }

        // If setting as default, unset other defaults
        if (is_default && !model.is_default) {
            await IAModel.update({ is_default: false }, { where: { is_default: true } });
        }

        await model.update({
            provider: provider || model.provider,
            models_list: models_list || model.models_list,
            selected_model: selected_model !== undefined ? selected_model : model.selected_model,
            api_key: api_key !== undefined ? api_key : model.api_key,
            api_endpoint: api_endpoint !== undefined ? api_endpoint : model.api_endpoint,
            prompt: prompt !== undefined ? prompt : model.prompt,
            is_default: is_default !== undefined ? is_default : model.is_default,
            is_active: is_active !== undefined ? is_active : model.is_active
        });

        res.json(model);
    } catch (error) {
        logger.error('Error updating IA model:', error);
        res.status(500).json({ message: 'Error updating IA model', error: error.message });
    }
};

// Delete IA Model
exports.deleteIAModel = async (req, res) => {
    try {
        const { id } = req.params;
        const model = await IAModel.findByPk(id);
        
        if (!model) {
            return res.status(404).json({ message: 'IA Model not found' });
        }

        await model.destroy();
        res.json({ message: 'IA Model deleted successfully' });
    } catch (error) {
        logger.error('Error deleting IA model:', error);
        res.status(500).json({ message: 'Error deleting IA model', error: error.message });
    }
};

// Translate text using the specified or default provider
exports.translateText = async (req, res) => {
    try {
        const { text, targetLanguages, providerId } = req.body;

        if (!text || !targetLanguages || !Array.isArray(targetLanguages)) {
            return res.status(400).json({ message: 'Invalid request. Provide text and targetLanguages array.' });
        }

        // Get the provider to use
        let provider;
        if (providerId) {
            provider = await IAModel.findByPk(providerId);
        } else {
            provider = await IAModel.findOne({ where: { is_default: true, is_active: true } });
        }

        if (!provider) {
            return res.status(404).json({ message: 'No AI provider found' });
        }

        // Call the appropriate translation service - NOW WITH BATCH TRANSLATION
        const translations = await performBatchTranslation(provider, text, targetLanguages);

        res.json({ translations, provider: provider.provider, model: provider.selected_model });
    } catch (error) {
        logger.error('Error translating text:', error);
        res.status(500).json({ message: 'Error translating text', error: error.message });
    }
};

// NEW: Batch translation - get all translations in one API call
async function performBatchTranslation(provider, text, targetLanguages) {
    try {
        let translations;
        
        if (provider.provider === 'gemini') {
            translations = await batchTranslateWithGemini(provider, text, targetLanguages);
        } else if (provider.provider === 'grok') {
            translations = await batchTranslateWithGrok(provider, text, targetLanguages);
        } else if (provider.provider === 'openai') {
            translations = await batchTranslateWithOpenAI(provider, text, targetLanguages);
        } else {
            throw new Error('Unknown provider');
        }

        return translations;
    } catch (error) {
        logger.error('Batch translation error:', error);
        throw error;
    }
}

// BATCH Gemini translation - get all languages at once
async function batchTranslateWithGemini(provider, text, targetLanguages) {
    const fetch = (await import('node-fetch')).default;
    
    const langMap = {
        'fr': 'French',
        'ar': 'Arabic',
        'en': 'English'
    };
    
    const langNames = targetLanguages.map(lang => langMap[lang] || lang);
    
    // Optimized prompt for batch translation
    const systemPrompt = provider.prompt || 'You are a professional translator. Translate the given text to multiple languages simultaneously.';
    
    const batchPrompt = `${systemPrompt}

Translate the following text to ${langNames.join(', ')}.

Return ONLY a JSON object with language codes as keys and translations as values. No additional text, explanations, or markdown formatting.

Expected format:
{"fr": "translation in French", "ar": "translation in Arabic", "en": "translation in English"}

Text to translate: "${text}"

JSON response:`;
    
    logger.info(`[Gemini Batch] Translating to: ${targetLanguages.join(', ')}`);
    logger.info(`[Gemini Batch] Text: "${text}"`);
    
    const modelName = provider.selected_model || 'gemini-2.0-flash-exp';
    
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${provider.api_key}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: batchPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    topK: 1,
                    topP: 0.95,
                    maxOutputTokens: 500,
                    responseMimeType: "application/json"
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();
        logger.error(`[Gemini Batch] API error: ${error}`);
        throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
    
    logger.info(`[Gemini Batch] Raw response: ${rawResponse}`);
    
    // Parse JSON response
    let translations = {};
    try {
        translations = JSON.parse(rawResponse);
    } catch (e) {
        logger.error(`[Gemini Batch] JSON parse error: ${e.message}`);
        // Fallback: extract JSON from response
        const jsonMatch = rawResponse.match(/\{[^}]+\}/);
        if (jsonMatch) {
            translations = JSON.parse(jsonMatch[0]);
        }
    }
    
    logger.info(`[Gemini Batch] Translations: ${JSON.stringify(translations)}`);
    
    return translations;
}

// BATCH Grok translation - get all languages at once
async function batchTranslateWithGrok(provider, text, targetLanguages) {
    const fetch = (await import('node-fetch')).default;
    
    const langMap = {
        'fr': 'French',
        'ar': 'Arabic',
        'en': 'English'
    };
    
    const langNames = targetLanguages.map(lang => langMap[lang] || lang);
    
    const systemPrompt = provider.prompt || 'You are a professional translator. Translate text to multiple languages simultaneously with high accuracy and speed.';
    
    const userPrompt = `Translate the following text to ${langNames.join(', ')}.

Return ONLY a valid JSON object with language codes as keys (${targetLanguages.join(', ')}) and translations as values. No markdown, no explanations, just the JSON.

Format: {"fr": "French translation", "ar": "Arabic translation", "en": "English translation"}

Text: "${text}"`;

    logger.info(`[Grok Batch] Translating to: ${targetLanguages.join(', ')}`);
    logger.info(`[Grok Batch] Text: "${text}"`);

    const modelName = provider.selected_model || 'grok-beta';

    const response = await fetch(
        'https://api.x.ai/v1/chat/completions',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.api_key}`
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                model: modelName,
                stream: false,
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();
        logger.error(`[Grok Batch] API error: ${error}`);
        throw new Error(`Grok API error: ${error}`);
    }

    const data = await response.json();
    const rawResponse = data.choices?.[0]?.message?.content?.trim() || '{}';
    
    logger.info(`[Grok Batch] Raw response: ${rawResponse}`);
    
    let translations = {};
    try {
        translations = JSON.parse(rawResponse);
    } catch (e) {
        logger.error(`[Grok Batch] JSON parse error: ${e.message}`);
        const jsonMatch = rawResponse.match(/\{[^}]+\}/);
        if (jsonMatch) {
            translations = JSON.parse(jsonMatch[0]);
        }
    }
    
    logger.info(`[Grok Batch] Translations: ${JSON.stringify(translations)}`);
    
    return translations;
}

// BATCH OpenAI translation - get all languages at once
async function batchTranslateWithOpenAI(provider, text, targetLanguages) {
    const fetch = (await import('node-fetch')).default;
    
    const langMap = {
        'fr': 'French',
        'ar': 'Arabic',
        'en': 'English'
    };
    
    const langNames = targetLanguages.map(lang => langMap[lang] || lang);
    
    const systemPrompt = provider.prompt || 'You are a professional translator. Translate text accurately to multiple languages.';
    
    const userPrompt = `Translate the following text to ${langNames.join(', ')}.

Return ONLY a JSON object with language codes (${targetLanguages.join(', ')}) as keys and translations as values.

Format: {"fr": "French translation", "ar": "Arabic translation", "en": "English translation"}

Text: "${text}"`;

    logger.info(`[OpenAI Batch] Translating to: ${targetLanguages.join(', ')}`);
    logger.info(`[OpenAI Batch] Text: "${text}"`);

    const modelName = provider.selected_model || 'gpt-3.5-turbo';

    const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.api_key}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();
        logger.error(`[OpenAI Batch] API error: ${error}`);
        throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const rawResponse = data.choices?.[0]?.message?.content?.trim() || '{}';
    
    logger.info(`[OpenAI Batch] Raw response: ${rawResponse}`);
    
    let translations = {};
    try {
        translations = JSON.parse(rawResponse);
    } catch (e) {
        logger.error(`[OpenAI Batch] JSON parse error: ${e.message}`);
        const jsonMatch = rawResponse.match(/\{[^}]+\}/);
        if (jsonMatch) {
            translations = JSON.parse(jsonMatch[0]);
        }
    }
    
    logger.info(`[OpenAI Batch] Translations: ${JSON.stringify(translations)}`);
    
    return translations;
}
