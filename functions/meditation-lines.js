/**
 * InsForge Edge Function: Meditation Lines Generation
 * Generates Line A and Line B for meditation practice using gpt-4o
 */

module.exports = async function(request) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      action, // 'line-a' or 'line-b'
      emotion,
      sensation,
      thoughts = [],
      impulses = [],
      bodySensations = [],
      needs = [],
      conversationMode = true
    } = body;

    if (!emotion) {
      return new Response(
        JSON.stringify({ error: 'Emotion is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!action || !['line-a', 'line-b'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "line-a" or "line-b"' }),
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

    // Extract primary elements
    const primarySensation = bodySensations[0] || sensation || "tension in the body";
    const primaryThought = thoughts[0] || "racing thoughts";
    const primaryImpulse = impulses[0] || "wanting to escape";
    const primaryNeed = needs[0] || "connection";

    let prompt = '';

    if (action === 'line-a') {
      if (conversationMode) {
        // User had the full HCB conversation
        prompt = `You are an experienced mindfulness guide.
Create two sentences. First sentence must weave all 3 elements of ${emotion}, ${primarySensation} and ${primaryThought} or ${primaryImpulse}, change personal pronoun from first to second, if applicable. Second sentence is a personalized reflective comment about ${emotion}.
Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
Do not use any formatting, e.g. bold, italic in your response.`;
      } else {
        // User skipped the conversation
        prompt = `You are an experienced mindfulness guide.
Write two balanced sentences. First acknowledges ${emotion} with common body sensations, second sentence offers a neutral perspective on ${emotion}.
Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
Do not use any formatting, e.g. bold, italic in your response.`;
      }
    } else {
      // line-b
      if (conversationMode) {
        // User had the full HCB conversation
        prompt = `You are an experienced mindfulness guide.
Create two balanced sentences. Mention both ${primaryThought} or ${primaryImpulse}, and ${primaryNeed}, change personal pronoun from first to second, if applicable. End with a forward-looking clause ("…as you step back to your day").
Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
Do not use any formatting, e.g. bold, italic in your response.`;
      } else {
        // User skipped the conversation
        prompt = `You are an experienced mindfulness guide.
Create two balanced sentences. First sentence checks whether the ${emotion} has shifted, second sentence invites one grounding breath.
Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
Do not use any formatting, e.g. bold, italic in your response.`;
      }
    }

    // Call InsForge AI
    const aiResponse = await fetch(`${INSFORGE_BASE_URL}/ai/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INSFORGE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'user', content: prompt }
        ]
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

    return new Response(
      JSON.stringify({ response: reply }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Error] meditation-lines:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
