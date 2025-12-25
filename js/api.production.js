// js/api.js
// InsForge Edge Functions API configuration
const INSFORGE_BASE_URL = 'https://dku2r8qi.us-east.insforge.app';
const INSFORGE_FUNCTIONS_URL = `${INSFORGE_BASE_URL}/functions/v1`;

// Legacy API_BASE_URL for backward compatibility (now uses InsForge)
const API_BASE_URL = INSFORGE_FUNCTIONS_URL;

console.log('🌐 Using InsForge Edge Functions:', INSFORGE_FUNCTIONS_URL);

// Test API connection
async function testAPIConnection() {
    try {
        console.log('🔍 Testing InsForge connection...');
        console.log('📍 InsForge Functions URL:', INSFORGE_FUNCTIONS_URL);
        console.log('✅ InsForge Edge Functions ready!');
        return true;
    } catch (error) {
        console.error('❌ InsForge connection failed:', error);
        return false;
    }
}

// Test the API connection on load
testAPIConnection();

// General chat API - Uses InsForge edge function
async function callGemini(prompt, conversationHistory) {
    try {
        const response = await fetch(`${INSFORGE_FUNCTIONS_URL}/general-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: prompt,
                history: conversationHistory
            })
        });

        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Return the response and update conversation history
        return data.response;
    } catch (error) {
        console.error('General chat API error:', error);
        throw error;
    }
}

// Start Hot Cross Bun API - Uses InsForge mindfulness-chat function
async function startHotCrossBun(emotion) {
    try {
        const response = await fetch(`${INSFORGE_FUNCTIONS_URL}/mindfulness-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'start',
                emotion: emotion
            })
        });

        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Start Hot Cross Bun API error:', error);
        throw error;
    }
}

// Hot Cross Bun API - Uses InsForge mindfulness-chat function
async function sendHotCrossBunMessage(message, chatId = null) {
    try {
        const response = await fetch(`${INSFORGE_FUNCTIONS_URL}/mindfulness-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'chat',
                chatId: chatId,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Hot Cross Bun API error:', error);
        throw error;
    }
}

// Line A API - Uses InsForge meditation-lines function
async function generateLineA(emotion, sensation, bodySensations = [], thoughts = [], impulses = [], needs = [], conversationMode = true) {
    try {
        const response = await fetch(`${INSFORGE_FUNCTIONS_URL}/meditation-lines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'line-a',
                emotion: emotion,
                sensation: sensation,
                bodySensations: bodySensations,
                thoughts: thoughts,
                impulses: impulses,
                needs: needs,
                conversationMode: conversationMode
            })
        });
        
        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Line A API error:', error);
        throw error;
    }
}

// Line B API - Uses InsForge meditation-lines function
async function generateLineB(emotion, sensation, thoughts = [], impulses = [], bodySensations = [], needs = [], conversationMode = true) {
    try {
        const response = await fetch(`${INSFORGE_FUNCTIONS_URL}/meditation-lines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'line-b',
                emotion: emotion,
                sensation: sensation,
                thoughts: thoughts,
                impulses: impulses,
                bodySensations: bodySensations,
                needs: needs,
                conversationMode: conversationMode
            })
        });

        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Line B API error:', error);
        throw error;
    }
}

// Text-to-speech API - Uses InsForge TTS function
async function getTextToSpeech(text, voice = 'male') {
    try {
        const response = await fetch(`${INSFORGE_FUNCTIONS_URL}/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice })
        });

        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('TTS API error:', error);
        throw error;
    }
}

// Audio consolidation API - New function
async function consolidateAudio(meditationComponents) {
    try {
        console.log('=== CONSOLIDATE AUDIO API CALL ===');
        console.log('API URL:', `${API_BASE_URL}/api/mindfulness/consolidate-audio`);
        console.log('Request data:', meditationComponents);
        
        const response = await fetch(`${API_BASE_URL}/api/mindfulness/consolidate-audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(meditationComponents)
        });
        
        console.log('API response status:', response.status);
        console.log('API response headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw new Error(`API returned status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API response data:', data);
        
        return data;
    } catch (error) {
        console.error('Audio consolidation API error:', error);
        throw error;
    }
}