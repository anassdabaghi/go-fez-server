// server-go-fez/services/ContentModerationService.js

const { IAModel } = require('../models/IAModel');
const logger = require('../Config/logger');

/**
 * Robust JSON parser that handles potential Markdown code blocks
 * often returned by AI models (e.g., ```json ... ```)
 */
const parseAIResponse = (rawText) => {
    logger.info(`[ContentModeration] Raw AI output to parse: ${rawText}`);
    
    try {
        // 1. Try direct parsing
        return JSON.parse(rawText);
    } catch (e) {
        // 2. Try extracting JSON from markdown code blocks
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (innerError) {
            logger.warn(`[ContentModeration] JSON Extraction failed: ${innerError.message}`);
        }
        
        logger.error(`[ContentModeration] Parsing failed completely for output: ${rawText}`);
        return { action: 'UNCERTAIN', reason: 'Failed to parse AI response' };
    }
};

/**
 * Call Gemini API (Google)
 * Aligned with batchTranslateWithGemini pattern
 */
const callGemini = async (provider, systemPrompt, userPrompt) => {
    const fetch = (await import('node-fetch')).default;
    
    const modelName = provider.selected_model || 'gemini-2.0-flash-exp';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${provider.api_key}`;
    
    const body = JSON.stringify({
        contents: [{ 
            parts: [{ 
                text: `${systemPrompt}\n\nUser Input:\n${userPrompt}` 
            }] 
        }],
        generationConfig: { 
            temperature: 0.1, 
            responseMimeType: "application/json" 
        }
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    } catch (error) {
        logger.error(`[ContentModeration] Gemini Call Failed: ${error.message}`);
        throw error;
    }
};

/**
 * Call Grok API (xAI)
 * Aligned with batchTranslateWithGrok pattern
 */
const callGrok = async (provider, systemPrompt, userPrompt) => {
    const fetch = (await import('node-fetch')).default;
    
    const modelName = provider.selected_model || 'grok-beta';
    const url = 'https://api.x.ai/v1/chat/completions';

    const body = JSON.stringify({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        model: modelName,
        stream: false,
        temperature: 0.1,
        response_format: { type: "json_object" }
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.api_key}`
            },
            body: body
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Grok API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '{}';
    } catch (error) {
        logger.error(`[ContentModeration] Grok Call Failed: ${error.message}`);
        throw error;
    }
};

/**
 * Call OpenAI API
 * Aligned with batchTranslateWithOpenAI pattern
 */
const callOpenAI = async (provider, systemPrompt, userPrompt) => {
    const fetch = (await import('node-fetch')).default;
    
    const modelName = provider.selected_model || 'gpt-3.5-turbo';
    const url = 'https://api.openai.com/v1/chat/completions';

    const body = JSON.stringify({
        model: modelName,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.api_key}`
            },
            body: body
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '{}';
    } catch (error) {
        logger.error(`[ContentModeration] OpenAI Call Failed: ${error.message}`);
        throw error;
    }
};

/**
 * Main function to moderate content
 * @param {string} text - The review content to analyze
 */
exports.moderateContent = async (text) => {
    logger.info('--- [ContentModeration] Job Started ---');

    if (!text || !text.trim()) {
        logger.info('[ContentModeration] Empty text provided. Skipping.');
        return { action: 'APPROVE', reason: 'No content to moderate' };
    }

    try {
        // 1. Get Default Provider
        const provider = await IAModel.findOne({ 
            where: { is_default: true, is_active: true } 
        });

        if (!provider) {
            logger.warn('[ContentModeration] ⚠️ No active default AI provider found. Falling back to manual.');
            return { action: 'UNCERTAIN', reason: 'No AI provider configured' };
        }

        logger.info(`[ContentModeration] Using Provider: ${provider.provider} (Model: ${provider.selected_model})`);

        // 2. Construct Prompt
        const systemPrompt = `You are a Content Moderation AI for a travel app.
        
        Your task is to classify user reviews based on these rules:
        1. REJECT if the content contains: Hate speech, explicit sexual content, harassment, severe profanity, spam, scams, or illegal content.
        2. APPROVE if the content is: A relevant review, constructive criticism, or a generic comment about a place.
        3. UNCERTAIN if: The language is not understood or the context is ambiguous.

        Return ONLY a JSON object with the following format:
        {
            "action": "APPROVE" | "REJECT" | "UNCERTAIN",
            "reason": "A short explanation of your decision"
        }
        Do not wrap the JSON in markdown formatting.`;

        const userPrompt = `Please classify this review:\n"${text}"`;

        // 3. Call the appropriate provider
        let rawResult;
        switch (provider.provider.toLowerCase()) {
            case 'gemini':
                rawResult = await callGemini(provider, systemPrompt, userPrompt);
                break;
            case 'grok':
                rawResult = await callGrok(provider, systemPrompt, userPrompt);
                break;
            case 'openai':
                rawResult = await callOpenAI(provider, systemPrompt, userPrompt);
                break;
            default:
                logger.warn(`[ContentModeration] Unknown provider type: ${provider.provider}`);
                return { action: 'UNCERTAIN', reason: `Unsupported provider: ${provider.provider}` };
        }

        // 4. Parse Result
        const result = parseAIResponse(rawResult);
        
        // 5. Validate and Normalize Output
        const validActions = ['APPROVE', 'REJECT', 'UNCERTAIN'];
        const finalAction = validActions.includes(result.action) ? result.action : 'UNCERTAIN';
        const finalReason = result.reason || 'AI response was unclear';

        logger.info(`[ContentModeration] Result: ${finalAction} - ${finalReason}`);
        
        return {
            action: finalAction,
            reason: finalReason
        };

    } catch (error) {
        logger.error('[ContentModeration] ❌ System Error:', error);
        return { action: 'UNCERTAIN', reason: 'UNCERTAIN: AI Service Unavailable - Manual Check Required' };
    }
};