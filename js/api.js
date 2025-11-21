// js/api.js
const API_BASE_URL = 'http://localhost:5150'; // Your Flask server

// General chat API - Updated to use backend instead of direct Gemini call
async function callGemini(prompt, conversationHistory) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/mindfulness/general-chat`, {
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
        console.error('Gemini API error:', error);
        throw error;
    }
}

// Start Hot Cross Bun API - New function
async function startHotCrossBun(emotion) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/mindfulness/start-hcb`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emotion: emotion })
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

// Hot Cross Bun API - Existing function
async function sendHotCrossBunMessage(message, chatId = null) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/mindfulness/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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

// Line A API - Updated to support conversation mode and needs
async function generateLineA(emotion, sensation, bodySensations = [], thoughts = [], impulses = [], needs = [], conversationMode = true) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/mindfulness/line-a`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
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

// Line B API - Updated to support conversation mode and needs
async function generateLineB(emotion, sensation, thoughts = [], impulses = [], bodySensations = [], needs = [], conversationMode = true) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/mindfulness/line-b`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
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

// Text-to-speech API - Existing function
async function getTextToSpeech(text) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
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