// js/api.js
// API base URL configuration for both development and production
const API_BASE_URL = (() => {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol;
    
    console.log('🌐 Environment Detection:', {
        hostname,
        port,
        protocol,
        origin: window.location.origin,
        href: window.location.href
    });
    
    // Local development: Always use Flask server on port 5150
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const apiUrl = 'http://localhost:5150';
        console.log('🔧 LOCAL DEVELOPMENT MODE');
        console.log('📍 Frontend on port:', port || 'default');
        console.log('📍 API will use:', apiUrl);
        return apiUrl;
    } 
    // Production deployment: Same origin as frontend
    else {
        const apiUrl = window.location.origin;
        console.log('🌍 PRODUCTION MODE');
        console.log('📍 Domain:', hostname);
        console.log('📍 API will use same origin:', apiUrl);
        return apiUrl;
    }
})();

// Test API connection
async function testAPIConnection() {
    try {
        console.log('🔍 Testing API connection...');
        console.log('📍 API URL:', API_BASE_URL);
        console.log('🌐 Browser location:', window.location.href);
        
        const response = await fetch(`${API_BASE_URL}/`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('📡 API response status:', response.status);
        console.log('✅ API connection successful!');
        
        return response.ok;
    } catch (error) {
        console.error('❌ API connection failed:', error);
        console.error('🔧 Troubleshooting:');
        console.error('  - Is Flask server running on port 5150?');
        console.error('  - Check CORS settings in proxy.py');
        console.error('  - Error details:', error.message);
        return false;
    }
}

// Test the API connection on load
testAPIConnection();

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