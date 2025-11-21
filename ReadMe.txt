## Project Structure

`
mindreset-web/
 index.html              # Main entry point and launch page
 audio.html              # Meditation audio playback interface
 app.html                # Chat/conversation interface
 conversation.html       # Extended conversation features
 sharing.html            # Social sharing functionality
 proxy.py                # Flask backend server
 requirements.txt        # Python dependencies

 css/
    reset.css           # CSS reset styles
    style.css           # Global styles
    pages/              # Page-specific stylesheets
        launch.css      # Landing page styles
        emotion-wheel.css # Emotion selection interface
        audio.css       # Audio player styling
        app.css         # Chat interface styles
        conversation.css # Conversation page styles
        sharing.css     # Sharing functionality styles

 js/
     api.js              # Development API configuration
     api.production.js   # Production API configuration
     navigation.js       # Page navigation logic
     speech.js           # Speech recognition functionality
     tts.js              # Text-to-speech utilities
     emotion-body-map.json # Emotion-to-body mapping data
     pages/              # Page-specific JavaScript
         launch.js       # Landing page interactions
         emotion-wheel.js # Emotion selection logic
         audio.js        # Audio playback controller
         app.js          # Chat functionality
         conversation.js # Conversation management
         sharing.js      # Social sharing features
`

## Core Components

### Frontend Pages

- **Launch Page** (index.html): Initial landing page with animated gradient background and "Begin Reset" button
- **Emotion Wheel** (index.html): Interactive emotion selection interface with visual cards
- **Audio Player** (audio.html): Meditation playback with controls, progress tracking, and subtitle support
- **Chat Interface** (app.html): AI-powered conversation system for emotional processing
- **Conversation** (conversation.html): Extended conversation features
- **Sharing** (sharing.html): Social sharing and session completion features

### Backend Server (proxy.py)

Flask-based server providing:
- **TTS Generation**: Google Cloud Text-to-Speech API integration with ElevenLabs
- **API Proxying**: Routes requests to external AI services (Gemini, Ollama)
- **Session Management**: Handles user state and conversation history
- **Audio Processing**: Manages hybrid static + TTS audio generation
- **CORS Support**: Enables cross-origin requests for development

### Key JavaScript Modules

- **audio.js**: Complex hybrid audio system combining static files with dynamic TTS
- **emotion-wheel.js**: Interactive emotion selection with 8 core emotions
- **navigation.js**: Single-page application routing and state management
- **tts.js**: Text-to-speech utilities and audio blob management
- **speech.js**: Speech recognition for voice input capabilities



## Technology Stack

### Frontend
- **HTML5/CSS3**: Semantic markup and modern styling
- **Vanilla JavaScript**: No frameworks, optimized performance
- **Web APIs**: Speech Recognition, Audio API, Canvas API
- **CSS Grid/Flexbox**: Responsive layouts
- **CSS Animations**: Smooth transitions and loading states

### Backend
- **Python 3.8+**: Server-side logic
- **Flask**: Lightweight web framework
- **Google Gemini AI**: Conversation and content generation
- **ElevenLabs TTS**: High-quality voice synthesis with timing data
- **CORS**: Cross-origin request handling


## Setup and Installation

1. **Install Python dependencies**:

2. **Configure API Keys**:
   - Set GEMINI_API_KEY environment variable for AI conversations
   - Set ELEVENLABS_API_KEY environment variable for TTS
   - Place Google Cloud service account JSON as 	ts-service-account.json (if using Google TTS)

3. **Run the development server**:
   `ash
   python proxy.py
   `

4. **Access the application**:
   - Open http://localhost:5150 in your browser
   - For development, you can also open index.html directly

## API Endpoints

### Core Endpoints
- POST /api/tts - Text-to-speech conversion with timing data
- POST /api/mindfulness/start-hcb - Start MBCT conversation flow
- POST /api/mindfulness/chat - Continue conversation
- POST /api/mindfulness/extract-aspect - Extract body/thoughts/impulses/needs
- POST /api/mindfulness/line-a - Generate personalized meditation opening
- POST /api/mindfulness/line-b - Generate personalized meditation closing

### Utility Endpoints
- GET /api/test - Server health check
- POST /api/estimate-duration - Get accurate audio durations
- POST /api/generate - Proxy to Ollama (if available)

## Configuration

- **API Endpoints**: Configure in js/api.js (development) or js/api.production.js (production)
- **TTS Settings**: Modify voice, language, and speech rate in proxy.py
- **Audio Assets**: Place meditation files in  ssets/audios/
- **Deployment**: Use 
ender.yaml for Render.com deployment


## Development Notes

- The application uses no external frameworks for optimal performance
- All animations are CSS-based with hardware acceleration
- Audio system handles both static files and dynamic TTS seamlessly
- Responsive design scales from mobile (320px) to desktop (1920px+)
- Comprehensive error handling for network and audio playback issues
- MBCT (Mindfulness-Based Cognitive Therapy) inspired conversation flow

## User Flow

### 1. Launch & Emotion Selection
- User visits landing page with animated gradient background
- Clicks "Begin Reset" to start the journey
- Selects from 8 core emotions using interactive cards
- Each emotion card shows body sensation mapping

### 2. Stress Assessment
- 5-point stress scale selection
- Determines session duration (2-3 minutes)
- Optional conversation mode selection

### 3. Conversation Flow (Optional)
- MBCT-inspired Body-Cognition-Behavior exploration
- AI facilitator guides through 4 aspects:
  - Body sensations
  - Thoughts and mental patterns  
  - Impulses and urges
  - Deeper needs
- Natural language processing extracts key insights

### 4. Meditation Session
- Hybrid audio system combines:
  - Static intro/outro files
  - Personalized TTS content based on user input
  - Seamless transitions between segments
- Real-time subtitle display with word-level timing
- Progress tracking and playback controls

### 5. Session Completion
- Optional sharing functionality
- Session summary and insights
- Return to home or start new session

## Audio System Architecture

### Hybrid Approach
The audio system combines static files with dynamic TTS for optimal quality and personalization:

- **Static Files**: High-quality pre-recorded intro, transitions, and outro
- **Dynamic TTS**: Personalized content using ElevenLabs API
- **Seamless Mixing**: Automatic duration calculation and smooth transitions

### Subtitle System
- Word-level timing data from TTS API
- Real-time subtitle display during playback
- Toggle on/off capability
- Synchronized with audio segments

## Deployment

The application is configured for deployment on Render.com using the included 
ender.yaml configuration. It can also be deployed to any platform supporting Python/Flask applications.

### Environment Variables Required:
- GEMINI_API_KEY: Google Gemini AI API key
- ELEVENLABS_API_KEY: ElevenLabs TTS API key
- PORT: Server port (defaults to 5150)

## License

This project is proprietary software. All rights reserved.

---

*MindReset - Personalized meditation for emotional wellness*
