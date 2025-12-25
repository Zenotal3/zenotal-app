document.addEventListener('DOMContentLoaded', () => {
    
    // Check server connectivity on page load
    checkServerConnectivity();
    
    const speakBtn = document.getElementById('speakBtn');
    const userInput = document.getElementById('messageInput');
    const chatWindow = document.getElementById('chatMessages');
    const sendBtn = document.getElementById('sendButton');
    
    if (!userInput) {
        console.error('messageInput element not found!');
        return;
    }
    
    if (!chatWindow) {
        console.error('chatMessages element not found!');
        return;
    }
    
    if (!sendBtn) {
        console.error('sendButton element not found!');
        return;
    }

    let conversationHistory = [];
    let speechHandler = null;
    let selectedCharacterName = localStorage.getItem('selectedCharacterName') || 'Zenotal'; // Get character name globally

    // Change initial state to normal-chat since we get data from emotion wheel
    let currentState = 'normal-chat';
    let stressLevel = 0; // Add this to track stress level
    let userEmotion = '';
    let bodySensations = [];
    let userThoughts = [];
    let userImpulses = [];
    let userNeed = []; // Add missing userNeed variable
    let hotCrossBunChatId = null;
    let hcbStep = 0;
    let hcbExchangeCount = 0; // Track number of exchanges

    // Initialize app with data from emotion wheel
    async function initializeWithEmotionData() {
        // Get emotion and stress level from localStorage
        const savedEmotion = localStorage.getItem('userEmotion');
        const savedStressLevel = localStorage.getItem('userStressScale') || localStorage.getItem('stressLevel'); // Use new scale, fallback to old
        const conversationChoice = localStorage.getItem('conversationChoice');
        
        // Get selected character name for conversation display
        const selectedCharacterName = localStorage.getItem('selectedCharacterName') || 'Zenotal';

        if (savedEmotion) {
            userEmotion = savedEmotion;
        }

        if (savedStressLevel) {
            stressLevel = parseInt(savedStressLevel);
        }

        // Check if user came from conversation page
        if (conversationChoice) {
            if (conversationChoice === 'yes') {
                startHotCrossBunConversation();
                return;
            } else if (conversationChoice === 'skip') {
                if (!userEmotion) {
                    addMessageToChat('ai', 'Sorry, there was an error loading your emotion data. Please try again.');
                    return;
                }
                try {
                    // Store that conversation was skipped
                    localStorage.setItem('conversationMode', 'false');
                    await inferBodySensations();
                    await generateAndStoreLineAB();
                    window.location.href = 'audio.html';
                } catch (error) {
                    addMessageToChat('ai', 'Sorry, there was an error starting the meditation. Please try again.');
                }
                return;
            }
        }

        // If we have both emotion and stress level, proceed with the app flow
        if (userEmotion && stressLevel > 0) {
            offerHotCrossBun();
        } else {
            initStressLevelInput();
        }
    }
    
    // Make initialization function available globally
    window.initializeApp = initializeWithEmotionData;

    // Initialize speech recognition
    function initSpeechRecognition() {
        if (!speakBtn) {
            console.log('Speech button not found, skipping speech recognition setup');
            return;
        }
        
        speechHandler = new SpeechHandler(
            // onResult
            (msg) => {
                userInput.value = msg;
                if (currentState === 'hot-cross-bun') {
                    handleHotCrossBunStep(msg);
                } else {
                    sendMessageToGemini(msg);
                }
            },
            // onError
            (error) => {
                alert("Speech error: " + (error.error || error.message || "Unknown error"));
                speakBtn.textContent = "🔊";
                speakBtn.disabled = false;
                speakBtn.classList.remove('active');
            },
            // onEnd
            () => {
                speakBtn.textContent = "🔊";
                speakBtn.disabled = false;
                speakBtn.classList.remove('active');
            }
        );
    }

    // Speech button click handler
    if (speakBtn) {
        speakBtn.onclick = async () => {
            console.log("🎤 Speak button clicked");

            if (!speechHandler) {
                initSpeechRecognition();
            }

            const started = await speechHandler.start();
            
            if (started) {
                // Provide visual feedback
                speakBtn.textContent = "🎙️";
                speakBtn.disabled = true;
                speakBtn.classList.add('active');
            } else {
                alert("Please allow microphone access to use voice input.");
            }
        };
    }

    // Send button click handler
    sendBtn.onclick = () => {
        const userInputValue = userInput.value.trim();
        if (userInputValue) {
            if (currentState === 'hot-cross-bun') {
                handleHotCrossBunStep(userInputValue);
            } else {
                sendMessageToGemini(userInputValue);
            }
            userInput.value = '';
            // Keep focus on input field for continuous conversation
            userInput.focus();
            // Reset send button state
            sendBtn.disabled = true;
            sendBtn.style.backgroundColor = '#ccc';
            sendBtn.style.cursor = 'not-allowed';
        }
    };

    // Enter key handler
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const userInputValue = e.target.value.trim();
            if (userInputValue) {
                if (currentState === 'hot-cross-bun') {
                    handleHotCrossBunStep(userInputValue);
                } else {
                    sendMessageToGemini(userInputValue);
                }
                e.target.value = '';
                // Keep focus on input field for continuous conversation
                e.target.focus();
                // Reset send button state
                if (sendBtn) {
                    sendBtn.disabled = true;
                    sendBtn.style.backgroundColor = '#ccc';
                    sendBtn.style.cursor = 'not-allowed';
                }
            }
        }
    });

    // Handle input changes for send button styling
    if (userInput) {
        userInput.addEventListener('input', function() {
            const hasContent = this.value.trim().length > 0;
            if (sendBtn) {
                sendBtn.disabled = !hasContent;
                
                if (hasContent) {
                    sendBtn.style.backgroundColor = '#000';
                    sendBtn.style.cursor = 'pointer';
                } else {
                    sendBtn.style.backgroundColor = '#ccc';
                    sendBtn.style.cursor = 'not-allowed';
                }
            }
        });
    }

    // Initialize send button state
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.style.backgroundColor = '#ccc';
        sendBtn.style.cursor = 'not-allowed';
    }

    // Add message to chat window
    function addMessageToChat(sender, message) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        if (sender === 'user') {
            messageDiv.classList.add('user-message');
            messageDiv.textContent = message;
        } else if (sender === 'ai') {
            messageDiv.classList.add('ai-message');
            
            // Create character name header with your specific styling
            const characterHeader = document.createElement('div');
            characterHeader.classList.add('character-name-header');
            characterHeader.textContent = selectedCharacterName;
            
            // Apply your specific styling
            characterHeader.style.width = '92px';
            characterHeader.style.height = '30px';
            characterHeader.style.fontFamily = 'Outfit';
            characterHeader.style.fontStyle = 'normal';
            characterHeader.style.fontWeight = '700';
            characterHeader.style.fontSize = '24px';
            characterHeader.style.lineHeight = '30px';
            characterHeader.style.color = '#000000';
            characterHeader.style.marginBottom = '10px';
            characterHeader.style.display = 'block';
            
            // Create message content
            const messageContent = document.createElement('div');
            messageContent.classList.add('message-content');
            messageContent.textContent = message;
            messageContent.style.display = 'block';
            
            // Ensure the main message div displays as block with vertical layout
            messageDiv.style.display = 'flex';
            messageDiv.style.flexDirection = 'column';
            
            // Append both to the message div
            messageDiv.appendChild(characterHeader);
            messageDiv.appendChild(messageContent);
        } else if (sender === 'system') {
            messageDiv.classList.add('system-message');
            messageDiv.textContent = message;
            messageDiv.style.color = '#8D8D8D';
            messageDiv.style.fontStyle = 'italic';
        }

        chatWindow.appendChild(messageDiv);

        // Scroll to the bottom of the chat window
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // Remove system message
    function removeSystemMessage() {
        const systemMessages = chatWindow.querySelectorAll('.message.system');
        if (systemMessages.length > 0) {
            systemMessages[systemMessages.length - 1].remove();
        }
    }

    // Disable input controls
    function disableInput() {
        if (userInput) {
            userInput.disabled = true;
            userInput.placeholder = "Waiting for response...";
        }
        if (speakBtn) {
            speakBtn.disabled = true;
        }
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.style.backgroundColor = '#ccc';
            sendBtn.style.cursor = 'not-allowed';
        }
    }

    // Enable input controls
    function enableInput() {
        if (userInput) {
            userInput.disabled = false;
            userInput.placeholder = "Text message";
            // Automatically focus the input field so user can type immediately
            setTimeout(() => userInput.focus(), 100);
        }
        if (speakBtn) {
            speakBtn.disabled = false;
        }
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.style.backgroundColor = '#000';
            sendBtn.style.cursor = 'pointer';
        }
    }

    // Send message to Gemini
    async function sendMessageToGemini(msg) {
        // Stop any currently playing TTS audio before processing new message
        if (typeof stopCurrentTTS === 'function') {
            stopCurrentTTS();
        }

        addMessageToChat('user', msg);
        addMessageToChat('system', "Waiting for response...");
        disableInput();

        try {
            const reply = await callGemini(msg, conversationHistory);
            // Update conversation history with user message and response
            conversationHistory.push({
                role: "user",
                parts: [{ text: msg }]
            });
            conversationHistory.push({
                role: "model", 
                parts: [{ text: reply }]
            });
            // Limit history length
            if (conversationHistory.length > 10) {
                conversationHistory = conversationHistory.slice(-10);
            }
            removeSystemMessage();
            // Sanitize the response (remove emojis if needed)
            const sanitizedReply = reply.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
            addMessageToChat('ai', sanitizedReply);
        } catch (error) {
            removeSystemMessage();
            addMessageToChat('ai', "Error: Could not get a response.");
        } finally {
            enableInput();
        }
    }

    // Parse summary data from AI response
    function parseSummaryFromResponse(responseText) {
        console.log('🔍 PARSING SUMMARY - Full Response Text:', responseText);
        console.log('🔍 Response length:', responseText.length);
        
        try {
            const result = {
                bodySensations: [],
                thoughts: [],
                impulses: [],
                need: []
            };

            // Check for hidden data section first
            const dataMatch = responseText.match(/---DATA---(.*?)---END_DATA---/s);
            console.log('🔍 DATA SECTION MATCH:', dataMatch ? 'FOUND' : 'NOT FOUND');
            
            if (dataMatch) {
                const dataSection = dataMatch[1];
                console.log('🔍 EXTRACTED DATA SECTION:', dataSection);
                
                // Parse structured data from hidden section
                const patterns = {
                    body: /BODY_SENSATIONS:\s*\[(.*?)\]/i,
                    thoughts: /THOUGHTS:\s*\[(.*?)\]/i,
                    impulses: /IMPULSES:\s*\[(.*?)\]/i,
                    need: /NEED:\s*\[(.*?)\]/i
                };

                Object.keys(patterns).forEach(aspect => {
                    const match = dataSection.match(patterns[aspect]);
                    console.log(`🔍 ${aspect.toUpperCase()} pattern match:`, match ? match[1] : 'NO MATCH');
                    
                    if (match && match[1]) {
                        const items = match[1]
                            .split(',')
                            .map(item => item.trim().replace(/['"]/g, ''))
                            .filter(item => item.length > 0 && !item.toLowerCase().includes('unsure') && !item.toLowerCase().includes("don't know"));
                        
                        console.log(`🔍 ${aspect.toUpperCase()} parsed items:`, items);
                        
                        if (items.length > 0) {
                            if (aspect === 'body') result.bodySensations = items;
                            else if (aspect === 'thoughts') result.thoughts = items;
                            else if (aspect === 'impulses') result.impulses = items;
                            else if (aspect === 'need') result.need = items;
                        }
                    }
                });
            } else {
                console.log('🔍 FALLBACK: Using old pattern matching');
                // Fallback: Enhanced patterns to catch more summary formats if no hidden section found
                const patterns = {
                    body: [
                        /BODY_SENSATIONS?:\s*\[(.*?)\]/i,
                        /body\s*sensations?[:\-]\s*\[(.*?)\]/i,
                        /physical\s*sensations?[:\-]\s*\[(.*?)\]/i,
                        /body[:\-]\s*([^,\n]*(?:,\s*[^,\n]*)*)/i
                    ],
                    thoughts: [
                        /THOUGHTS?:\s*\[(.*?)\]/i,
                        /thinking[:\-]\s*\[(.*?)\]/i,
                        /thoughts?[:\-]\s*([^,\n]*(?:,\s*[^,\n]*)*)/i
                    ],
                    impulses: [
                        /IMPULSES?:\s*\[(.*?)\]/i,
                        /impulse[:\-]\s*\[(.*?)\]/i,
                        /urges?[:\-]\s*([^,\n]*(?:,\s*[^,\n]*)*)/i
                    ],
                    need: [
                        /NEEDS?:\s*\[(.*?)\]/i,
                        /need[:\-]\s*\[(.*?)\]/i,
                        /what\s*(?:you|they)\s*need[:\-]\s*([^,\n]*(?:,\s*[^,\n]*)*)/i
                    ]
                };

                // Try each pattern for each aspect
                Object.keys(patterns).forEach(aspect => {
                    for (const pattern of patterns[aspect]) {
                        const match = responseText.match(pattern);
                        if (match && match[1]) {
                            const items = match[1]
                                .split(',')
                                .map(item => item.trim().replace(/['"]/g, ''))
                                .filter(item => item.length > 0 && !item.toLowerCase().includes('unsure') && !item.toLowerCase().includes("don't know"));
                            
                            if (items.length > 0) {
                                if (aspect === 'body') result.bodySensations = items;
                                else if (aspect === 'thoughts') result.thoughts = items;
                                else if (aspect === 'impulses') result.impulses = items;
                                else if (aspect === 'need') result.need = items;
                                break; // Found a match, stop trying patterns for this aspect
                            }
                        }
                    }
                });
            }

            console.log('✅ FINAL PARSED RESULT:', result);
            console.log('🎯 STORING IN LOCALSTORAGE...');
            
            // Store immediately for verification
            if (result.bodySensations.length > 0) localStorage.setItem('bodySensations', JSON.stringify(result.bodySensations));
            if (result.thoughts.length > 0) localStorage.setItem('userThoughts', JSON.stringify(result.thoughts));
            if (result.impulses.length > 0) localStorage.setItem('userImpulses', JSON.stringify(result.impulses));
            if (result.need.length > 0) localStorage.setItem('userNeed', JSON.stringify(result.need));
            
            return result;
        } catch (error) {
            console.error('❌ ERROR PARSING SUMMARY:', error);
            return null;
        }
    }

    // Clean response text by removing hidden data section
    function cleanResponseForDisplay(responseText) {
        // Remove the hidden data section from display
        return responseText.replace(/---DATA---.*?---END_DATA---/s, '').trim();
    }

    // TEST FUNCTION - Call this from console to test parsing
    window.testSummaryParsing = function(testResponse) {
        if (!testResponse) {
            testResponse = `It sounds like you're really noticing how stress shows up in your body and mind. You mentioned feeling that tension in your shoulders, those racing thoughts about work, and that urge to just escape it all. What you really need right now is some space to breathe and reset.

---DATA---
BODY_SENSATIONS: [shoulder tension, tight chest, shallow breathing]
THOUGHTS: [work deadline worries, racing mind, feeling overwhelmed]  
IMPULSES: [want to escape, avoid responsibilities, hide away]
NEED: [space to breathe, moment of calm, reset and recharge]
---END_DATA---

Now let's move into a guided meditation practice.`;
        }
        
        console.log('🧪 TESTING SUMMARY PARSING WITH SAMPLE DATA');
        console.log('📝 Test response:', testResponse);
        
        const parsed = parseSummaryFromResponse(testResponse);
        const cleaned = cleanResponseForDisplay(testResponse);
        
        console.log('🎯 PARSED RESULT:', parsed);
        console.log('👁️ CLEANED FOR DISPLAY:', cleaned);
        
        return { parsed, cleaned };
    };

    // Start hot-cross-bun conversation
    function startHotCrossBunConversation() {
        currentState = 'hot-cross-bun';
        // Clear chat and show initial message
        chatWindow.innerHTML = '';
        addMessageToChat('system', 'Starting guided conversation...');
        hotCrossBunChatId = null; // Reset for new session
        hcbStep = 0;
        hcbExchangeCount = 0; // Reset exchange counter
        bodySensations = [];
        userThoughts = [];
        userImpulses = [];
        // Call the new endpoint to start the conversation
        startHotCrossBun(userEmotion)
        .then(data => {
            removeSystemMessage();
            if (data.response) {
                addMessageToChat('ai', data.response);
                hotCrossBunChatId = data.chatId; // Save chatId for next turn
                // Enable input for user to continue conversation
                enableInput();
                // Clear input field
                if (userInput) {
                    userInput.value = '';
                }
            } else if (data.error) {
                addMessageToChat('ai', `Error: ${data.error}`);
                enableInput();
            } else {
                addMessageToChat('ai', 'Sorry, received an unexpected response from the service.');
                enableInput();
            }
        })
        .catch(error => {
            removeSystemMessage();
            // Provide a fallback conversation starter
            const fallbackMessage = `I understand you're feeling ${userEmotion}. Let's work through this together. Can you tell me what physical sensations you're noticing in your body right now?`;
            addMessageToChat('ai', fallbackMessage);
            // Enable input for user to continue conversation even without API
            enableInput();
            // Clear input field
            if (userInput) {
                userInput.value = '';
            }
        });
    }

    // Send message to hot-cross-bun API and extract aspect after each answer
    async function sendHotCrossBunMessageToAPI(message, isSystem = false, isUncertain = false) {
        console.log('Sending message to Hot Cross Bun API:', { message, chatId: hotCrossBunChatId, hcbStep, isUncertain });
        // Stop any currently playing TTS audio before processing new message
        if (typeof stopCurrentTTS === 'function') {
            stopCurrentTTS();
        }
        if (!isSystem) addMessageToChat('user', message);
        addMessageToChat('system', "Waiting for response...");
        disableInput();
        try {
            const data = await sendHotCrossBunMessage(message, hotCrossBunChatId);
            console.log('Hot Cross Bun API response:', data);
            removeSystemMessage();
            if (data.response) {
                // Parse data first, then display cleaned version
                const summaryData = parseSummaryFromResponse(data.response);
                const cleanResponse = cleanResponseForDisplay(data.response);
                
                addMessageToChat('ai', cleanResponse);
                hotCrossBunChatId = data.chatId; // Save chatId for next turn
                
                // Only extract data from final summary when AI concludes
                if (!isUncertain) {
                    hcbStep++;
                    console.log(`[DEBUG] Step advanced to ${hcbStep} after meaningful response`);
                } else {
                    console.log(`[DEBUG] Step ${hcbStep} maintained due to uncertain response - encouraging more detail`);
                }
                // Check if AI indicates completion and wants to move to meditation
                if (data.response.toLowerCase().includes('guided meditation practice') || 
                    data.response.toLowerCase().includes('move into meditation') ||
                    data.response.toLowerCase().includes('meditation session')) {
                    
                    // Try to extract final summary from AI response
                    console.log('[DEBUG] Attempting to parse final summary from AI response');
                    if (summaryData) {
                        console.log('[DEBUG] Successfully parsed summary from AI response:', summaryData);
                        // Update with parsed summary data
                        if (summaryData.bodySensations && summaryData.bodySensations.length > 0) {
                            bodySensations = summaryData.bodySensations;
                            localStorage.setItem('bodySensations', JSON.stringify(summaryData.bodySensations));
                        }
                        if (summaryData.thoughts && summaryData.thoughts.length > 0) {
                            userThoughts = summaryData.thoughts;
                            localStorage.setItem('userThoughts', JSON.stringify(summaryData.thoughts));
                        }
                        if (summaryData.impulses && summaryData.impulses.length > 0) {
                            userImpulses = summaryData.impulses;
                            localStorage.setItem('userImpulses', JSON.stringify(summaryData.impulses));
                        }
                        if (summaryData.need && summaryData.need.length > 0) {
                            userNeed = summaryData.need;
                            localStorage.setItem('userNeed', JSON.stringify(summaryData.need));
                        }
                    }
                    
                    setTimeout(() => {
                        addMessageToChat('system', 'Generating your personalized meditation guidance...');
                        // Store that HCB was completed through conversation
                        localStorage.setItem('conversationCompleted', 'true');
                        localStorage.setItem('conversationMode', 'true');
                        setTimeout(async () => {
                            try {
                                // Generate Line A and B in background, then go to audio page
                                await generateAndStoreLineAB();
                                window.location.href = 'audio.html';
                            } catch (error) {
                                console.error('Error generating Line A/B:', error);
                                addMessageToChat('ai', 'Sorry, there was an error generating your meditation. Please try again.');
                            }
                        }, 2000);
                    }, 2000);
                    return;
                }
                hcbExchangeCount++;
                if (hcbExchangeCount >= 8 && !data.response.toLowerCase().includes('guided meditation')) {
                    setTimeout(() => {
                        const buttonDiv = document.createElement('div');
                        buttonDiv.className = 'choice-buttons';
                        buttonDiv.innerHTML = `
                            <button id="continueConversation">Continue Talking</button>
                            <button id="startMeditation">Start Meditation</button>
                        `;
                        chatWindow.appendChild(buttonDiv);
                        document.getElementById('continueConversation').addEventListener('click', () => {
                            buttonDiv.remove();
                            enableInput();
                        });
                        document.getElementById('startMeditation').addEventListener('click', () => {
                            localStorage.setItem('hcbCompleted', 'true');
                            window.location.href = 'audio.html';
                        });
                    }, 2000);
                    return;
                }
                enableInput();
            } else if (data.error) {
                console.error('Hot Cross Bun API error:', data.error);
                addMessageToChat('ai', `Error: ${data.error}`);
                enableInput();
            } else {
                console.error('Unexpected API response:', data);
                addMessageToChat('ai', 'Sorry, received an unexpected response from the service.');
                enableInput();
            }
        } catch (error) {
            console.error('Hot Cross Bun API error:', error);
            removeSystemMessage();
            addMessageToChat('ai', 'Sorry, received an unexpected response from the service.');
            enableInput();
        }
    }

    // Check if user response indicates uncertainty
    function isUncertainResponse(message) {
        const uncertainPhrases = [
            'unsure', 'not sure', "don't know", "dont know", "i don't know",
            "i dont know", "not really", "maybe", "i guess", "i think maybe",
            "i'm not sure", "im not sure", "not certain", "unclear", 
            "can't tell", "cant tell", "hard to say", "difficult to say",
            "i'm not really sure", "im not really sure", "not exactly",
            "kind of", "sort of", "i suppose", "possibly", "perhaps",
            "i'm uncertain", "im uncertain", "no idea", "dunno",
            "i have no idea", "i really don't know", "i really dont know"
        ];
        
        const lowerMessage = message.toLowerCase().trim();
        
        // Check for exact matches and partial matches
        return uncertainPhrases.some(phrase => 
            lowerMessage === phrase || 
            lowerMessage.includes(phrase) ||
            // Very short responses that are likely non-committal
            (lowerMessage.length <= 10 && (lowerMessage.includes('no') || lowerMessage.includes('yes') || lowerMessage === 'ok' || lowerMessage === 'okay'))
        );
    }

    // Handle hot-cross-bun step with validation
    function handleHotCrossBunStep(userInputValue) {
        console.log(`Hot Cross Bun Step ${hcbStep}: ${userInputValue}`);
        
        // Check if this is an uncertain response
        if (isUncertainResponse(userInputValue)) {
            console.log('[DEBUG] Detected uncertain response, not advancing step');
            sendHotCrossBunMessageToAPI(userInputValue, false, true); // Pass uncertainty flag
            return;
        }
        
        sendHotCrossBunMessageToAPI(userInputValue);
    }
    // Extract aspect after each HCB step
    async function extractAspectAfterStep(step, userMessage) {
        // Map step to aspect
        const stepAspectMap = ["body", "thoughts", "impulses", "need"];
        if (step < 0 || step >= stepAspectMap.length) {
            console.log(`[DEBUG] Step ${step} is out of range for aspect extraction`);
            return;
        }
        const aspect = stepAspectMap[step];
        if (!hotCrossBunChatId) {
            console.log(`[DEBUG] No chatId available for extraction`);
            return;
        }
        
        console.log(`[DEBUG] Extracting ${aspect} for step ${step} from message: "${userMessage}"`);
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/mindfulness/extract-aspect`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatId: hotCrossBunChatId, aspect })
            });
            
            if (!res.ok) {
                if (res.status === 405) {
                    console.error('[ERROR] 405 Method Not Allowed - Check if Flask server is running on port 5150');
                    addMessage('assistant', 'Server Error: Please start the Flask server by running "python proxy.py" in the project directory, then refresh this page.');
                    return;
                }
                throw new Error(`API responded with status ${res.status}`);
            }
            const data = await res.json();
            console.log(`[DEBUG] Extraction API response for ${aspect}:`, data);
            
            if (data && Array.isArray(data.values)) {
                if (aspect === "body") {
                    bodySensations = data.values;
                    localStorage.setItem('bodySensations', JSON.stringify(data.values));
                    console.log(`[DEBUG] Updated bodySensations:`, bodySensations);
                }
                if (aspect === "thoughts") {
                    userThoughts = data.values;
                    localStorage.setItem('userThoughts', JSON.stringify(data.values));
                    console.log(`[DEBUG] Updated userThoughts:`, userThoughts);
                }
                if (aspect === "impulses") {
                    userImpulses = data.values;
                    localStorage.setItem('userImpulses', JSON.stringify(data.values));
                    console.log(`[DEBUG] Updated userImpulses:`, userImpulses);
                }
                if (aspect === "need") {
                    userNeed = data.values;
                    localStorage.setItem('userNeed', JSON.stringify(data.values));
                    console.log(`[DEBUG] Updated userNeed:`, userNeed);
                }
                console.log(`[DEBUG] Final extracted values for ${aspect}:`, data.values);
            } else {
                console.warn(`[DEBUG] No valid values found for ${aspect}:`, data);
            }
        } catch (err) {
            console.error(`[DEBUG] Error extracting ${aspect}:`, err);
            
            // Check for network/connection errors
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                console.error('[ERROR] Network error - Flask server may not be running');
                addMessage('assistant', 'Connection Error: Unable to reach server. Please start the Flask server by running "python proxy.py" in the mindreset-web directory, then refresh this page.');
            } else if (err.message.includes('405')) {
                console.error('[ERROR] 405 Method Not Allowed - Server running but endpoint not configured');
                addMessage('assistant', 'Server Error: API endpoint not accessible. Please check server configuration.');
            } else {
                console.error('[ERROR] General API error:', err.message);
                addMessage('assistant', `API Error: ${err.message}. Please check the server status and try again.`);
            }
        }
    }

    // Generate Line A and B and store them for audio page
    async function generateAndStoreLineAB() {
        const sensation = bodySensations[0] || 'tension in the body';
        const conversationMode = localStorage.getItem('conversationMode') === 'true';
        
        console.log('🎯 GENERATING LINE A/B - INPUT DATA:');
        console.log('  - emotion:', userEmotion);
        console.log('  - sensation:', sensation);
        console.log('  - bodySensations array:', bodySensations);
        console.log('  - userThoughts array:', userThoughts);
        console.log('  - userImpulses array:', userImpulses);
        console.log('  - userNeed array:', userNeed);
        console.log('  - conversationMode:', conversationMode);

        // Verify localStorage has the data
        console.log('🔍 LOCALSTORAGE VERIFICATION:');
        console.log('  - bodySensations:', localStorage.getItem('bodySensations'));
        console.log('  - userThoughts:', localStorage.getItem('userThoughts'));
        console.log('  - userImpulses:', localStorage.getItem('userImpulses'));
        console.log('  - userNeed:', localStorage.getItem('userNeed'));

        try {
            console.log('🚀 CALLING Line A API...');
            const lineAData = await generateLineA(userEmotion, sensation, bodySensations, userThoughts, userImpulses, userNeed, conversationMode);
            const lineA = lineAData.response || 'Take a moment to notice your breath and body.';
            console.log('✅ Line A generated:', lineA);
            
            console.log('🚀 CALLING Line B API...');
            const lineBData = await generateLineB(userEmotion, sensation, userThoughts, userImpulses, bodySensations, userNeed, conversationMode);
            const lineB = lineBData.response || 'How are you feeling now?';
            console.log('✅ Line B generated:', lineB);
            
            // Store for audio page
            localStorage.setItem('lineA', lineA);
            localStorage.setItem('lineB', lineB);
            localStorage.setItem('hcbCompleted', 'true');
            
            console.log('💾 STORED IN LOCALSTORAGE:');
            console.log('  - lineA:', localStorage.getItem('lineA'));
            console.log('  - lineB:', localStorage.getItem('lineB'));
            console.log('  - hcbCompleted:', localStorage.getItem('hcbCompleted'));
            
        } catch (error) {
            console.error('❌ ERROR in generateAndStoreLineAB:', error);
            throw error;
        }
    }

    // Get body sensations from json file
    async function inferBodySensations() {
        try {
            // Load the emotion-body map from the JSON file
            const response = await fetch('data/emotion-body-map.json');
            const emotionBodyMap = await response.json();
            
            // Normalize the emotion by converting to lowercase
            const normalizedEmotion = userEmotion.toLowerCase();
            
            // Try to find matching sensations or use default
            if (emotionBodyMap[normalizedEmotion]) {
                bodySensations = emotionBodyMap[normalizedEmotion];
                console.log(`Found body sensations for ${normalizedEmotion}:`, bodySensations);
            } else {
                console.log(`No mapping found for ${normalizedEmotion}, using default sensations`);
                bodySensations = ['tension in the body', 'change in breathing'];
            }

            // Pick a random sensation from the array
            const randomIndex = Math.floor(Math.random() * bodySensations.length);
            bodySensations = [bodySensations[randomIndex]];
            
            // Don't automatically call processLineA() - let the caller decide what to do next
            console.log('Body sensations inferred:', bodySensations);
        } catch (error) {
            console.error("Error loading emotion-body map:", error);
            bodySensations = ['tension in the body', 'change in breathing'];
        }
    }

    async function processLineA() {
        currentState = 'line-a';
        
        const sensation = bodySensations[0] || 'bodily sensation';
        
        chatWindow.innerHTML = '';
        addMessageToChat('system', 'Generating mindfulness guidance...');
        
        try {
            console.log('Calling generateLineA with:', { userEmotion, sensation, bodySensations, userThoughts, userImpulses, userNeed });
            // Check if user had conversation or skipped
            const conversationMode = localStorage.getItem('conversationMode') === 'true';
            const data = await generateLineA(userEmotion, sensation, bodySensations, userThoughts, userImpulses, userNeed, conversationMode);
            console.log('Line A API response:', data);
            removeSystemMessage();
            
            if (data.response) {
                addMessageToChat('ai', data.response);
                
                // Line A is always part of meditation session - TTS enabled
                await speakResponse(data.response);
                
                // Store Line A for audio consolidation
                localStorage.setItem('lineA', data.response);
            } else if (data.error) {
                addMessageToChat('ai', `Error: ${data.error}`);
            } else {
                addMessageToChat('ai', 'Received unexpected response from server.');
            }
            
            // Wait a moment before offering line B
            setTimeout(() => {
                processLineB();
            }, 5000);
        } catch (error) {
            console.error('Error in processLineA:', error);
            removeSystemMessage();
            addMessageToChat('ai', 'Sorry, there was an error generating mindfulness guidance. Please make sure the backend server is running.');
        }
    }

    // Generate Line B
    async function processLineB() {
        currentState = 'line-b';
        
        const sensation = bodySensations[0] || 'bodily sensation';
        
        addMessageToChat('system', 'Generating follow-up...');
        
        try {
            // Check if user had conversation or skipped
            const conversationMode = localStorage.getItem('conversationMode') === 'true';
            const data = await generateLineB(userEmotion, sensation, userThoughts, userImpulses, bodySensations, userNeed, conversationMode);
            removeSystemMessage();
            
            if (data.response) {
                addMessageToChat('ai', data.response);
                
                // Line B is always part of meditation session - TTS enabled
                await speakResponse(data.response);
                
                // Store Line B for audio consolidation
                localStorage.setItem('lineB', data.response);
            } else if (data.error) {
                addMessageToChat('ai', `Error: ${data.error}`);
            }
            
            // Add buttons to continue or start meditation
            const buttonDiv = document.createElement('div');
            buttonDiv.className = 'choice-buttons';
            buttonDiv.innerHTML = `
                <button id="startMeditation">Start Meditation</button>
                <button id="continueChatting">Continue Chatting</button>
            `;
            chatWindow.appendChild(buttonDiv);
            
            document.getElementById('startMeditation').addEventListener('click', () => {
                // Store Line A and B for audio session
                localStorage.setItem('lineA', localStorage.getItem('lineA') || '');
                localStorage.setItem('lineB', localStorage.getItem('lineB') || '');
                localStorage.setItem('hcbCompleted', 'true');
                window.location.href = 'audio.html';
            });
            
            document.getElementById('continueChatting').addEventListener('click', () => {
                resetToNormalChat();
            });
        } catch (error) {
            console.error('Error:', error);
            removeSystemMessage();
            addMessageToChat('ai', 'Sorry, there was an error generating follow-up guidance.');
        }
    }

    // Reset to normal chat
    function resetToNormalChat() {
        currentState = 'normal-chat';
        chatWindow.innerHTML = '';
        addMessageToChat('ai', 'How can I assist you further today?');
        userInput.disabled = false;
        if (speakBtn) {
            speakBtn.disabled = false;
        }
        sendBtn.disabled = false;
        // Focus the input field for immediate typing
        setTimeout(() => userInput.focus(), 100);
    }

    // Helper function to determine if an emotion is positive or negative
    function isPositiveEmotion(emotion) {
        const positiveEmotions = [
            'joy', 'happy', 'happiness', 'excited', 'excitement', 'love', 
            'grateful', 'gratitude', 'content', 'contentment', 'peaceful', 
            'calm', 'satisfied', 'proud', 'pride', 'hopeful', 'hope'
        ];
        
        return positiveEmotions.some(positive => 
            emotion.toLowerCase().includes(positive.toLowerCase())
        );
    }

    // Helper function to determine if stress level is high or low
    function isHighStress() {
        return stressLevel >= 4; // Consider 4-5 as high stress
    }

    // Helper function to determine which version to show
    function shouldShowThreeMinuteVersion() {
        // Show 3-minute version for high stress + negative emotion
        return isHighStress() && !isPositiveEmotion(userEmotion);
    }

    // Show 3-minute version (high stress + negative emotion)
        // Show 3-minute version (high stress + negative emotion)
    function showThreeMinuteVersion() {
        currentState = 'fixed-content';
        chatWindow.innerHTML = '';
        
        // Opening
        addMessageToChat('ai', "Zenotal Reset begins—one calm breath at a time.");
        speakResponse("Zenotal Reset begins—one calm breath at a time.");
        
        setTimeout(() => {
            // Intro
            const introText = "Step one, recognising. Pause here. Sit upright, shoulders soft, feet grounded. Ask: What is present—sensations, emotions, thoughts?";
            addMessageToChat('ai', introText);
            speakResponse(introText);
            
            // Next steps will happen after we get Line A
            setTimeout(() => {
                // Get Line A (this will be different for each user)
                const sensation = bodySensations[0] || 'bodily sensation';
                generateLineA(userEmotion, sensation, bodySensations, userThoughts, userImpulses, userNeed)
                    .then(data => {
                        if (data.response) {
                            addMessageToChat('ai', data.response);
                            speakResponse(data.response);
                            
                            // Continue with fixed content after Line A
                            setTimeout(() => {
                                // Recognising extension
                                const recognisingText = "Allow that band to be exactly as it is, without pushing it away—simply knowing it's here.";
                                addMessageToChat('ai', recognisingText);
                                speakResponse(recognisingText);
                                
                                setTimeout(() => {
                                    // Gathering
                                    const gatheringText = "Step two, gathering attention at breath. We'll count five breaths together. One… two… three… four… five… letting each number steady the mind.";
                                    addMessageToChat('ai', gatheringText);
                                    speakResponse(gatheringText);
                                    
                                    // Silent period (10s)
                                    setTimeout(() => {
                                        // Expanding intro
                                        const expandingText = "Step three, expanding awareness to the whole body—hips, shoulders, face, the breath moving through all of it.";
                                        addMessageToChat('ai', expandingText);
                                        speakResponse(expandingText);
                                        
                                        // Get Line B (this will be different for each user)
                                        setTimeout(() => {
                                            generateLineB(userEmotion, sensation, userThoughts, userImpulses, bodySensations, userNeed)
                                                .then(data => {
                                                    if (data.response) {
                                                        addMessageToChat('ai', data.response);
                                                        speakResponse(data.response);
                                                        
                                                        // Continue with expanding extension (3-min version only)
                                                        setTimeout(() => {
                                                            const expandingExtensionText = "Allow breath to move through shoulders, back, face. Whatever sensations remain, breathe with them, not against them. Kindness is the posture of the heart.";
                                                            addMessageToChat('ai', expandingExtensionText);
                                                            speakResponse(expandingExtensionText);
                                                            
                                                            // Finish with outro
                                                            setTimeout(() => {
                                                                const outroText1 = "Breathing continues, awareness steady.";
                                                                addMessageToChat('ai', outroText1);
                                                                speakResponse(outroText1);
                                                                setTimeout(() => {
                                                                    const outroText2 = "May this ease ripple through the rest of your day.";
                                                                    addMessageToChat('ai', outroText2);
                                                                    speakResponse(outroText2);
                                                                    
                                                                    // Add buttons to continue or end session
                                                                    const buttonDiv = document.createElement('div');
                                                                    buttonDiv.className = 'choice-buttons';
                                                                    buttonDiv.innerHTML = `
                                                                        <button id="continueSession">Continue Practice</button>
                                                                        <button id="endSession">End Session</button>
                                                                    `;
                                                                    chatWindow.appendChild(buttonDiv);
                                                                    
                                                                    document.getElementById('continueSession').addEventListener('click', () => {
                                                                        resetToNormalChat();
                                                                    });
                                                                    
                                                                    document.getElementById('endSession').addEventListener('click', () => {
                                                                        const endText = "Thank you for taking time for mindfulness today. Remember you can return anytime.";
                                                                        chatWindow.innerHTML = `
                                                                            <div class="message ai">
                                                                                <div class="bubble">
                                                                                    ${endText}
                                                                                </div>
                                                                            </div>
                                                                        `;
                                                                        speakResponse(endText);
                                                                    });
                                                                }, 3000);
                                                            }, 5000);
                                                        }, 5000);
                                                    }
                                                });
                                        }, 4000);
                                    }, 10000); // 10 second silence
                                }, 3000);
                            }, 3000);
                        }
                    });
            }, 3000);
        }, 2000);
    }

    // Show 2-minute version (low stress + positive emotion)
        // Show 2-minute version (low stress + positive emotion)
    function showTwoMinuteVersion() {
        currentState = 'fixed-content';
        chatWindow.innerHTML = '';
        
        // Opening
        addMessageToChat('ai', "Zenotal Reset begins—one calm breath at a time.");
        
        setTimeout(() => {
            // Intro
            addMessageToChat('ai', "Step one, recognising. Pause here. Sit upright, shoulders soft, feet grounded. Ask: What is present—sensations, emotions, thoughts?");
            
            // Next steps will happen after we get Line A
            setTimeout(() => {
                // Get Line A (this will be different for each user)
                const sensation = bodySensations[0] || 'bodily sensation';
                generateLineA(userEmotion, sensation, bodySensations, userThoughts, userImpulses, userNeed)
                    .then(data => {
                        if (data.response) {
                            addMessageToChat('ai', data.response);
                            speakResponse(data.response);
                            
                            // Continue with fixed content after Line A
                            setTimeout(() => {
                                // Recognising extension
                                addMessageToChat('ai', "Allow that band to be exactly as it is, without pushing it away—simply knowing it's here.");
                                
                                setTimeout(() => {
                                    // Gathering
                                    addMessageToChat('ai', "Step two, gathering attention at breath. We'll count five breaths together. One… two… three… four… five… letting each number steady the mind.");
                                    
                                    // Silent period (10s)
                                    setTimeout(() => {
                                        // Expanding intro
                                        addMessageToChat('ai', "Step three, expanding awareness to the whole body—hips, shoulders, face, the breath moving through all of it.");
                                        
                                        // Get Line B (this will be different for each user)
                                        setTimeout(() => {
                                            generateLineB(userEmotion, sensation, userThoughts, userImpulses, bodySensations, userNeed)
                                                .then(data => {
                                                    if (data.response) {
                                                        addMessageToChat('ai', data.response);
                                                        speakResponse(data.response);
                                                        
                                                        // Finish with outro
                                                        setTimeout(() => {
                                                            addMessageToChat('ai', "Breathing continues, awareness steady.");
                                                            setTimeout(() => {
                                                                addMessageToChat('ai', "May this ease ripple through the rest of your day.");
                                                                
                                                                // Add buttons to continue or end session
                                                                const buttonDiv = document.createElement('div');
                                                                buttonDiv.className = 'choice-buttons';
                                                                buttonDiv.innerHTML = `
                                                                    <button id="continueSession">Continue Practice</button>
                                                                    <button id="endSession">End Session</button>
                                                                `;
                                                                chatWindow.appendChild(buttonDiv);
                                                                
                                                                document.getElementById('continueSession').addEventListener('click', () => {
                                                                    resetToNormalChat();
                                                                });
                                                                
                                                                document.getElementById('endSession').addEventListener('click', () => {
                                                                    chatWindow.innerHTML = `
                                                                        <div class="message ai">
                                                                            <div class="bubble">
                                                                                Thank you for taking time for mindfulness today. Remember you can return anytime.
                                                                            </div>
                                                                        </div>
                                                                    `;
                                                                });
                                                            }, 3000);
                                                        }, 3000);
                                                    }
                                                });
                                        }, 4000);
                                    }, 10000); // 10 second silence
                                }, 3000);
                            }, 3000);
                        }
                    });
            }, 3000);
        }, 2000);
    }

    // Initialize with stress level input screen
    function initStressLevelInput() {
        conversationHistory = [];

        chatWindow.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to MindReset</h2>
                <p>How would you rate your current stress level?</p>
                <div class="stress-level-container">
                    <div class="stress-level-options">
                        <button class="stress-button" data-level="1">1<span>Very Low</span></button>
                        <button class="stress-button" data-level="2">2<span>Low</span></button>
                        <button class="stress-button" data-level="3">3<span>Moderate</span></button>
                        <button class="stress-button" data-level="4">4<span>High</span></button>
                        <button class="stress-button" data-level="5">5<span>Very High</span></button>
                    </div>
                </div>
            </div>
        `;
        
        // Add click event listeners to stress level buttons
        document.querySelectorAll('.stress-button').forEach(button => {
            button.addEventListener('click', () => {
                stressLevel = parseInt(button.getAttribute('data-level'));
                console.log(`Selected stress level: ${stressLevel}`);
                // Proceed to emotion input after selecting stress level
                initEmotionInput();
            });
        });
    }

    // Initialize with emotion input screen
    function initEmotionInput() {
        chatWindow.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to MindReset</h2>
                <p>What emotion are you experiencing right now?</p>
                <input type="text" id="emotionInput" placeholder="e.g., anxiety, frustration, sadness..." />
                <button id="submitEmotion">Continue</button>
            </div>
        `;
        
        document.getElementById('submitEmotion').addEventListener('click', () => {
            userEmotion = document.getElementById('emotionInput').value.trim();
            if (userEmotion) {
                offerHotCrossBun();
            }
        });
    }

        // Offer hot-cross-bun or appropriate version based on stress and emotion
    function offerHotCrossBun() {
        // For all combinations, first offer the guided conversation
        chatWindow.innerHTML = `
            <div class="message ai">
                <div class="bubble">
                    Thank you for sharing. Would you like to explore this feeling more deeply with a guided conversation?
                </div>
            </div>
            <div class="choice-buttons">
                <button id="acceptHCB">Yes, I'd like that</button>
                <button id="rejectHCB">No, just continue</button>
            </div>
        `;
        
        document.getElementById('acceptHCB').addEventListener('click', () => {
            startHotCrossBunConversation();
        });
        
        document.getElementById('rejectHCB').addEventListener('click', () => {
            // Navigate to audio interface for meditation
            window.location.href = 'audio.html';
        });
    }

    // Check if Flask server is running
    async function checkServerConnectivity() {
        // InsForge edge functions don't need connectivity check
        console.log('[DEBUG] Using InsForge Edge Functions - no connectivity check needed');
        console.log('✅ InsForge Edge Functions ready');
    }
    
    function showServerWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff6b6b;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            font-family: Arial, sans-serif;
            text-align: center;
            max-width: 90%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        // Server warning disabled for Vercel deployment
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (warningDiv.parentElement) {
                warningDiv.remove();
            }
        }, 10000);
    }

    // Start the app with emotion data from emotion wheel
    initializeWithEmotionData();
    
    // Ensure input field is ready for typing once page fully loads
    setTimeout(() => {
        if (userInput && !userInput.disabled) {
            userInput.focus();
        }
    }, 500);
});