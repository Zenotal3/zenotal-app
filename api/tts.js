// api/tts.js - Vercel Serverless Function for ElevenLabs Text-to-Speech
function generateWordTimings(text, characters, startTimes, endTimes) {
  if (!characters || !startTimes || !endTimes) return [];
  const words = [];
  let currentWord = '';
  let wordStart = null;
  let wordChars = [];

  for (let i = 0; i < characters.length; i++) {
    if (i >= startTimes.length || i >= endTimes.length) break;
    const char = characters[i];
    if (char.match(/\s/) || '.,!?;:'.includes(char)) {
      if (currentWord.trim()) {
        words.push({
          word: currentWord.trim(),
          start: wordStart,
          end: i > 0 ? endTimes[i - 1] : startTimes[i],
          characters: wordChars
        });
      }
      currentWord = '';
      wordStart = null;
      wordChars = [];
    } else {
      if (wordStart === null) wordStart = startTimes[i];
      currentWord += char;
      wordChars.push({ char, start: startTimes[i], end: endTimes[i] });
    }
  }
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

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  try {
    const { text, voice = 'male' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Select voice ID based on choice
    const voiceId = voice === 'female'
      ? 'ROMJ9yK1NAMuu1ggrjDW'  // female voice
      : 'yZggGmu2XJkoy1aHe3fg';  // male voice

    console.log(`[TTS] Using voice ID: ${voiceId} for ${voice} voice`);

    const payload = {
      text,
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
      return res.status(500).json({ error: 'ElevenLabs API error', details: errorText });
    }

    const result = await elevenLabsResponse.json();

    const alignment = result.alignment || {};
    const characters = alignment.characters || [];
    const startTimes = alignment.character_start_times_seconds || [];
    const endTimes = alignment.character_end_times_seconds || [];

    const wordTimings = generateWordTimings(text, characters, startTimes, endTimes);
    const actualDuration = endTimes.length > 0 ? endTimes[endTimes.length - 1] : 0;

    return res.status(200).json({
      audioContent: result.audio_base64,
      alignment,
      wordTimings,
      actualDuration,
      hasTimestamps: true,
      text,
      voice
    });
  } catch (error) {
    console.error('[tts] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
