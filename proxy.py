from flask import Flask, request, jsonify, session, send_from_directory
import os
import uuid
import re
import json
from flask_cors import CORS
import requests
import base64
import io
import time

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
INSFORGE_BASE_URL = os.environ.get("INSFORGE_BASE_URL")
INSFORGE_ANON_KEY = os.environ.get("INSFORGE_ANON_KEY") 

app = Flask(__name__)
# Update CORS to allow requests from your web app
CORS(app, origins="*")

OLLAMA_BASE = "http://localhost:11434"

conversation_store = {}

# Helper functions for InsForge AI integration
def gemini_to_openai_messages(gemini_messages):
    """Convert Gemini message format to OpenAI format"""
    openai_messages = []
    for msg in gemini_messages:
        role = msg.get("role")
        parts = msg.get("parts", [])
        text = parts[0].get("text", "") if parts else ""

        # Convert Gemini 'model' role to OpenAI 'assistant' role
        if role == "model":
            role = "assistant"

        openai_messages.append({"role": role, "content": text})

    return openai_messages

def openai_to_gemini_format(role, content):
    """Convert OpenAI message to Gemini format for storage"""
    gemini_role = "model" if role == "assistant" else role
    return {"role": gemini_role, "parts": [{"text": content}]}

def call_insforge_ai(messages, model="openai/gpt-4o"):
    """Call InsForge AI API with OpenAI-compatible format"""
    url = f"{INSFORGE_BASE_URL}/ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {INSFORGE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": messages
    }

    response = requests.post(url, json=payload, headers=headers)
    print(f"[InsForge AI] HTTP status: {response.status_code}")

    if response.status_code != 200:
        print(f"[InsForge AI] Error response: {response.text}")
        return None

    try:
        data = response.json()
        print(f"[InsForge AI] Response JSON: {data}")
        return data
    except Exception as e:
        print(f"[InsForge AI] Failed to parse JSON: {e}")
        print(f"[InsForge AI] Raw response: {response.text}")
        return None

# Load emotion-body map from JSON file
def load_emotion_body_map():
    """Load the emotion-body map from the JSON file"""
    try:
        with open('js/emotion-body-map.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("[WARNING] emotion-body-map.json not found, using fallback data")
        return {}
    except json.JSONDecodeError as e:
        print(f"[ERROR] Failed to parse emotion-body-map.json: {e}")
        return {}

def get_emotion_data(target_emotion, emotion_map):
    """Get data for the specific target emotion only"""
    if target_emotion in emotion_map:
        return {target_emotion: emotion_map[target_emotion]}
    return {}

def format_emotion_for_prompt(emotion, sensations):
    """Format a single emotion for inclusion in prompts"""
    sensations_str = '", "'.join(sensations)
    return f'"{emotion}": ["{sensations_str}"]'

@app.route("/api/generate", methods=["POST"])
def proxy_generate():
    try:
        response = requests.post(f"{OLLAMA_BASE}/api/generate", json=request.json)
        return jsonify(response.json())
    except Exception as e:
        return {"error": str(e)}, 500

@app.route("/api/test", methods=["GET"])
def test_connectivity():
    """Simple endpoint to test if server is running"""
    return jsonify({
        "status": "ok",
        "message": "Flask server is running",
        "timestamp": __import__('datetime').datetime.now().isoformat()
    })

@app.route("/api/tts", methods=["POST"])
def text_to_speech():
    print(f"[DEBUG] TTS endpoint called with method: {request.method}")
    print(f"[DEBUG] Content-Type: {request.headers.get('Content-Type')}")
    print(f"[DEBUG] Request data: {request.get_data()}")
    
    try:
        text = request.json.get("text", "")
        return_duration = request.json.get("includeDuration", False)
        selected_voice = request.json.get("voice", "male")  # Get voice selection from frontend
        print(f"[DEBUG] Extracted text: {text}")
        print(f"[DEBUG] Include duration: {return_duration}")
        print(f"[DEBUG] Selected voice: {selected_voice}")
        
        if not text:
            return {"error": "No text provided"}, 400

        # Estimate duration based on text length (average speaking rate: ~150 words per minute)
        words = len(text.split())
        estimated_duration = (words / 150) * 60  # Convert to seconds
        
        # Choose TTS provider: 'elevenlabs' or 'google'
        tts_provider = "elevenlabs"
        
        if tts_provider == "google":
            # Google TTS (Free)
            from gtts import gTTS
            import io
            
            # Create gTTS object
            tts = gTTS(text=text, lang='en', slow=False)
            
            # Save to BytesIO buffer
            audio_buffer = io.BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            
            # Encode as base64
            audio_base64 = base64.b64encode(audio_buffer.read()).decode("utf-8")
            
            response_data = {"audioContent": audio_base64}
            if return_duration:
                response_data["estimatedDuration"] = estimated_duration
            return jsonify(response_data)
            
        else:
            # ElevenLabs TTS (Premium) - MANDATORY timestamp API usage
            # Select voice ID based on frontend choice
            if selected_voice == "female":
                voice_id = "ROMJ9yK1NAMuu1ggrjDW"  # female final
            else:
                voice_id = "yZggGmu2XJkoy1aHe3fg"  # male final
            
            print(f"[DEBUG] Using voice ID: {voice_id} for {selected_voice} voice")

            # ALWAYS use timestamp API for accurate timing
            payload = {
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "speed": 0.8,
                    "stability": 0.8,
                    "similarity_boost": 0.8
                }
            }
            
            print(f"[DEBUG] Using ElevenLabs timestamp API for: {text[:50]}...")
            
            response = requests.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps",
                headers={
                    "xi-api-key": f"{ELEVENLABS_API_KEY}",
                    "Content-Type": "application/json"
                },
                json=payload,
            )
            if response.status_code != 200:
                return {"error": f"ElevenLabs Timestamp API error: {response.text}"}, 500

            result = response.json()
            
            # Extract timing data
            alignment = result.get("alignment", {})
            characters = alignment.get("characters", [])
            start_times = alignment.get("character_start_times_seconds", [])
            end_times = alignment.get("character_end_times_seconds", [])
            
            # Generate word-level timing from character-level data
            word_timings = generate_word_timings(text, characters, start_times, end_times)
            
            # Calculate actual duration from timing data
            actual_duration = end_times[-1] if end_times else 0
            
            response_data = {
                "audioContent": result.get("audio_base64"),
                "alignment": alignment,
                "wordTimings": word_timings,
                "actualDuration": actual_duration,
                "hasTimestamps": True,
                "text": text,
                "wordCount": len(text.split()),
                "characterCount": len(text)
            }
            
            # Include estimated duration for backward compatibility
            if return_duration:
                words = len(text.split())
                estimated_duration = (words / 150) * 60
                response_data["estimatedDuration"] = estimated_duration
                
            print(f"[DEBUG] Generated audio with {len(word_timings)} word timings, duration: {actual_duration:.2f}s")
            
            return jsonify(response_data)

    except Exception as e:
        return {"error": str(e)}, 500

def generate_word_timings(text, characters, start_times, end_times):
    """Generate word-level timing from character-level timing data"""
    if not characters or not start_times or not end_times:
        return []
    
    words = []
    current_word = ""
    word_start = None
    word_chars = []
    
    for i, char in enumerate(characters):
        if i >= len(start_times) or i >= len(end_times):
            break
            
        if char.isspace() or char in '.,!?;:':
            # End of word
            if current_word.strip():
                words.append({
                    "word": current_word.strip(),
                    "start": word_start,
                    "end": end_times[i-1] if i > 0 else start_times[i],
                    "characters": word_chars
                })
            current_word = ""
            word_start = None
            word_chars = []
        else:
            # Part of word
            if word_start is None:
                word_start = start_times[i]
            current_word += char
            word_chars.append({
                "char": char,
                "start": start_times[i],
                "end": end_times[i]
            })
    
    # Handle last word if text doesn't end with space
    if current_word.strip():
        words.append({
            "word": current_word.strip(),
            "start": word_start,
            "end": end_times[-1],
            "characters": word_chars
        })
    
    return words

@app.route("/api/estimate-duration", methods=["POST"])
def estimate_audio_duration():
    """Get accurate audio durations using timestamp API"""
    try:
        texts = request.json.get("texts", [])
        if not texts:
            return {"error": "No texts provided"}, 400
        
        durations = []
        for text in texts:
            if text and text.strip():
                try:
                    # Use TTS timestamp API to get actual duration
                    tts_response = requests.post(
                        "http://localhost:5000/api/tts",
                        json={"text": text, "includeTimestamps": True},
                        headers={"Content-Type": "application/json"}
                    )
                    
                    if tts_response.status_code == 200:
                        tts_data = tts_response.json()
                        actual_duration = tts_data.get("actualDuration", 0)
                        if actual_duration > 0:
                            durations.append(round(actual_duration, 2))
                            print(f"[DEBUG] Got actual duration for '{text[:30]}...': {actual_duration:.2f}s")
                            continue
                    
                    # Fallback to estimation if TTS fails
                    words = len(text.split())
                    estimated_duration = (words / 150) * 60 / 0.9  # Adjust for speed setting
                    durations.append(round(estimated_duration, 2))
                    print(f"[DEBUG] Using estimated duration for '{text[:30]}...': {estimated_duration:.2f}s")
                    
                except Exception as e:
                    print(f"[ERROR] Error getting duration for text: {str(e)}")
                    # Fallback to estimation
                    words = len(text.split())
                    estimated_duration = (words / 150) * 60 / 0.9
                    durations.append(round(estimated_duration, 2))
            else:
                durations.append(0)
        
        return {"durations": durations}
    except Exception as e:
        return {"error": str(e)}, 500


# Helper: Compose the system prompt for Gemini
def get_mbct_system_prompt(emotion):
    return f"""
You are a warm, concise MBCT-inspired facilitator and an experienced psychological counselor. Your tone is empathic, conversational, never clinical. Vary wording naturally.
Your goal is to guide the user de-blob today's experience into Body → Thoughts → Impulse → Deeper Need. After every user reply, paraphrase in one short sentence to show you heard them.
Vary sentence openings, but stay within an empathic, conversational range (avoid “clinical” diction such as “cognitive distortion”, “diagnosis”, etc.).
Opening: Mirror the user's chosen emotion with empathy and greet the user. Mirror Example: “Sounds like you're feeling anxious right now.”, “Hey, I sense some anxiety"; Greeting Example: "Welcome back—I'm here with you.", "Glad you reached out.", "Let's unpack this together, at your pace." 
Ask each question one at a time. When you ask about body sensations, include 2-3 example answers in parentheses.
If the user replies “not sure”, offer two example answers in brackets and repeat the same question once.
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
The user's current emotion is: {emotion}
"""


@app.route("/api/mindfulness/start-hcb", methods=["POST"])
def start_mbct_conversation():
    try:
        emotion = request.json.get("emotion", "")
        if not emotion:
            return {"error": "Emotion is required"}, 400
        chat_id = str(uuid.uuid4())
        # Compose system prompt
        system_prompt = get_mbct_system_prompt(emotion)

        # Start conversation history in Gemini format for backward compatibility
        conversation_store[chat_id] = [
            {"role": "user", "parts": [{"text": system_prompt}]},
            {"role": "user", "parts": [{"text": f"My emotion is {emotion}."}]}
        ]

        # Convert to OpenAI format for InsForge AI
        openai_messages = gemini_to_openai_messages(conversation_store[chat_id])
        # Use system role for the system prompt
        openai_messages[0]["role"] = "system"

        # Call InsForge AI with gpt-4o
        data = call_insforge_ai(openai_messages, model="openai/gpt-4o")

        if not data:
            return {"error": "InsForge AI did not return valid response"}, 500

        # Extract response from OpenAI format
        reply = data.get("choices", [{}])[0].get("message", {}).get("content", "(No response)")

        # Store response in Gemini format for backward compatibility
        conversation_store[chat_id].append({"role": "model", "parts": [{"text": reply}]})

        return {"response": reply, "chatId": chat_id, "type": "text", "ai_raw": data}
    except Exception as e:
        print(f"[Error] start_mbct_conversation: {str(e)}")
        return {"error": str(e)}, 500



# New: Per-question extraction endpoint for HCB (Body, Thoughts, Impulse, Need)
@app.route("/api/mindfulness/extract-aspect", methods=["POST"])
def extract_hcb_aspect():
    """
    Extract a single aspect (body, thoughts, impulses, need) from the latest user answer in the HCB flow.
    Expects: { chatId, aspect: 'body'|'thoughts'|'impulses'|'need', [step]: int (optional) }
    """
    try:
        chat_id = request.json.get("chatId", "")
        aspect = request.json.get("aspect", "body")
        if not chat_id or chat_id not in conversation_store:
            return {"error": "Chat ID not found"}, 400
        if aspect not in ("body", "thoughts", "impulses", "need"):
            return {"error": "Invalid aspect"}, 400

        # Get the conversation history
        history = conversation_store[chat_id]

        # Find the last user message (the answer to the current question)
        # Skip system prompts and initial setup messages
        last_user_message = None
        user_messages = []
        
        # Collect all user messages, excluding system prompts
        for message in history:
            if message.get("role") == "user":
                text = message.get("parts", [{}])[0].get("text", "").strip()
                # Skip system prompts and initial setup
                if (text and 
                    not text.startswith("You are a") and 
                    not text.startswith("My emotion is") and
                    len(text) < 500):  # User answers are typically short
                    user_messages.append(text)
        
        # Get the most recent actual user answer
        if user_messages:
            last_user_message = user_messages[-1]
            print(f"[DEBUG] Found last user message: '{last_user_message}'", flush=True)
        else:
            print(f"[DEBUG] No valid user messages found in history", flush=True)
            return {"error": "No user answer found"}, 400

        # Compose extraction prompt for the specific aspect
        aspect_map = {
            "body": "BODY_SENSATIONS",
            "thoughts": "THOUGHTS",
            "impulses": "IMPULSES",
            "need": "NEED"
        }
        aspect_label = aspect_map[aspect]
        
        # Enhanced extraction prompts with examples and better instructions
        extraction_prompts = {
            "body": f"""Extract ALL body sensations and physical experiences from the user's answer. Look for:
            - Physical sensations: warmth, heat, cold, tension, tightness, heaviness, lightness, pressure
            - Body parts mentioned: face, chest, stomach, shoulders, head, hands, etc.
            - Physical states: racing heart, shallow breathing, butterflies, knots, aching
            - Physical qualities: sharp, dull, throbbing, tingling, numb

            Include the full description of each sensation with location if mentioned.
            Examples: 'warmth in my face', 'tension in shoulders', 'racing heart', 'butterflies in stomach'

            Output ONLY in this exact format:
            BODY_SENSATIONS: [sensation1, sensation2, sensation3]

            If no body sensations are mentioned, output:
            BODY_SENSATIONS: []""",
                        
            "thoughts": f"""Extract ALL thoughts, mental content, and internal dialogue from the user's answer. Look for:
            - Direct thoughts: "I think...", "I believe...", internal voice
            - Worries and concerns: what they're thinking about
            - Mental judgments: self-criticism, evaluations
            - Mental narratives: stories they tell themselves

            Capture the complete thought, not just keywords.
            Examples: 'I can't handle this situation', 'everything is going wrong', 'I need to get out of here'

            Output ONLY in this exact format:
            THOUGHTS: [thought1, thought2, thought3]

            If no thoughts are mentioned, output:
            THOUGHTS: []""",
                        
            "impulses": f"""Extract ALL urges, impulses, and desires to act from the user's answer. Look for:
            - Action urges: run away, hide, call someone, fight, escape
            - Behavioral impulses: avoid, withdraw, attack, seek comfort
            - Movement desires: wanting to move, freeze, flee

            Capture the complete impulse description.
            Examples: 'want to run away', 'urge to hide under covers', 'need to call my friend'

            Output ONLY in this exact format:
            IMPULSES: [impulse1, impulse2, impulse3]

            If no impulses are mentioned, output:
            IMPULSES: []""",
                        
            "need": f"""Extract ALL deeper needs, desires, and underlying wants from the user's answer. Look for:
            - Emotional needs: safety, connection, understanding, acceptance
            - Basic needs: peace, control, comfort, security
            - Relational needs: support, love, validation
            - Core desires: what they truly want or need right now

            Examples: 'need for safety', 'desire for connection', 'want to feel understood'

            Output ONLY in this exact format:
            NEED: [need1, need2, need3]

            If no needs are mentioned, output:
            NEED: []"""
        }
        extraction_prompt = extraction_prompts[aspect]

        # Only send the last user answer and the extraction prompt to Gemini for focus
        extraction_conversation = [
            {"role": "user", "parts": [{"text": f"User's answer to a mindfulness question: '{last_user_message}'"}]},
            {"role": "user", "parts": [{"text": extraction_prompt}]}
        ]
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {"contents": extraction_conversation}
        response = requests.post(url, json=payload)
        data = response.json()
        # Retry once if Gemini returns 503 error
        if data.get('error', {}).get('code') == 503:
            print(f'[Gemini] 503 error on extract-aspect ({aspect}), retrying once...', flush=True)
            response = requests.post(url, json=payload)
            data = response.json()
        extraction_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        print(f"[Gemini] Extracted {aspect_label}: {extraction_text}", flush=True)

        # Parse the result for the aspect
        def parse_aspect(text, label):
            import re
            print(f"[DEBUG] Parsing text for {label}: '{text.strip()}'", flush=True)
            
            # Try exact format first: LABEL: [item1, item2, item3]
            match = re.search(rf'{label}:\s*\[(.*?)\]', text, re.IGNORECASE | re.DOTALL)
            if match:
                content = match.group(1).strip()
                print(f"[DEBUG] Found bracketed content: '{content}'", flush=True)
                if not content:  # Empty brackets []
                    print(f"[DEBUG] Empty brackets detected for {label}", flush=True)
                    return []
                
                # Split by comma and clean up each item
                items = []
                for item in content.split(','):
                    item = item.strip().strip('"\'').strip()
                    if item and item.lower() not in ['none', 'nothing', 'n/a']:
                        items.append(item)
                print(f"[DEBUG] Parsed items: {items}", flush=True)
                return items
            
            # Enhanced fallback: try to extract from the user's original message using multiple strategies
            print(f"[DEBUG] No proper format found, attempting enhanced fallback extraction", flush=True)
            
            # Get the original user message for fallback parsing
            user_text = last_user_message.lower()
            
            # For body sensations, use comprehensive pattern matching
            if label == "BODY_SENSATIONS":
                sensations = []
                
                # Pattern 1: "sensation in/on body_part" 
                body_parts = ['face', 'head', 'neck', 'shoulders', 'chest', 'stomach', 'belly', 'back', 'arms', 'hands', 'legs', 'feet', 'throat', 'heart', 'body']
                sensation_words = ['warm', 'warmth', 'hot', 'heat', 'cold', 'cool', 'tense', 'tension', 'tight', 'tightness', 'heavy', 'heaviness', 'light', 'pressure', 'ache', 'aching', 'pain', 'painful', 'tingling', 'numb', 'racing', 'beating', 'pounding', 'shallow', 'deep', 'butterflies', 'knot', 'knotted', 'clenched', 'relaxed', 'stiff']
                
                # Look for "sensation + in/on + body_part" patterns
                for sensation in sensation_words:
                    for body_part in body_parts:
                        patterns = [
                            rf'{sensation}\s+in\s+my\s+{body_part}',
                            rf'{sensation}\s+on\s+my\s+{body_part}',
                            rf'{sensation}\s+in\s+the\s+{body_part}',
                            rf'{sensation}\s+{body_part}',
                            rf'my\s+{body_part}\s+feels?\s+{sensation}',
                            rf'feeling\s+{sensation}\s+in\s+my\s+{body_part}'
                        ]
                        for pattern in patterns:
                            if re.search(pattern, user_text):
                                sensations.append(f"{sensation} in {body_part}")
                                break
                
                # Pattern 2: standalone sensation words in context
                if not sensations:
                    for sensation in sensation_words:
                        if re.search(rf'\b{sensation}\b', user_text):
                            # Try to find context around it
                            context_match = re.search(rf'(\w+\s+)*{sensation}(\s+\w+)*', user_text)
                            if context_match:
                                context = context_match.group(0).strip()
                                sensations.append(context)
                            else:
                                sensations.append(sensation)
                
                # Remove duplicates while preserving order
                unique_sensations = []
                for s in sensations:
                    if s not in unique_sensations:
                        unique_sensations.append(s)
                
                print(f"[DEBUG] Enhanced fallback body sensations found: {unique_sensations}", flush=True)
                return unique_sensations[:3]  # Limit to top 3 most relevant
            
            # For thoughts, look for thinking patterns
            elif label == "THOUGHTS":
                thoughts = []
                
                # Look for explicit thought patterns
                thought_patterns = [
                    r"i think\s+(.+?)(?:[.!?]|$)",
                    r"i believe\s+(.+?)(?:[.!?]|$)", 
                    r"i feel like\s+(.+?)(?:[.!?]|$)",
                    r"i'm thinking\s+(.+?)(?:[.!?]|$)",
                    r"my thought is\s+(.+?)(?:[.!?]|$)"
                ]
                
                for pattern in thought_patterns:
                    matches = re.findall(pattern, user_text, re.IGNORECASE)
                    for match in matches:
                        thoughts.append(match.strip())
                
                print(f"[DEBUG] Enhanced fallback thoughts found: {thoughts}", flush=True)
                return thoughts[:3]
            
            # For impulses, look for action words
            elif label == "IMPULSES":
                impulses = []
                
                impulse_patterns = [
                    r"want to\s+(.+?)(?:[.!?]|$)",
                    r"need to\s+(.+?)(?:[.!?]|$)",
                    r"urge to\s+(.+?)(?:[.!?]|$)",
                    r"feel like\s+(.+?)(?:[.!?]|$)"
                ]
                
                for pattern in impulse_patterns:
                    matches = re.findall(pattern, user_text, re.IGNORECASE)
                    for match in matches:
                        impulses.append(match.strip())
                
                print(f"[DEBUG] Enhanced fallback impulses found: {impulses}", flush=True)
                return impulses[:3]
            
            # For needs, look for need/want expressions
            elif label == "NEED":
                needs = []
                
                need_patterns = [
                    r"need\s+(.+?)(?:[.!?]|$)",
                    r"want\s+(.+?)(?:[.!?]|$)",
                    r"desire\s+(.+?)(?:[.!?]|$)",
                    r"looking for\s+(.+?)(?:[.!?]|$)"
                ]
                
                for pattern in need_patterns:
                    matches = re.findall(pattern, user_text, re.IGNORECASE)
                    for match in matches:
                        needs.append(match.strip())
                
                print(f"[DEBUG] Enhanced fallback needs found: {needs}", flush=True)
                return needs[:3]
            
            print(f"[DEBUG] No extraction possible for {label}", flush=True)
            return []

        aspect_result = parse_aspect(extraction_text, aspect_label)
        return {"aspect": aspect, "values": aspect_result, "_raw": extraction_text}
    except Exception as e:
        return {"error": str(e)}, 500
    
@app.route("/api/mindfulness/line-a", methods=["POST"])
def generate_line_a():
    try:
        emotion = request.json.get("emotion", "")
        sensation = request.json.get("sensation", "")
        thoughts = request.json.get("thoughts", [])
        impulses = request.json.get("impulses", [])
        body_sensations = request.json.get("bodySensations", [])
        needs = request.json.get("needs", [])
        conversation_mode = request.json.get("conversationMode", True)  # True = had conversation, False = skipped
        
        if not emotion:
            return {"error": "Emotion missing"}, 400
            
       
        # Use the actual conversation data to create a more personalized question
        primary_sensation = body_sensations[0] if body_sensations else (sensation or "tension in the body")
        primary_thought = thoughts[0] if thoughts else "racing thoughts"
        primary_impulse = impulses[0] if impulses else "wanting to escape"
        primary_need = needs[0] if needs else "connection"
        
        # Two different prompt versions based on conversation mode
        if conversation_mode:
            # Version 1: User had the full HCB conversation
            prompt = f"""
            You are an experienced mindfulness guide.
            Create two sentences. First sentence must weave all 3 elements of {emotion}, {primary_sensation} and {primary_thought} or {primary_impulse}, change personal pronoun from first to second, if applicable. Second sentence is a personalized reflective comment about {emotion}.
            Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
            Do not use any formatting, e.g. bold, italic in your response."""
        else:
            # Version 2: User skipped the conversation - use exact emotion only
            emotion_map = load_emotion_body_map()
            emotion_data = get_emotion_data(emotion, emotion_map)
            
            if emotion_data:
                sensations = emotion_data[emotion]
                emotion_text = format_emotion_for_prompt(emotion, sensations)
                prompt = f"""
                You are an experienced mindfulness guide.
                Here is the body sensation data for {emotion}:
                
                {emotion_text}
                
                Write two balanced sentences. First shows {emotion} and 2 corresponding body sensations from the data above, second sentence offers a neutral perspective on {emotion}.
                Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
                Do not use any formatting, e.g. bold, italic in your response."""
            else:
                # Fallback if no emotion data is available for this specific emotion
                prompt = f"""
                You are an experienced mindfulness guide.
                Write two balanced sentences. First acknowledges {emotion} with common body sensations, second sentence offers a neutral perspective on {emotion}.
                Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
                Do not use any formatting, e.g. bold, italic in your response."""
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        
        response = requests.post(url, json=payload)
        data = response.json()
        reply = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "(No response)")
        
        return {"response": reply}
    except Exception as e:
        return {"error": str(e)}, 500

@app.route("/api/mindfulness/line-b", methods=["POST"])
def generate_line_b():
    try:
        emotion = request.json.get("emotion", "")
        sensation = request.json.get("sensation", "")
        thoughts = request.json.get("thoughts", [])
        impulses = request.json.get("impulses", [])
        body_sensations = request.json.get("bodySensations", [])
        needs = request.json.get("needs", [])
        conversation_mode = request.json.get("conversationMode", True)  # True = had conversation, False = skipped
        
        if not emotion:
            return {"error": "Emotion missing"}, 400
        
        # Use the actual conversation data to create a more personalized question
        primary_sensation = body_sensations[0] if body_sensations else (sensation or "tension in the body")
        primary_thought = thoughts[0] if thoughts else "racing thoughts"
        primary_impulse = impulses[0] if impulses else "wanting to escape"
        primary_need = needs[0] if needs else "connection"
        
        # Two different prompt versions based on conversation mode
        if conversation_mode:
            # Version 1: User had the full HCB conversation - personalized with their specific data
            prompt = f"""
            You are an experienced mindfulness guide.
            Create two balanced sentences. Mention both {primary_thought} or {primary_impulse}, and {primary_need}, change personal pronoun from first to second, if applicable.. End with a forward-looking clause (“…as you step back to your day”).
            Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
            Do not use any formatting, e.g. bold, italic in your response."""
        else:
            # Version 2: User skipped the conversation - more general check-in
            prompt = f"""
            You are an experienced mindfulness guide.
            Create two balanced sentences. First sentence checks whether the {emotion} has shifted, second sentence invites one grounding breath.
            Style: gentle, natural, inviting, second-person, more general and welcoming. Never diagnose, fix, or judge. Use plain, vivid language—no clinical jargon.
            Do not use any formatting, e.g. bold, italic in your response."""
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        
        response = requests.post(url, json=payload)
        data = response.json()
        reply = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "(No response)")
        
        return {"response": reply}
    except Exception as e:
        return {"error": str(e)}, 500

@app.route("/api/mindfulness/consolidate-audio", methods=["POST"])
def consolidate_audio():
    try:
        # Get the meditation components
        fixed_intro = request.json.get("fixedIntro", "")
        line_a_text = request.json.get("lineA", "")
        fixed_middle = request.json.get("fixedMiddle", "")
        line_b_text = request.json.get("lineB", "")
        fixed_outro = request.json.get("fixedOutro", "")
        
        # Combine all text segments
        full_meditation_script = f"{fixed_intro} {line_a_text} {fixed_middle} {line_b_text} {fixed_outro}"
        
        # Choose TTS provider: 'elevenlabs' or 'google'
        tts_provider = "elevenlabs"  # Use ElevenLabs for meditation audio
        
        if tts_provider == "google":
            # Google TTS (Free)
            from gtts import gTTS
            import io
            
            # Create gTTS object
            tts = gTTS(text=full_meditation_script, lang='en', slow=False)
            
            # Save to BytesIO buffer
            audio_buffer = io.BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            
            # Encode as base64
            audio_base64 = base64.b64encode(audio_buffer.read()).decode("utf-8")
            
        else:
            # ElevenLabs TTS (Premium)
            # Get voice selection from request
            selected_voice = request.json.get('voice', 'male')  # Default to male if not specified
            
            if selected_voice == 'female':
                voice_id = "ROMJ9yK1NAMuu1ggrjDW"  # female final
            else:
                voice_id = "yZggGmu2XJkoy1aHe3fg"  # male final
                
            eleven_payload = {
                "text": full_meditation_script,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "speed": 0.8
                }
            }
            response = requests.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
                headers={
                    "xi-api-key": f"{ELEVENLABS_API_KEY}",
                    "Content-Type": "application/json"
                },
                json=eleven_payload,
            )
            if response.status_code != 200:
                return {"error": f"ElevenLabs API error: {response.text}"}, 500

            audio_content = response.content  # This is binary MP3 data
            # Encode the audio content as base64 for your frontend
            audio_base64 = base64.b64encode(audio_content).decode("utf-8")
            return jsonify({"audioContent": audio_base64})
    except Exception as e:
        return {"error": str(e)}, 500
    
# Create a new endpoint for conversation
@app.route("/api/mindfulness/chat", methods=["POST"])
def mbct_chat():
    try:
        chat_id = request.json.get("chatId", None)
        message = request.json.get("message", "")
        if not message:
            return {"error": "No message provided"}, 400
        if not chat_id or chat_id not in conversation_store:
            return {"error": "Invalid chat ID"}, 400

        # Add user message to conversation history in Gemini format
        conversation_store[chat_id].append({"role": "user", "parts": [{"text": message}]})

        # Convert to OpenAI format for InsForge AI
        openai_messages = gemini_to_openai_messages(conversation_store[chat_id])
        # Use system role for the first message (system prompt)
        if len(openai_messages) > 0 and openai_messages[0]["role"] == "user":
            openai_messages[0]["role"] = "system"

        # Call InsForge AI with gpt-4o
        data = call_insforge_ai(openai_messages, model="openai/gpt-4o")

        if not data:
            return {"error": "InsForge AI did not return valid response"}, 500

        # Extract response from OpenAI format
        reply = data.get("choices", [{}])[0].get("message", {}).get("content", "(No response)")

        # Store response in Gemini format for backward compatibility
        conversation_store[chat_id].append({"role": "model", "parts": [{"text": reply}]})

        return {"response": reply, "chatId": chat_id, "type": "text", "ai_raw": data}
    except Exception as e:
        print(f"[Error] mbct_chat: {str(e)}")
        return {"error": str(e)}, 500

# NEW ENDPOINT: General chat for direct conversations
@app.route("/api/mindfulness/general-chat", methods=["POST"])
def general_chat():
    try:
        # Get message and history
        message = request.json.get("message", "")
        history = request.json.get("history", [])

        if not message:
            return {"error": "No message provided"}, 400

        # Prepare the conversation with existing history + new message
        contents = history.copy()
        if not any(msg.get("role") == "user" and msg.get("parts", [{}])[0].get("text") == message for msg in contents):
            contents.append({"role": "user", "parts": [{"text": message}]})

        # Convert to OpenAI format for InsForge AI
        openai_messages = gemini_to_openai_messages(contents)

        # Call InsForge AI with gpt-4o
        data = call_insforge_ai(openai_messages, model="openai/gpt-4o")

        if not data:
            return {"error": "InsForge AI did not return valid response"}, 500

        # Extract reply from OpenAI format
        reply = data.get("choices", [{}])[0].get("message", {}).get("content", "(No response)")

        # Update history with user message and response in Gemini format
        updated_history = history.copy()
        updated_history.append({"role": "user", "parts": [{"text": message}]})
        updated_history.append({"role": "model", "parts": [{"text": reply}]})

        # Limit history length
        if len(updated_history) > 10:
            updated_history = updated_history[-10:]

        return {
            "response": reply,
            "history": updated_history,
            "type": "text"  # Plain text conversation, no TTS
        }
    except Exception as e:
        print(f"[Error] general_chat: {str(e)}")
        return {"error": str(e)}, 500

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/js/<path:path>')
def serve_js(path):
    return send_from_directory('js', path)

@app.route('/css/<path:path>')
def serve_css(path):
    return send_from_directory('css', path)

@app.route('/data/<path:path>')
def serve_data(path):
    return send_from_directory('data', path)

#if __name__ == "__main__":
#    app.run(port=5150, debug=True)
    
if __name__ == "__main__":
    print("🚀 Starting Flask server...")
    print("🔧 Available endpoints:")
    print("  - POST /api/tts")
    print("  - POST /api/generate") 
    print("  - POST /api/mindfulness/*")
    
    port = int(os.environ.get("PORT", 5150))
    print(f"🌐 Server will run on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)