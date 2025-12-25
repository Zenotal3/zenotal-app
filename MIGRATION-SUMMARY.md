# Migration Summary: Python Backend → InsForge Edge Functions

## ✅ Completed Migration

Your Zenotal app has been successfully migrated from Python Flask backend to InsForge Edge Functions!

---

## 🚀 What Changed

### Before (Python Flask)
- Flask server running on port 5150
- Google Gemini API for chat
- ElevenLabs Python SDK for TTS
- In-memory conversation storage
- Manual server deployment

### After (InsForge Edge Functions)
- Serverless edge functions on InsForge
- **GPT-4o** for chat (as requested!)
- ElevenLabs via edge function for TTS
- Conversation storage in edge function memory
- Automatic scaling and deployment

---

## 📦 Deployed Edge Functions

All functions are live at: `https://dku2r8qi.us-east.insforge.app/functions/v1/`

### 1. **mindfulness-chat** (`/mindfulness-chat`)
- **Purpose**: Hot Cross Bun conversations
- **Actions**:
  - `start` - Start new conversation with emotion
  - `chat` - Continue conversation with chatId
- **Model**: gpt-4o

### 2. **general-chat** (`/general-chat`)
- **Purpose**: General conversations without MBCT structure
- **Input**: `message`, `history`
- **Model**: gpt-4o

### 3. **tts** (`/tts`)
- **Purpose**: Text-to-speech with word-level timestamps
- **Input**: `text`, `voice` (male/female)
- **Provider**: ElevenLabs

### 4. **meditation-lines** (`/meditation-lines`)
- **Purpose**: Generate meditation Line A and Line B
- **Actions**:
  - `line-a` - Opening meditation line
  - `line-b` - Closing meditation line
- **Model**: gpt-4o

---

## 📝 Updated Files

### Created Files:
1. `functions/mindfulness-chat.js` - Chat edge function
2. `functions/general-chat.js` - General chat edge function
3. `functions/tts.js` - TTS edge function
4. `functions/meditation-lines.js` - Meditation lines edge function
5. `js/insforge.js` - InsForge SDK client (for frontend if needed)

### Modified Files:
1. `js/api.production.js` - Updated all API calls to use InsForge edge functions
2. `.env` - Added InsForge configuration
3. `frontend/.env` - Already had InsForge configuration

---

## 🔑 Environment Variables Required

The edge functions need these environment variables set in InsForge:

```bash
INSFORGE_BASE_URL=https://dku2r8qi.us-east.insforge.app
INSFORGE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

⚠️ **IMPORTANT**: Set `ELEVENLABS_API_KEY` in your InsForge dashboard for the TTS function to work.

---

## 🎯 What You Need to Do

### 1. Set ElevenLabs API Key in InsForge

Go to your InsForge dashboard and add the `ELEVENLABS_API_KEY` environment variable.

### 2. Remove Python Dependencies (Optional)

You can now safely remove:
- `proxy.py` (Python Flask backend)
- Python dependencies
- Any Python virtual environments

### 3. Update Deployment

Your app now only needs:
- Frontend static files (HTML, CSS, JS)
- Vite build process
- Edge functions (already deployed to InsForge)

Deploy the frontend to any static hosting (Vercel, Netlify, etc.)

---

## 🧪 Testing

Test each endpoint:

### Start Conversation
```javascript
const response = await fetch('https://dku2r8qi.us-east.insforge.app/functions/v1/mindfulness-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'start',
    emotion: 'anxious'
  })
});
```

### Continue Conversation
```javascript
const response = await fetch('https://dku2r8qi.us-east.insforge.app/functions/v1/mindfulness-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'chat',
    chatId: 'your-chat-id',
    message: 'I feel tired'
  })
});
```

### Text-to-Speech
```javascript
const response = await fetch('https://dku2r8qi.us-east.insforge.app/functions/v1/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello, welcome to your meditation',
    voice: 'male'
  })
});
```

---

## 📊 API Changes Summary

| Old Endpoint (Python) | New Endpoint (InsForge) | Changes |
|----------------------|------------------------|---------|
| `/api/mindfulness/start-hcb` | `/functions/v1/mindfulness-chat` | Now requires `action: 'start'` |
| `/api/mindfulness/chat` | `/functions/v1/mindfulness-chat` | Now requires `action: 'chat'` |
| `/api/mindfulness/general-chat` | `/functions/v1/general-chat` | Same input/output |
| `/api/mindfulness/line-a` | `/functions/v1/meditation-lines` | Now requires `action: 'line-a'` |
| `/api/mindfulness/line-b` | `/functions/v1/meditation-lines` | Now requires `action: 'line-b'` |
| `/api/tts` | `/functions/v1/tts` | Added `voice` parameter |

---

## ✨ Benefits of the Migration

1. **No Python Server Required** - Fully serverless
2. **GPT-4o Model** - As you requested, using OpenAI's gpt-4o
3. **Auto-scaling** - InsForge handles traffic spikes
4. **Faster Deployment** - No server setup needed
5. **Cost-effective** - Pay only for function execution
6. **ElevenLabs npm** - Using the official ElevenLabs package

---

## 🔧 Build Process

Your Vite build already includes all necessary files:

```javascript
// vite.config.js copies:
- js/**/* (includes insforge.js and api.production.js)
- css/**/*

// HTML entry points:
- index.html
- conversation.html
- app.html
- audio.html
- sharing.html
```

Run `npm run build` to create the production build in `/dist`.

---

## 📞 Support

If you encounter any issues:
1. Check browser console for errors
2. Verify InsForge functions are active in dashboard
3. Ensure `ELEVENLABS_API_KEY` is set in InsForge
4. Check network tab for API responses

---

**Migration completed successfully! Your app is now running on InsForge with gpt-4o.** 🎉
