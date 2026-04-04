// js/api.js - API configuration using Vercel Serverless Functions
// All AI calls now go through our own Vercel API routes
const API_BASE_URL = '';

console.log('🌐 Using Vercel Serverless Functions');

// General chat API - Uses InsForge AI directly
async function callGemini(prompt, conversationHistory) {
    try {
        // Convert history to OpenAI format if needed
        const messages = conversationHistory.map(msg => {
            const role = msg.role === 'model' ? 'assistant' : msg.role;
            const content = msg.parts?.[0]?.text || msg.content || '';
            return { role, content };
        });

        // Add current message
        messages.push({ role: 'user', content: prompt });

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }

        const data = await response.json();
        return data.text || data.choices?.[0]?.message?.content || '(No response)';
    } catch (error) {
        console.error('General chat API error:', error);
        throw error;
    }
}

// System prompt for MBCT conversation
function getMBCTSystemPrompt(emotion) {
    return `You are a warm, concise MBCT-inspired facilitator and an experienced psychological counselor. Your tone is empathic, conversational, never clinical. Vary wording naturally.
Your goal is to guide the user de-blob today's experience into Body → Thoughts → Impulse → Deeper Need. After every user reply, paraphrase in one short sentence to show you heard them.
Vary sentence openings, but stay within an empathic, conversational range (avoid "clinical" diction such as "cognitive distortion", "diagnosis", etc.).
Opening: Mirror the user's chosen emotion with empathy and greet the user. Mirror Example: "Sounds like you're feeling anxious right now.", "Hey, I sense some anxiety"; Greeting Example: "Welcome back—I'm here with you.", "Glad you reached out.", "Let's unpack this together, at your pace."
Ask each question one at a time. When you ask about body sensations, include 2-3 example answers in parentheses.
If the user replies "not sure", offer two example answers in brackets and repeat the same question once.
In between question 2 or 3, use some bridge sentences. Example: "Take a breath; we're halfway.", "Thank you, that's helpful. Next…", "Got it. Let's look at another angle."
Once all four questions are answered or skipped, provide a natural, warm summary of what you heard from them.

Then IMMEDIATELY after your natural summary, add this structured data section (this is CRITICAL for the system to work):

---DATA---
BODY_SENSATIONS: [sensation1, sensation2, sensation3]
THOUGHTS: [thought1, thought2, thought3]
IMPULSES: [impulse1, impulse2, impulse3]
NEED: [need1, need2, need3]
---END_DATA---

After the data section, add one friendly sentence and output exactly the hand-off flag: Now let's move into a guided meditation practice.
No judgement, no fixing—just curiosity and kindness.
DO NOT use any formatting, e.g. bold, italic in your response.
The user's current emotion is: ${emotion}`;
}

// In-memory conversation store for client-side
const conversationStore = new Map();

// Start Hot Cross Bun API - Uses InsForge AI directly
async function startHotCrossBun(emotion) {
    try {
        const chatId = crypto.randomUUID();
        const systemPrompt = getMBCTSystemPrompt(emotion);

        // Initialize conversation with system message
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `My emotion is ${emotion}.` }
        ];

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.text || data.choices?.[0]?.message?.content || '(No response)';

        // Store conversation in memory
        messages.push({ role: 'assistant', content: reply });
        conversationStore.set(chatId, messages);

        return { response: reply, chatId: chatId, type: 'text', ai_raw: data };
    } catch (error) {
        console.error('Start Hot Cross Bun API error:', error);
        throw error;
    }
}

// Hot Cross Bun API - Uses InsForge AI directly
async function sendHotCrossBunMessage(message, chatId = null) {
    try {
        if (!chatId || !conversationStore.has(chatId)) {
            throw new Error('Invalid chat ID');
        }

        const messages = conversationStore.get(chatId);
        messages.push({ role: 'user', content: message });

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.text || data.choices?.[0]?.message?.content || '(No response)';

        // Update conversation
        messages.push({ role: 'assistant', content: reply });
        conversationStore.set(chatId, messages);

        return { response: reply, chatId: chatId, type: 'text', ai_raw: data };
    } catch (error) {
        console.error('Hot Cross Bun API error:', error);
        throw error;
    }
}

// Line A API - Uses InsForge AI directly
async function generateLineA(emotion, sensation, bodySensations = [], thoughts = [], impulses = [], needs = [], conversationMode = true) {
    try {
        const primarySensation = bodySensations[0] || sensation || "tension in the body";
        const primaryThought = thoughts[0] || "racing thoughts";
        const primaryImpulse = impulses[0] || "wanting to escape";

        let prompt = '';
        if (conversationMode) {
            prompt = `You are an experienced mindfulness guide.
Create two sentences. First sentence must weave all 3 elements of ${emotion}, ${primarySensation} and ${primaryThought} or ${primaryImpulse}, change personal pronoun from first to second, if applicable. Second sentence is a personalized reflective comment about ${emotion}.
Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
Do not use any formatting, e.g. bold, italic in your response.`;
        } else {
            prompt = `You are an experienced mindfulness guide.
Write two balanced sentences. First acknowledges ${emotion} with common body sensations, second sentence offers a neutral perspective on ${emotion}.
Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
Do not use any formatting, e.g. bold, italic in your response.`;
        }

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
        });

        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.text || data.choices?.[0]?.message?.content || '(No response)';

        return { response: reply };
    } catch (error) {
        console.error('Line A API error:', error);
        throw error;
    }
}

// Line B API - Uses InsForge AI directly
async function generateLineB(emotion, sensation, thoughts = [], impulses = [], bodySensations = [], needs = [], conversationMode = true) {
    try {
        const primaryThought = thoughts[0] || "racing thoughts";
        const primaryImpulse = impulses[0] || "wanting to escape";
        const primaryNeed = needs[0] || "connection";

        let prompt = '';
        if (conversationMode) {
            prompt = `You are an experienced mindfulness guide.
Create two balanced sentences. Mention both ${primaryThought} or ${primaryImpulse}, and ${primaryNeed}, change personal pronoun from first to second, if applicable. End with a forward-looking clause ("…as you step back to your day").
Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
Do not use any formatting, e.g. bold, italic in your response.`;
        } else {
            prompt = `You are an experienced mindfulness guide.
Create two balanced sentences. First sentence checks whether the ${emotion} has shifted, second sentence invites one grounding breath.
Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
Do not use any formatting, e.g. bold, italic in your response.`;
        }

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
        });

        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.text || data.choices?.[0]?.message?.content || '(No response)';

        return { response: reply };
    } catch (error) {
        console.error('Line B API error:', error);
        throw error;
    }
}

// Text-to-speech API - Uses Vercel Serverless Function
async function getTextToSpeech(text, voice = 'male') {
    try {
        const response = await fetch('/api/tts', {
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

// Audio consolidation - handled client-side (no server needed)
async function consolidateAudio(meditationComponents) {
    // This function is handled client-side in audio.js
    console.log('consolidateAudio called with:', meditationComponents);
    return meditationComponents;
}