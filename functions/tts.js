/**
 * InsForge Edge Function: Text-to-Speech with ElevenLabs
 * Converts text to speech with word-level timestamps
 */

function generateWordTimings(text, characters, startTimes, endTimes) {
  if (!characters || !startTimes || !endTimes) {
    return [];
  }

  const words = [];
  let currentWord = "";
  let wordStart = null;
  let wordChars = [];

  for (let i = 0; i < characters.length; i++) {
    if (i >= startTimes.length || i >= endTimes.length) {
      break;
    }

    const char = characters[i];

    if (char.match(/\s/) || '.,!?;:'.includes(char)) {
      // End of word
      if (currentWord.trim()) {
        words.push({
          word: currentWord.trim(),
          start: wordStart,
          end: i > 0 ? endTimes[i - 1] : startTimes[i],
          characters: wordChars
        });
      }
      currentWord = "";
      wordStart = null;
      wordChars = [];
    } else {
      // Part of word
      if (wordStart === null) {
        wordStart = startTimes[i];
      }
      currentWord += char;
      wordChars.push({
        char: char,
        start: startTimes[i],
        end: endTimes[i]
      });
    }
  }

  // Add last word if exists
  if (currentWord.trim() && wordStart !== null) {
    words.push({
      word: currentWord.trim(),
      start: wordStart,
      end: endTimes[endTimes.length - 1],
      characters: wordChars
    });
  }

  return words;
}

module.exports = async function(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { text, includeDuration = false, voice = 'male' } = body;

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'No text provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get ElevenLabs API key from environment
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Select voice ID based on choice
    const voiceId = voice === 'female'
      ? 'ROMJ9yK1NAMuu1ggrjDW'  // female voice
      : 'yZggGmu2XJkoy1aHe3fg';  // male voice

    console.log(`[TTS] Using voice ID: ${voiceId} for ${voice} voice`);

    // Call ElevenLabs API with timestamps
    const payload = {
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        speed: 0.8,
        stability: 0.8,
        similarity_boost: 0.8
      }
    };

    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error('[ElevenLabs] Error:', errorText);
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API error', details: errorText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await elevenLabsResponse.json();

    // Extract timing data
    const alignment = result.alignment || {};
    const characters = alignment.characters || [];
    const startTimes = alignment.character_start_times_seconds || [];
    const endTimes = alignment.character_end_times_seconds || [];

    // Generate word-level timing from character-level data
    const wordTimings = generateWordTimings(text, characters, startTimes, endTimes);

    // Calculate actual duration from timing data
    const actualDuration = endTimes.length > 0 ? endTimes[endTimes.length - 1] : 0;

    const responseData = {
      audioContent: result.audio_base64,
      alignment: alignment,
      wordTimings: wordTimings,
      actualDuration: actualDuration,
      hasTimestamps: true,
      text: text,
      voice: voice
    };

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Error] tts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
