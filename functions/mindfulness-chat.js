/**
 * InsForge Edge Function: Mindfulness Chat
 * Handles both starting and continuing Hot Cross Bun conversations using gpt-4o
 */

// In-memory conversation store (Note: This will reset when function restarts)
// For production, consider using InsForge database for persistence
const conversationStore = new Map();

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

module.exports = async function(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { action, emotion, chatId, message } = body;

    // Get InsForge base URL and anon key from environment
    const INSFORGE_BASE_URL = Deno.env.get('INSFORGE_BASE_URL');
    const INSFORGE_ANON_KEY = Deno.env.get('INSFORGE_ANON_KEY');

    if (!INSFORGE_BASE_URL || !INSFORGE_ANON_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing InsForge configuration' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle START action
    if (action === 'start') {
      if (!emotion) {
        return new Response(
          JSON.stringify({ error: 'Emotion is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Generate new chat ID
      const newChatId = crypto.randomUUID();

      // Create system prompt
      const systemPrompt = getMBCTSystemPrompt(emotion);

      // Initialize conversation
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `My emotion is ${emotion}.` }
      ];

      // Call InsForge AI
      const aiResponse = await fetch(`${INSFORGE_BASE_URL}/ai/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${INSFORGE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o',
          messages: messages
        })
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('[InsForge AI] Error:', errorText);
        return new Response(
          JSON.stringify({ error: 'InsForge AI request failed', details: errorText }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const aiData = await aiResponse.json();
      const reply = aiData.choices?.[0]?.message?.content || '(No response)';

      // Store conversation
      messages.push({ role: 'assistant', content: reply });
      conversationStore.set(newChatId, messages);

      return new Response(
        JSON.stringify({
          response: reply,
          chatId: newChatId,
          type: 'text',
          ai_raw: aiData
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle CHAT action
    if (action === 'chat') {
      if (!chatId || !message) {
        return new Response(
          JSON.stringify({ error: 'Chat ID and message are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get conversation history
      const messages = conversationStore.get(chatId);
      if (!messages) {
        return new Response(
          JSON.stringify({ error: 'Invalid chat ID' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Add user message
      messages.push({ role: 'user', content: message });

      // Call InsForge AI
      const aiResponse = await fetch(`${INSFORGE_BASE_URL}/ai/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${INSFORGE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o',
          messages: messages
        })
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('[InsForge AI] Error:', errorText);
        return new Response(
          JSON.stringify({ error: 'InsForge AI request failed', details: errorText }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const aiData = await aiResponse.json();
      const reply = aiData.choices?.[0]?.message?.content || '(No response)';

      // Update conversation
      messages.push({ role: 'assistant', content: reply });
      conversationStore.set(chatId, messages);

      return new Response(
        JSON.stringify({
          response: reply,
          chatId: chatId,
          type: 'text',
          ai_raw: aiData
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Unknown action
    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "start" or "chat"' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Error] mindfulness-chat:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
