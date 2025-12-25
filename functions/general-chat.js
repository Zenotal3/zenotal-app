/**
 * InsForge Edge Function: General Chat
 * Handles general conversations without the MBCT structure
 */

module.exports = async function(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get InsForge configuration
    const INSFORGE_BASE_URL = Deno.env.get('INSFORGE_BASE_URL');
    const INSFORGE_ANON_KEY = Deno.env.get('INSFORGE_ANON_KEY');

    if (!INSFORGE_BASE_URL || !INSFORGE_ANON_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing InsForge configuration' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert history from Gemini format to OpenAI format if needed
    const messages = history.map(msg => {
      const role = msg.role === 'model' ? 'assistant' : msg.role;
      const content = msg.parts?.[0]?.text || msg.content || '';
      return { role, content };
    });

    // Add current message
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

    // Build updated history in Gemini format for backward compatibility
    const updatedHistory = [
      ...history,
      { role: 'user', parts: [{ text: message }] },
      { role: 'model', parts: [{ text: reply }] }
    ];

    // Limit history length to last 10 messages
    const limitedHistory = updatedHistory.slice(-10);

    return new Response(
      JSON.stringify({
        response: reply,
        history: limitedHistory,
        type: 'text'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Error] general-chat:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
