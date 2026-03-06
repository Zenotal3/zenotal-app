document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== AUDIO PAGE LOADING (HYBRID STATIC+TTS) ===');
    
    // DOM Elements
    const playPauseBtn = document.getElementById('playPauseBtn');
    const subtitlesBtn = document.getElementById('subtitlesBtn');
    const blackoutBtn = document.getElementById('blackoutBtn');
    const finishBtn = document.getElementById('finishBtn');
    const currentTimeDisplay = document.getElementById('currentTime');
    const subtitlesContainer = document.getElementById('subtitlesContainer');
    const subtitlesText = document.getElementById('subtitlesText');
    const sessionComplete = document.getElementById('sessionComplete');
    const audioContainer = document.querySelector('.audio-container');
    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');
    const countdownTimer = document.getElementById('countdownTimer');
    const loadingVideo = document.getElementById('loadingVideo');
    const loadingCanvas = document.getElementById('loadingCanvas');
    const loadingFallback = document.getElementById('loadingFallback');

    // State variables - declared first to prevent initialization errors
    let isPlaying = false;
    let showSubtitles = false;
    let blackoutMode = false;
    let subtitleTimeline = [];
    let audioSegments = [];
    let currentSegmentIndex = 0;
    let audioElement = null;
    
    // Store timing data for subtitle alignment
    let ttsTimingData = new Map(); // Store timing data by text content
    
    // Global timing for continuous subtitles across segments
    let globalStartTime = 0;
    let segmentStartTime = 0;
    let cumulativeTime = 0;
    
    // Total session timing
    let totalSessionDuration = 0;
    let segmentDurations = []; // Store duration of each segment
    let currentSessionTime = 0; // Overall session progress

    // User/session data
    const userEmotion = localStorage.getItem('userEmotion');
    const stressLevel = parseInt(localStorage.getItem('userStressScale')) || parseInt(localStorage.getItem('stressLevel')) || 5; // Use new 1-5 scale, fallback to old
    const conversationChoice = localStorage.getItem('conversationChoice');
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    const lineA = localStorage.getItem('lineA') || '';
    const lineB = localStorage.getItem('lineB') || '';
    
    // Force reset session state on page load to prevent resuming from previous session
    function resetSessionState() {
        console.log('🔄 Resetting session state to start from beginning');
        
        // Reset all timing variables to 0
        currentSegmentIndex = 0;
        isPlaying = false;
        cumulativeTime = 0;
        segmentStartTime = 0;
        currentSessionTime = 0;
        globalStartTime = 0;
        totalSessionDuration = 0;
        
        // Clear arrays
        audioSegments = [];
        subtitleTimeline = [];
        segmentDurations = [];
        ttsTimingData.clear();
        
        // Reset audio element if it exists
        if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
            audioElement.removeAttribute('src');
            audioElement.load(); // Force reload to clear any cached state
            audioElement = null;
        }
        
        // Clear any existing audio elements from DOM and reset the main audio element
        const existingAudio = document.querySelectorAll('audio');
        existingAudio.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
            if (audio.id !== 'meditationAudio') {
                audio.removeAttribute('src');
                audio.load();
            } else {
                // Reset the main meditation audio element too
                audio.removeAttribute('src');
                audio.load();
                console.log('🔧 Main meditation audio element reset');
            }
        });
        
        // Reset UI state
        if (playIcon && pauseIcon) {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
        
        // Clear any localStorage items that might store audio position
        const audioStorageKeys = ['audioPosition', 'lastPlayedTime', 'resumeTime', 'audioTime', 'savedTime', 'sessionProgress'];
        audioStorageKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`🧹 Cleared localStorage: ${key}`);
            }
        });
        
        console.log('✅ Session state reset complete - starting fresh from 0:00');
    }
    
    // CRITICAL: Reset all session state to ensure we start from the beginning
    resetSessionState();
    
    // Character selection data
    const selectedCharacter = localStorage.getItem('selectedCharacter') || 'jeremy'; // Default to jeremy
    const selectedVoice = localStorage.getItem('selectedVoice') || 'male'; // Default to male
    const selectedCharacterName = localStorage.getItem('selectedCharacterName') || 'Jeremy';

    // Fixed audio durations (in seconds) - UPDATE THESE WITH ACTUAL DURATIONS
    const FIXED_AUDIO_DURATIONS = {
        // 2-MINUTE VERSION FILES
        '2min': {
            // Male versions
            '01_2min_male.mp3': 12,
            '02_male.mp3': 23,
            '04_male.mp3': 11,
            '06_male.mp3': 11,
            '07_male.mp3': 21,
            '09_2min_male.mp3': 6,
            '10_2min_male.mp3': 23,
            '12_2min_male.mp3': 12,
            // Female versions
            '01_2min_female.mp3': 12,
            '02_female.mp3': 23,
            '04_female.mp3': 14,
            '06_female.mp3': 9,
            '07_female.mp3': 22,
            '09_2min_female.mp3': 7,
            '10_2min_female.mp3': 23,
            '12_2min_female.mp3': 14,
            // No gender suffix files
            '3-seconds-of-silence.mp3': 3,
            '5-seconds-of-silence.mp3': 5,
            '10-seconds-of-silence.mp3': 10
        },
        
        // 3-MINUTE VERSION FILES  
        '3min': {
            // Male versions
            '01_3min_male.mp3': 16,
            '02_male.mp3': 23,
            '04_male.mp3': 11,
            '06_male.mp3': 11,
            '07_male.mp3': 21,
            '09_3min_male.mp3': 9,
            '10_2min_male.mp3': 23,
            '10_3min+_male.mp3': 10,
            '12_2min_male.mp3': 12,
            '12+_3min_male.mp3': 12,
            // Female versions
            '01_3min_female.mp3': 18,
            '02_female.mp3': 23,
            '04_female.mp3': 14,
            '06_female.mp3': 9,
            '07_female.mp3': 22,
            '09_3min_female.mp3': 7,
            '10_2min_female.mp3': 23,
            '10_3min+_female.mp3': 10,
            '12_2min_female.mp3': 14,
            '12+_3min_female.mp3': 10,
            // No gender suffix files
            '3-seconds-of-silence.mp3': 3,
            '5-seconds-of-silence.mp3': 5,
            '10-seconds-of-silence.mp3': 10
        }
    };

    // Get character-specific audio file name
    function getCharacterAudioFile(baseFilename) {
        // Handle different naming patterns:
        // 1. Version + Gender: 01_2min -> 01_2min_female/male
        // 2. Gender only: 02 -> 02_female/male  
        // 3. No suffix: 3-seconds-of-silence (stays the same)
        
        const voiceSuffix = selectedVoice === 'female' ? '_female' : '_male';
        
        // Pattern 3: Files that don't need gender suffix (silence files)
        const noGenderFiles = ['3-seconds-of-silence.mp3', '5-seconds-of-silence.mp3', '10-seconds-of-silence.mp3'];
        if (noGenderFiles.includes(baseFilename)) {
            return baseFilename;
        }
        
        // If filename already has a voice suffix, replace it
        if (baseFilename.includes('_male.mp3') || baseFilename.includes('_female.mp3')) {
            const baseName = baseFilename.replace(/_male\.mp3$|_female\.mp3$/, '');
            return `${baseName}${voiceSuffix}.mp3`;
        }
        
        // Add voice suffix before the .mp3 extension
        return baseFilename.replace('.mp3', `${voiceSuffix}.mp3`);
    }

    // Get selected voice from storage for TTS API
    function getSelectedVoiceFromStorage() {
        return selectedVoice || 'male';
    }

    // Get estimated duration for a static audio file based on version
    function getStaticAudioDuration(url, version) {
        const filename = url.split('/').pop();
        const characterFilename = getCharacterAudioFile(filename);
        const versionKey = version === 2 ? '2min' : '3min';
        return FIXED_AUDIO_DURATIONS[versionKey][characterFilename] || 10; // Default 10 seconds if not found
    }

    // Calculate total session duration
    function calculateTotalSessionDuration(sessionVersion) {
        totalSessionDuration = 0;
        segmentDurations = [];
        
        audioSegments.forEach((segmentUrl, index) => {
            let duration = 0;
            
            if (segmentUrl.startsWith('blob:')) {
                // This is a TTS segment, get duration from stored timing data
                const ttsEntry = Array.from(ttsTimingData.values()).find(data => data.url === segmentUrl);
                duration = ttsEntry ? ttsEntry.actualDuration : 5; // Default 5 seconds for TTS
            } else {
                // This is a static audio file - pass version to get correct duration
                duration = getStaticAudioDuration(segmentUrl, sessionVersion);
            }
            
            segmentDurations[index] = duration;
            totalSessionDuration += duration;
        });
        
        console.log('Total session duration calculated:', totalSessionDuration, 'seconds');
        console.log('Segment durations:', segmentDurations);
        return totalSessionDuration;
    }
    console.log('=== SESSION DATA ===');
    console.log('User Emotion:', userEmotion);
    console.log('Stress Level:', stressLevel);
    console.log('Conversation Choice:', conversationChoice);
    console.log('Line A:', lineA);
    console.log('Line B:', lineB);
    console.log('Line A length:', lineA ? lineA.length : 'null');
    console.log('Line B length:', lineB ? lineB.length : 'null');
    console.log('HCB Completed:', localStorage.getItem('hcbCompleted'));
    console.log('Conversation Mode:', localStorage.getItem('conversationMode'));
    console.log('All localStorage keys:', Object.keys(localStorage));
    console.log('=====================');

    // --- Main session init ---
    // Don't start audio automatically - wait for user interaction
    let audioSessionReady = false;
    let sessionType = null;

    async function initializeAudioSession() {
        console.log('🎬 Initializing audio session (preparing, not starting)');
        sessionType = determineSessionType();
        await setupAudioSession(sessionType);
        audioSessionReady = true;
        console.log('✅ Audio session ready - waiting for user to click play');
    }

    // Prepare the session but don't start automatically
    initializeAudioSession();

    function determineSessionType() {
        // Use stressLevel to pick 2min or 3min version
        const sessionDuration = stressLevel >= 4 ? 3 : 2;
        return {
            duration: sessionDuration,
            emotion: userEmotion || 'neutral',
            hasConversation: conversationChoice === 'yes' && chatHistory.length > 0
        };
    }

    async function setupAudioSession(sessionType) {
        // Show loading video
        showLoadingVideo();
        
        // Always use hybrid audio session (static + TTS)
        await generateHybridAudioSession(sessionType);
        await createSubtitleTimeline(sessionType);
        setupControlEventListeners();
        
        // Final session state verification before starting
        console.log('🎯 Final session state check before starting:');
        console.log('- currentSegmentIndex:', currentSegmentIndex);
        console.log('- cumulativeTime:', cumulativeTime);
        console.log('- currentSessionTime:', currentSessionTime);
        console.log('- Total segments:', audioSegments.length);
        console.log('- Total duration:', totalSessionDuration + 's');
        
        if (currentSegmentIndex !== 0 || cumulativeTime !== 0 || currentSessionTime !== 0) {
            console.warn('⚠️ Session state not properly reset, forcing reset again');
            resetSessionState();
        }
        
        // Display timing debug information
        displayTimingDebugInfo();
        
        // Hide loading video when ready and show duration
        console.log('🔄 Audio session ready - hiding loading video and showing duration');
        
        // Small delay to ensure all async operations complete before hiding loading
        setTimeout(() => {
            hideLoadingVideo();
            // Show the duration and make it clear the session is ready
            if (currentTimeDisplay) {
                currentTimeDisplay.textContent = formatTime(totalSessionDuration);
                console.log('✅ Session ready - showing total duration:', formatTime(totalSessionDuration));
            }
        }, 100);
    }

    // Debug function to show timing information
    function displayTimingDebugInfo() {
        const debugBox = document.getElementById('ttsScriptBox');
        if (debugBox) {
            let debugText = `TOTAL SESSION DURATION: ${formatTime(totalSessionDuration)} (${totalSessionDuration.toFixed(1)}s)\n\n`;
            
            debugText += 'SEGMENT DURATIONS:\n';
            segmentDurations.forEach((duration, index) => {
                const segmentUrl = audioSegments[index];
                const filename = segmentUrl && segmentUrl.includes('/') ? segmentUrl.split('/').pop() : 'TTS';
                debugText += `${index + 1}. ${filename}: ${duration.toFixed(1)}s\n`;
            });
            debugText += '\n';
            
            if (ttsTimingData.size > 0) {
                debugText += 'TTS TIMING DATA:\n\n';
                ttsTimingData.forEach((data, text) => {
                    debugText += `Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"\n`;
                    debugText += `Actual Duration: ${data.actualDuration?.toFixed(2)}s\n`;
                    debugText += `Word Count: ${data.wordTimings?.length || 0} words\n`;
                    debugText += `Character Count: ${text.length}\n`;
                    if (data.wordTimings && data.wordTimings.length > 0) {
                        debugText += `First word: "${data.wordTimings[0].word}" (${data.wordTimings[0].start?.toFixed(2)}s-${data.wordTimings[0].end?.toFixed(2)}s)\n`;
                        debugText += `Last word: "${data.wordTimings[data.wordTimings.length-1].word}" (${data.wordTimings[data.wordTimings.length-1].start?.toFixed(2)}s-${data.wordTimings[data.wordTimings.length-1].end?.toFixed(2)}s)\n`;
                    }
                    debugText += '\n';
                });
            }
            
            debugText += '\nSUBTITLE TIMELINE:\n';
            subtitleTimeline.forEach((subtitle, index) => {
                debugText += `${index + 1}. [${formatTime(subtitle.time)}] ${subtitle.text.substring(0, 60)}${subtitle.text.length > 60 ? '...' : ''}\n`;
            });
            
            debugBox.value = debugText;
        }
    }

    // --- HYBRID AUDIO SESSION ---
    async function generateHybridAudioSession(sessionType) {
        try {
            showLoadingState('Preparing your meditation...');
            
            // 1. Get static audio URLs based on version
            const version = sessionType.duration; // 2 or 3
            const staticBase = `assets/audios/`;
            
            // Generate URLs based on version - YOUR ACTUAL FILE NAMES:
            let staticUrls;
            if (version === 2) {
                // 2-MINUTE VERSION SEQUENCE:
                staticUrls = {
                    file1: `${staticBase}${getCharacterAudioFile('01_2min.mp3')}`,      // -> 01_2min_female.mp3
                    file2: `${staticBase}${getCharacterAudioFile('02.mp3')}`,           // -> 02_female.mp3
                    file3: `${staticBase}${getCharacterAudioFile('04.mp3')}`,      // -> 04_female.mp3
                    file4: `${staticBase}${getCharacterAudioFile('3-seconds-of-silence.mp3')}`,  // -> 3-seconds-of-silence.mp3 (no change)
                    file5: `${staticBase}${getCharacterAudioFile('06.mp3')}`,           // -> 06_female.mp3
                    file6: `${staticBase}${getCharacterAudioFile('07.mp3')}`,           // -> 07_female.mp3
                    file7: `${staticBase}${getCharacterAudioFile('09_2min.mp3')}`,      // -> 09_2min_female.mp3
                    file8: `${staticBase}${getCharacterAudioFile('10_2min.mp3')}`,      // -> 10_2min_female.mp3
                    file10: `${staticBase}${getCharacterAudioFile('12_2min.mp3')}`,     // -> 12_2min_female.mp3
                    file11: `${staticBase}${getCharacterAudioFile('5-seconds-of-silence.mp3')}`,  // -> 5-seconds-of-silence.mp3 (no change)
                    file12: `${staticBase}${getCharacterAudioFile('10-seconds-of-silence.mp3')}`, // -> 10-seconds-of-silence.mp3 (no change)
                    // Add more files as needed for 2min version
                };
            } else {
                // 3-MINUTE VERSION SEQUENCE:
                staticUrls = {
                    file1: `${staticBase}${getCharacterAudioFile('01_3min.mp3')}`,      // -> 01_3min_female.mp3
                    file2: `${staticBase}${getCharacterAudioFile('02.mp3')}`,           // -> 02_female.mp3
                    file3: `${staticBase}${getCharacterAudioFile('04.mp3')}`,      // -> 04_female.mp3
                    file4: `${staticBase}${getCharacterAudioFile('5-seconds-of-silence.mp3')}`,  // -> 5-seconds-of-silence.mp3 (no change)
                    file5: `${staticBase}${getCharacterAudioFile('06.mp3')}`,           // -> 06_female.mp3
                    file6: `${staticBase}${getCharacterAudioFile('07.mp3')}`,           // -> 07_female.mp3
                    file7: `${staticBase}${getCharacterAudioFile('09_3min.mp3')}`,      // -> 09_3min_female.mp3
                    file8: `${staticBase}${getCharacterAudioFile('10_2min.mp3')}`,      // -> 10_2min_female.mp3
                    file9: `${staticBase}${getCharacterAudioFile('10_3min+.mp3')}`,     // -> 10_3min+_female.mp3
                    file10: `${staticBase}${getCharacterAudioFile('12_2min.mp3')}`,     // -> 12_2min_female.mp3
                    file11: `${staticBase}${getCharacterAudioFile('12+_3min.mp3')}`,    // -> 12+_3min_female.mp3
                    file12: `${staticBase}${getCharacterAudioFile('10-seconds-of-silence.mp3')}`, // -> 10-seconds-of-silence.mp3 (no change)
                    file13: `${staticBase}${getCharacterAudioFile('3-seconds-of-silence.mp3')}`, 
                    // Add more files as needed for 3min version
                };
            }

            console.log(`Using ${version}-minute version`);

            // 2. Get TTS for Line A and Line B (in parallel for better performance)
            const ttsPromises = [];
            let fallbackLineA = "Notice your current experience with kindness and curiosity.";
            let fallbackLineB = "How are you feeling now as you continue this practice?";
            
            console.log('Preparing TTS generation...');
            console.log('Line A for TTS:', lineA || 'Using fallback');
            console.log('Line B for TTS:', lineB || 'Using fallback');
            
            if (lineA && lineA.trim()) {
                ttsPromises.push(
                    fetchTTSBlobUrl(lineA)
                        .then(url => ({type: 'lineA', url, text: lineA}))
                        .catch(error => {
                            console.warn('Line A TTS failed, using fallback:', error);
                            return fetchTTSBlobUrl(fallbackLineA).then(url => ({type: 'lineA', url, text: fallbackLineA}));
                        })
                );
            } else {
                console.log('Line A empty, using fallback');
                ttsPromises.push(fetchTTSBlobUrl(fallbackLineA).then(url => ({type: 'lineA', url, text: fallbackLineA})));
            }
            
            if (lineB && lineB.trim()) {
                ttsPromises.push(
                    fetchTTSBlobUrl(lineB)
                        .then(url => ({type: 'lineB', url, text: lineB}))
                        .catch(error => {
                            console.warn('Line B TTS failed, using fallback:', error);
                            return fetchTTSBlobUrl(fallbackLineB).then(url => ({type: 'lineB', url, text: fallbackLineB}));
                        })
                );
            } else {
                console.log('Line B empty, using fallback');
                ttsPromises.push(fetchTTSBlobUrl(fallbackLineB).then(url => ({type: 'lineB', url, text: fallbackLineB})));
            }
            
            const ttsResults = await Promise.all(ttsPromises);
            const lineAResult = ttsResults.find(r => r.type === 'lineA');
            const lineBResult = ttsResults.find(r => r.type === 'lineB');
            const lineAUrl = lineAResult?.url || null;
            const lineBUrl = lineBResult?.url || null;

            console.log('TTS generation complete:', {
                lineAUrl: !!lineAUrl, 
                lineBUrl: !!lineBUrl,
                lineAText: lineAResult?.text?.substring(0, 50) + '...',
                lineBText: lineBResult?.text?.substring(0, 50) + '...'
            });

            // Update debug box with actual content used
            const ttsScriptBox = document.getElementById('ttsScriptBox');
            if (ttsScriptBox) {
                ttsScriptBox.value = `Line A (TTS): ${lineAResult?.text || 'Failed to generate'}\n\nLine B (TTS): ${lineBResult?.text || 'Failed to generate'}`;
            }

            // 3. Build the audio segment list based on version
            if (version === 2) {
                // 2-MINUTE VERSION SEQUENCE - UPDATE THIS ORDER:
                audioSegments = [
                    staticUrls.file1,
                    staticUrls.file4,        
                    staticUrls.file2,
                    staticUrls.file4,       
                    lineAUrl,               // TTS Line A
                    staticUrls.file4,
                    staticUrls.file3,        
                    staticUrls.file11,
                    staticUrls.file5,
                    staticUrls.file4,
                    staticUrls.file6,
                    staticUrls.file11,
                    staticUrls.file7,
                    staticUrls.file4,
                    staticUrls.file8,        // Replace with your sequence
                    staticUrls.file4,
                    lineBUrl,               // TTS Line B
                    staticUrls.file4,  
                    staticUrls.file10,
                    staticUrls.file4
                    // Add closing segments
                ].filter(Boolean);
            } else {
                // 3-MINUTE VERSION SEQUENCE - UPDATE THIS ORDER:
                audioSegments = [
                    staticUrls.file1,        // Replace with your sequence
                    staticUrls.file13,
                    staticUrls.file2,        // Replace with your sequence
                    staticUrls.file13,
                    lineAUrl,               // TTS Line A
                    staticUrls.file13,
                    staticUrls.file3,        // Replace with your sequence
                    staticUrls.file12,
                    staticUrls.file5,
                    staticUrls.file13,
                    staticUrls.file6,
                    staticUrls.file12,
                    staticUrls.file7,
                    staticUrls.file12,
                    staticUrls.file8,        // Replace with your sequence
                    staticUrls.file9,        // Replace with your sequence
                    staticUrls.file13,
                    lineBUrl,               // TTS Line B  
                    staticUrls.file13,
                    staticUrls.file11,
                    staticUrls.file4,
                    staticUrls.file10,
                    staticUrls.file13
                ].filter(Boolean);
            }
            
            console.log(`Audio session ready: ${audioSegments.length} segments`);
            console.log('Audio segments:', audioSegments.map((seg, i) => `${i}: ${seg ? (seg.length > 50 ? seg.substring(0, 50) + '...' : seg) : 'null'}`));
            
            if (audioSegments.length === 0) {
                throw new Error('No audio segments were generated - all TTS and static files failed');
            }
            
            // Calculate total session duration now that we have all segments
            calculateTotalSessionDuration(version);
            
            currentSegmentIndex = 0;
            // Reset global timing for new session
            cumulativeTime = 0;
            segmentStartTime = 0;
            currentSessionTime = 0;
            
            // 4. Validate static files exist (optional - helps with debugging)
            const staticFiles = Object.values(staticUrls);
            await validateStaticFiles(staticFiles);
            
            // 5. Prepare playback chain (but don't start automatically)
            setupAudioEventListeners();
            // playNextSegment(); // REMOVED: Don't auto-start - wait for user interaction
            hideLoadingState();
            
            console.log('🎯 Audio session prepared - ready for user to click play');
            
            // Ensure the total duration is displayed
            if (currentTimeDisplay && totalSessionDuration > 0) {
                currentTimeDisplay.textContent = formatTime(totalSessionDuration);
                console.log('📺 Displaying total session duration:', formatTime(totalSessionDuration));
            }
        
        // Show total session duration on the display
        if (totalSessionDuration > 0) {
            currentTimeDisplay.style.display = 'block';
            currentTimeDisplay.style.opacity = '1'; // Ensure full opacity
            currentTimeDisplay.textContent = formatTime(totalSessionDuration);
        }
        } catch (error) {
            console.error('Error preparing hybrid audio session:', error);
            showMessage(`Audio generation failed: ${error.message}`);
            showTextBasedMeditation();
        }
    }

    // Fetch TTS audio for a line and return a blob URL
    async function fetchTTSBlobUrl(text) {
        if (!text || !text.trim()) {
            throw new Error('Empty text provided for TTS');
        }
        try {
            console.log('Fetching TTS with timestamps for:', text.substring(0, 50) + '...');
            const res = await fetch(`${API_BASE_URL}/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: text.trim(),
                    includeTimestamps: true,
                    includeDuration: true,
                    voice: getSelectedVoiceFromStorage()
                })
            });
            
            console.log('TTS API response status:', res.status);
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error('TTS API error response:', errorText);
                throw new Error(`TTS API returned ${res.status}: ${res.statusText} - ${errorText}`);
            }
            
            const data = await res.json();
            console.log('TTS API response data keys:', Object.keys(data));
            
            if (!data.audioContent) {
                console.error('TTS response data:', data);
                throw new Error('TTS response missing audioContent field');
            }
            
            // Store timing data for subtitle alignment
            if (data.hasTimestamps && data.wordTimings) {
                ttsTimingData.set(text.trim(), {
                    wordTimings: data.wordTimings,
                    actualDuration: data.actualDuration,
                    alignment: data.alignment,
                    text: data.text,
                    url: null // Will be set after blob URL creation
                });
                console.log(`Stored timing data for "${text.substring(0, 30)}..." - Duration: ${data.actualDuration?.toFixed(2)}s, Words: ${data.wordTimings?.length || 0}`);
            } else {
                // Store duration even without word timings
                ttsTimingData.set(text.trim(), {
                    wordTimings: [],
                    actualDuration: data.actualDuration || data.estimatedDuration || 5,
                    alignment: null,
                    text: data.text || text.trim(),
                    url: null
                });
                console.log(`Stored basic timing data for "${text.substring(0, 30)}..." - Duration: ${data.actualDuration || 5}s`);
            }
            
            const blob = base64ToBlob(data.audioContent, 'audio/mpeg');
            const url = URL.createObjectURL(blob);
            
            // Update the stored data with the blob URL
            const storedData = ttsTimingData.get(text.trim());
            if (storedData) {
                storedData.url = url;
            }
            
            console.log('TTS blob URL created successfully, size:', blob.size, 'bytes');
            return url;
        } catch (error) {
            console.error('TTS fetch failed for text:', text.substring(0, 50) + '...');
            console.error('TTS error details:', error);
            throw new Error(`TTS failed: ${error.message}`);
        }
    }

    // Validate that static audio files are accessible
    async function validateStaticFiles(urls) {
        const checks = urls.map(async (url) => {
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (!response.ok) {
                    console.warn(`Static file not found: ${url}`);
                }
                return { url, exists: response.ok };
            } catch (error) {
                console.warn(`Static file check failed for ${url}:`, error);
                return { url, exists: false };
            }
        });
        
        const results = await Promise.all(checks);
        const missing = results.filter(r => !r.exists);
        if (missing.length > 0) {
            console.warn('Missing static audio files:', missing.map(r => r.url));
        }
        return results;
    }

    // Convert base64 to blob for audio playback
    function base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    // Play the next audio segment in the sequence
    function playNextSegment() {
        console.log(`🎵 Playing segment ${currentSegmentIndex + 1}/${audioSegments.length}`);
        console.log(`📊 Session progress: ${cumulativeTime.toFixed(1)}s / ${totalSessionDuration}s`);
        console.log(`📱 User agent: ${navigator.userAgent.substring(0, 50)}...`);
        
        // Check if this segment comes after a silence clip
        const currentSegmentUrl = audioSegments[currentSegmentIndex];
        const previousSegmentUrl = currentSegmentIndex > 0 ? audioSegments[currentSegmentIndex - 1] : null;
        const isAfterSilence = previousSegmentUrl && (
            previousSegmentUrl.includes('3-seconds-of-silence') ||
            previousSegmentUrl.includes('5-seconds-of-silence') ||
            previousSegmentUrl.includes('10-seconds-of-silence')
        );
        const isTTSSegment = currentSegmentUrl && currentSegmentUrl.startsWith('blob:');
        
        if (isAfterSilence && isTTSSegment) {
            console.log('🔍 CRITICAL: TTS segment after silence - applying extra care for clean transition');
        }
        
        // Track timing for subtitle continuity - use precalculated durations
        if (currentSegmentIndex > 0) {
            // Add duration of previous segment to cumulative time
            const previousSegmentDuration = segmentDurations[currentSegmentIndex - 1] || 0;
            cumulativeTime += previousSegmentDuration;
            console.log(`Cumulative time after segment ${currentSegmentIndex}: ${cumulativeTime}s (added ${previousSegmentDuration}s)`);
        }
        
        if (audioElement) {
            audioElement.pause();
            audioElement.remove();
        }
        
        if (currentSegmentIndex >= audioSegments.length) {
            console.log('All segments completed, showing session complete');
            showSessionComplete();
            return;
        }
        
        console.log('Loading audio segment:', currentSegmentUrl ? currentSegmentUrl.substring(0, 100) + '...' : 'null');
        
        if (!currentSegmentUrl) {
            console.error('Current segment URL is null, skipping to next');
            currentSegmentIndex++;
            playNextSegment();
            return;
        }
        
        audioElement = new Audio(currentSegmentUrl);
        audioElement.preload = 'auto';
        
        // CRITICAL: Ensure audio starts from the very beginning
        audioElement.currentTime = 0;
        console.log(`🎯 Audio element currentTime set to 0 for segment ${currentSegmentIndex + 1}`);
        
        // Record when this segment starts for global timing
        segmentStartTime = cumulativeTime;
        
        // Add a small delay to ensure clean transition, especially after silence
        let isReadyToPlay = false;
        
        audioElement.oncanplaythrough = () => {
            console.log('Audio segment can play through');
            isReadyToPlay = true;
        };
        
        audioElement.onloadeddata = () => {
            console.log('Audio segment data loaded');
            
            // CRITICAL: Ensure audio is at position 0 when loaded
            if (audioElement.currentTime !== 0) {
                console.log(`⚠️ Audio currentTime was ${audioElement.currentTime}, setting to 0`);
                audioElement.currentTime = 0;
            }
            
            // For TTS segments (blob URLs), give extra time to load properly
            if (currentSegmentUrl.startsWith('blob:')) {
                console.log('TTS segment detected, allowing extra load time');
                setTimeout(() => {
                    if (!isReadyToPlay) {
                        console.log('Force marking TTS segment as ready');
                        isReadyToPlay = true;
                    }
                }, 100); // 100ms extra for TTS segments
            }
        };
        
        audioElement.onended = () => {
            console.log('Audio segment ended, moving to next');
            currentSegmentIndex++;
            // Add small delay before next segment to ensure clean transition
            setTimeout(() => {
                playNextSegment();
            }, 50); // 50ms gap between segments
        };
        
        audioElement.onerror = (e) => {
            console.error('Audio segment error:', e);
            console.error('Audio element error details:', {
                error: audioElement.error,
                networkState: audioElement.networkState,
                readyState: audioElement.readyState,
                src: audioElement.src,
                segmentIndex: currentSegmentIndex,
                segmentType: currentSegmentUrl.startsWith('blob:') ? 'TTS' : 'Static',
                userAgent: navigator.userAgent
            });
            
            // Don't auto-skip on mobile/tablet - give user control
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent) || 
                             ('ontouchstart' in window) || 
                             (navigator.maxTouchPoints > 0) || 
                             (window.innerWidth <= 768);
            if (isMobile) {
                console.log('Mobile/tablet device detected - not auto-skipping failed segment');
                console.log('User can manually advance using controls if needed');
                // Show a brief error message but don't auto-skip
                if (currentTimeDisplay) {
                    const originalText = currentTimeDisplay.textContent;
                    currentTimeDisplay.textContent = 'Loading...';
                    setTimeout(() => {
                        currentTimeDisplay.textContent = originalText;
                    }, 2000);
                }
                return;
            }
            
            console.log('Desktop device - auto-skipping failed segment and trying next...');
            currentSegmentIndex++;
            if (currentSegmentIndex < audioSegments.length) {
                playNextSegment();
            } else {
                showAudioError();
            }
        };
        audioElement.onplay = () => { 
            console.log('Audio segment started playing');
            isPlaying = true;
            
            // Apply gentle fade-in for TTS segments to prevent cut-off
            if (currentSegmentUrl.startsWith('blob:')) {
                console.log('Applying gentle fade-in for TTS segment');
                audioElement.volume = 0.1; // Start quiet
                const fadeInDuration = 300; // 300ms fade-in
                const fadeSteps = 20;
                const volumeStep = 0.9 / fadeSteps; // Fade to 0.9 volume
                const stepDuration = fadeInDuration / fadeSteps;
                
                let currentStep = 0;
                const fadeInterval = setInterval(() => {
                    currentStep++;
                    audioElement.volume = Math.min(1.0, 0.1 + (volumeStep * currentStep));
                    
                    if (currentStep >= fadeSteps) {
                        clearInterval(fadeInterval);
                        audioElement.volume = 1.0; // Ensure full volume
                    }
                }, stepDuration);
            } else {
                audioElement.volume = 1.0; // Full volume for static files
            }
            
            // Play/pause UI sync
            if (playIcon && pauseIcon) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
            }
        };
        audioElement.onpause = () => { 
            console.log('Audio segment paused');
            isPlaying = false;
            // Play/pause UI sync
            if (playIcon && pauseIcon) {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            }
        };
        audioElement.ontimeupdate = () => {
            updateProgress();
            updateSubtitles();
        };
        
        console.log('Starting audio playback...');
        
        // Wait for audio to be ready before playing, especially important for TTS after silence
        const attemptPlay = () => {
            // Final check: ensure currentTime is 0 before playing
            if (audioElement.currentTime !== 0) {
                console.log(`🔧 Final correction: setting currentTime from ${audioElement.currentTime} to 0`);
                audioElement.currentTime = 0;
            }
            
            console.log(`🎯 About to play segment ${currentSegmentIndex + 1} at currentTime: ${audioElement.currentTime}`);
            
            if (currentSegmentUrl.startsWith('blob:')) {
                // For TTS segments, wait a bit longer to ensure they're fully loaded
                console.log('TTS segment - waiting for proper load before play');
                const extraDelay = isAfterSilence ? 250 : 150; // Extra delay if after silence
                console.log(`Using ${extraDelay}ms delay for TTS segment ${isAfterSilence ? '(after silence)' : ''}`);
                setTimeout(() => {
                    console.log(`▶️ Playing TTS segment ${currentSegmentIndex + 1} with currentTime: ${audioElement.currentTime}`);
                    audioElement.play().catch(e => {
                        console.error('Error playing TTS audio:', e);
                        handlePlaybackError(e);
                    });
                }, extraDelay);
            } else {
                // Static files can play immediately
                console.log(`▶️ Playing static segment ${currentSegmentIndex + 1} with currentTime: ${audioElement.currentTime}`);
                audioElement.play().catch(e => {
                    console.error('Error playing static audio:', e);
                    handlePlaybackError(e);
                });
            }
        };
        
        // Helper function to handle playback errors
        const handlePlaybackError = (error) => {
            console.log('Retrying audio playback in 1 second...');
            setTimeout(() => {
                audioElement.play().catch(retryError => {
                    console.error('Retry failed, skipping segment:', retryError);
                    currentSegmentIndex++;
                    if (currentSegmentIndex < audioSegments.length) {
                        playNextSegment();
                    } else {
                        showAudioError();
                    }
                });
            }, 1000);
        };
        
        attemptPlay();
    }

    // Play/pause toggle for the current segment
    function togglePlayPause() {
        // Check if audio session is ready
        if (!audioSessionReady) {
            console.log('⏳ Audio session still preparing - please wait');
            return;
        }
        
        if (!audioElement) {
            // First time playing - ensure complete reset and start from the beginning
            console.log('🎬 Starting audio session from the very beginning');
            
            // Force reset all state variables
            currentSegmentIndex = 0;
            cumulativeTime = 0;
            segmentStartTime = 0;
            currentSessionTime = 0;
            globalStartTime = 0;
            isPlaying = false;
            
            console.log('✅ All timing variables reset to 0 before starting');
            playNextSegment();
            return;
        }
        
        if (isPlaying) {
            audioElement.pause();
            if (playIcon && pauseIcon) {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            }
        } else {
            audioElement.play().catch(e => {
                console.error('Error playing audio:', e);
                showAudioError();
            });
            if (playIcon && pauseIcon) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
            }
        }
        isPlaying = !isPlaying;
    }

    function toggleSubtitles() {
        showSubtitles = !showSubtitles;
        subtitlesBtn.classList.toggle('active', showSubtitles);
        subtitlesContainer.classList.toggle('visible', showSubtitles);
        if (!showSubtitles) {
            // When disabling subtitles, clear the text and ensure container is hidden
            subtitlesText.textContent = '';
        } else {
            // When enabling subtitles, immediately update to show current subtitle
            updateSubtitles();
        }
    }

    function toggleBlackout() {
        blackoutMode = !blackoutMode;
        blackoutBtn.classList.toggle('active', blackoutMode);
        audioContainer.classList.toggle('blackout', blackoutMode);
        // Add class to body for CSS fallback (browsers without :has() support)
        document.body.classList.toggle('blackout-mode-active', blackoutMode);
    }

    function updateProgress() {
        if (audioElement && audioElement.duration && !isNaN(audioElement.duration) && !isNaN(audioElement.currentTime)) {
            // Calculate current position in overall session
            currentSessionTime = cumulativeTime + audioElement.currentTime;
            
            // Show remaining time for entire session
            const totalRemainingTime = totalSessionDuration - currentSessionTime;
            
            if (totalRemainingTime >= 0 && !isNaN(totalRemainingTime)) {
                currentTimeDisplay.textContent = formatTime(totalRemainingTime);
            } else {
                currentTimeDisplay.textContent = "0:00";
            }
            
            // Log progress for debugging (only every 5 seconds to reduce spam)
            if (Math.floor(currentSessionTime) % 5 === 0) {
                console.log(`Session progress: ${currentSessionTime.toFixed(1)}s / ${totalSessionDuration}s (${((currentSessionTime / totalSessionDuration) * 100).toFixed(1)}%)`);
            }
        }
    }

    function updateSubtitles() {
        if (!showSubtitles) return;
        if (!audioElement) return;
        
        // Calculate global time across all segments
        const globalTime = segmentStartTime + audioElement.currentTime;
        
        console.log(`Checking subtitles at global time: ${globalTime}s, segment start: ${segmentStartTime}s, current time: ${audioElement.currentTime}s`);
        console.log(`Subtitle timeline has ${subtitleTimeline.length} entries`);
        
        const currentSubtitle = subtitleTimeline.find((subtitle, index) => {
            const nextSubtitle = subtitleTimeline[index + 1];
            return globalTime >= subtitle.time && 
                   (!nextSubtitle || globalTime < nextSubtitle.time);
        });
        
        if (currentSubtitle && currentSubtitle.text !== subtitlesText.textContent) {
            subtitlesText.textContent = currentSubtitle.text;
            console.log(`Subtitle updated at global time ${globalTime}s: "${currentSubtitle.text}"`);
            
            // Check if this is a TTS segment with word-level timing
            const timingData = ttsTimingData.get(currentSubtitle.text);
            if (timingData && timingData.wordTimings) {
                console.log(`Found word-level timing for current subtitle with ${timingData.wordTimings.length} words`);
                
                // For TTS segments, we could implement word-by-word highlighting here
                // This would show each word as it's spoken for perfect synchronization
                enhanceSubtitleWithWordTiming(currentSubtitle.text, timingData.wordTimings, audioElement.currentTime);
            }
        } else if (!currentSubtitle) {
            console.log(`No subtitle found for global time ${globalTime}s`);
        }
    }

    // Enhanced subtitle display with word-level timing
    function enhanceSubtitleWithWordTiming(text, wordTimings, currentSegmentTime) {
        if (!wordTimings || wordTimings.length === 0) return;
        
        // Find the current word being spoken
        const currentWord = wordTimings.find(word => 
            currentSegmentTime >= word.start && currentSegmentTime <= word.end
        );
        
        if (currentWord) {
            console.log(`Currently speaking word: "${currentWord.word}" at ${currentSegmentTime.toFixed(2)}s`);
            
            // We could highlight the current word in the subtitle here
            // For now, just log it for debugging
            
            // Future enhancement: Split text into words and highlight current word
            // const words = text.split(' ');
            // const highlightedHtml = words.map(word => 
            //     word === currentWord.word ? `<span class="current-word">${word}</span>` : word
            // ).join(' ');
            // subtitlesText.innerHTML = highlightedHtml;
        }
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds) || seconds < 0) {
            return "Get Ready";
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        if (isNaN(minutes) || isNaN(remainingSeconds)) {
            return "Get Ready";
        }
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    var sessionSaved = false;
    function showSessionComplete() {
        if (sessionSaved) return;
        sessionSaved = true;
        // Check if sessionComplete element exists (it might have been removed)
        if (sessionComplete) {
            sessionComplete.classList.add('visible');
        }
        
        const now = new Date().toISOString();
        localStorage.setItem('lastSessionCompleted', now);
        localStorage.setItem('sessionCompletedEmotion', userEmotion || 'neutral');

        // Generate AI summary and save session to database, then redirect
        const userId = localStorage.getItem('clerkUserId');
        if (userId) {
            generateAndSaveSession(userId);
        } else {
            console.warn('No user ID found — session not saved to database');
            setTimeout(() => { window.location.href = 'sharing.html'; }, 3000);
        }
    }

    async function generateAndSaveSession(userId) {
        const emotion = userEmotion || 'neutral';
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        const conversationChoice = localStorage.getItem('conversationChoice');

        // Collect all available user context for the AI
        let contextParts = ['Emotion: ' + emotion];
        if (localStorage.getItem('userStressScale')) {
            contextParts.push('Stress level: ' + localStorage.getItem('userStressScale') + '/5');
        }
        if (conversationChoice === 'yes' && chatHistory.length > 0) {
            // Extract user messages from conversation as context
            const userMessages = chatHistory
                .filter(function(m) { return m.sender === 'user'; })
                .map(function(m) { return m.message; })
                .join('. ');
            if (userMessages) contextParts.push('User said: ' + userMessages.substring(0, 500));
        }

        // Default values from localStorage (may be empty)
        var sessionRecord = {
            body_sensations: '',
            thoughts: '',
            impulses: '',
            needs: ''
        };

        // Call AI to generate one word per dimension
        try {
            var aiResponse = await fetch('https://dku2r8qi.us-east.insforge.app/api/ai/chat/completion', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + INSFORGE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-4o-mini',
                    messages: [{
                        role: 'system',
                        content: 'You are a mindfulness therapist. Based on user session data, produce exactly ONE word for each of 5 dimensions. Return ONLY valid JSON: {"feeling":"word","body_sensation":"word","thought":"word","impulse":"word","need":"word"}'
                    }, {
                        role: 'user',
                        content: contextParts.join('. ') + '. Summarize this session into exactly one word per dimension. Examples: feeling=anxious, body_sensation=tightness, thought=failure, impulse=withdraw, need=safety. ONE word each, lowercase.'
                    }]
                })
            });
            if (aiResponse.ok) {
                var aiData = await aiResponse.json();
                var text = aiData.text || (aiData.choices && aiData.choices[0] && aiData.choices[0].message && aiData.choices[0].message.content) || '';
                var jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    var insights = JSON.parse(jsonMatch[0]);
                    console.log('AI session summary:', insights);
                    if (insights.feeling) sessionRecord.feeling = insights.feeling;
                    if (insights.body_sensation) sessionRecord.body_sensations = insights.body_sensation;
                    if (insights.thought) sessionRecord.thoughts = insights.thought;
                    if (insights.impulse) sessionRecord.impulses = insights.impulse;
                    if (insights.need) sessionRecord.needs = insights.need;
                }
            }
        } catch (e) {
            console.warn('AI summary failed, saving with emotion only:', e);
        }

        // Read rich extracted data from conversation (set by app.js during HCB flow)
        var extractedBodySensations = JSON.parse(localStorage.getItem('bodySensations') || '[]');
        var extractedThoughts = JSON.parse(localStorage.getItem('userThoughts') || '[]');
        var extractedImpulses = JSON.parse(localStorage.getItem('userImpulses') || '[]');
        var extractedNeeds = JSON.parse(localStorage.getItem('userNeed') || '[]');
        var selectedStressLevel = localStorage.getItem('userStressScale') || localStorage.getItem('stressLevel') || '0';

        // Save to database — prefer rich extracted phrases, fall back to AI one-word summaries
        saveSessionToDb({
            user_id: userId,
            emotion: sessionRecord.feeling || emotion,
            stress_level: parseInt(selectedStressLevel, 10),
            character_name: (localStorage.getItem('selectedCharacterName') || localStorage.getItem('selectedCharacter') || '').replace(/^\w/, function(c) { return c.toUpperCase(); }) || null,
            voice: localStorage.getItem('selectedVoice') || null,
            conversation_mode: conversationChoice === 'yes',
            body_sensations: extractedBodySensations.length > 0 ? extractedBodySensations : (sessionRecord.body_sensations ? [sessionRecord.body_sensations] : []),
            thoughts: extractedThoughts.length > 0 ? extractedThoughts : (sessionRecord.thoughts ? [sessionRecord.thoughts] : []),
            impulses: extractedImpulses.length > 0 ? extractedImpulses : (sessionRecord.impulses ? [sessionRecord.impulses] : []),
            needs: extractedNeeds.length > 0 ? extractedNeeds : (sessionRecord.needs ? [sessionRecord.needs] : []),
            line_a: localStorage.getItem('lineA') || null,
            line_b: localStorage.getItem('lineB') || null
        });

        // Redirect to sharing page after 3 seconds
        setTimeout(function() { window.location.href = 'sharing.html'; }, 3000);
    }

    function showAudioError() {
        console.error('Audio not available. Starting text-based meditation...');
        currentTimeDisplay.textContent = 'Error';
        showTextBasedMeditation();
    }

    function showLoadingState(message) {
        console.log('Loading:', message);
        if (currentTimeDisplay) {
            // Keep text hidden during loading
            currentTimeDisplay.style.display = 'none';
        }
        const audioPlayer = document.querySelector('.audio-player');
        if (audioPlayer) {
            audioPlayer.classList.add('loading');
        }
        audioContainer.classList.add('loading');
    }

    function hideLoadingState() {
        console.log('Loading complete');
        const audioPlayer = document.querySelector('.audio-player');
        if (audioPlayer) {
            audioPlayer.classList.remove('loading');
        }
        audioContainer.classList.remove('loading');
        // Don't set "Get Ready" - let the duration show when available
    }

    function showMessage(message) {
        console.log('Message:', message);
        console.warn('Audio Issue:', message);
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = 'Error';
        }
    }

    // Loading video control functions - show video on ALL devices
    function showLoadingVideo() {
        if (loadingVideo && loadingCanvas && countdownTimer) {
            // Hide the text
            countdownTimer.classList.add('loading');
            
            console.log('=== LOADING VIDEO DEBUG START ===');
            console.log('Elements found:');
            console.log('- loadingVideo:', loadingVideo ? 'YES' : 'NO');
            console.log('- loadingCanvas:', loadingCanvas ? 'YES' : 'NO');
            console.log('- loadingFallback:', loadingFallback ? 'YES' : 'NO');
            
            // Enhanced mobile/tablet detection
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent) || 
                             ('ontouchstart' in window) || 
                             (navigator.maxTouchPoints > 0) || 
                             (window.innerWidth <= 768);
            console.log('Device type:', isMobile ? 'Mobile/Tablet' : 'Desktop');
            console.log('Screen width:', window.innerWidth + 'px');
            console.log('Touch support:', 'ontouchstart' in window ? 'Yes' : 'No');
            console.log('User agent:', navigator.userAgent);
            
            // Different approaches for mobile vs desktop
            if (isMobile) {
                console.log('🔧 Using direct video approach for mobile/tablet');
                tryMobileDirectVideo();
            } else {
                console.log('🖥️ Using canvas approach for desktop');
                tryDesktopCanvasVideo();
            }
        } else {
            console.log('❌ Missing elements for loading video');
            showVideoFallback();
        }
    }

    function tryMobileDirectVideo() {
        console.log('📱 Setting up improved mobile video display...');
        
        if (!loadingVideo) {
            console.error('📱 Loading video element not found for mobile!');
            showVideoFallback();
            return;
        }
        
        // Hide other display methods first to prevent overlapping
        if (loadingCanvas) {
            loadingCanvas.style.display = 'none';
        }
        if (loadingFallback) {
            loadingFallback.style.display = 'none';
        }
        
        // Ensure video is properly loaded first
        if (loadingVideo.readyState < 2) {
            console.log('📱 Video not ready, waiting for load...');
            
            const onVideoReady = () => {
                console.log('📱 Video ready, proceeding with mobile setup');
                setupMobileVideo();
            };
            
            loadingVideo.addEventListener('loadeddata', onVideoReady, { once: true });
            loadingVideo.addEventListener('canplay', onVideoReady, { once: true });
            
            // Force load and fallback timeout
            loadingVideo.load();
            setTimeout(() => {
                if (loadingVideo.readyState < 2) {
                    console.warn('📱 Video load timeout, showing fallback');
                    showVideoFallback();
                }
            }, 3000);
            return;
        }
        
        setupMobileVideo();
        
        function setupMobileVideo() {
            console.log('📱 Configuring mobile video for optimal display...');
            
            // Apply mobile-optimized attributes
            loadingVideo.setAttribute('playsinline', 'true');
            loadingVideo.setAttribute('webkit-playsinline', 'true');
            loadingVideo.muted = true;
            loadingVideo.defaultMuted = true;
            loadingVideo.autoplay = true;
            loadingVideo.loop = true;
            
            // Enhanced mobile styling with better transparency and performance
            Object.assign(loadingVideo.style, {
                display: 'block',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                opacity: '0.85', // Slightly reduced for better visibility
                zIndex: '10',
                objectFit: 'cover',
                // Improved mobile transparency effects
                mixBlendMode: 'screen',
                filter: 'contrast(1.4) brightness(1.15) saturate(1.1)',
                background: 'transparent',
                // Hardware acceleration for smoother playback
                WebkitTransform: 'translate3d(-50%, -50%, 0)',
                WebkitBackfaceVisibility: 'hidden',
                WebkitPerspective: '1000px'
            });
            
            let videoPlaySuccess = false;
            
            const onPlaySuccess = () => {
                if (videoPlaySuccess) return;
                videoPlaySuccess = true;
                console.log('✅ Mobile video playing successfully with transparency');
                
                // Hide timer text since video is visible
                if (currentTimeDisplay) {
                    currentTimeDisplay.style.opacity = '0';
                    currentTimeDisplay.style.transition = 'opacity 0.3s ease';
                }
            };
            
            const onPlayError = (error) => {
                console.error('❌ Mobile video play failed:', error);
                loadingVideo.style.display = 'none';
                showVideoFallback();
            };
            
            // Add optimized event listeners
            loadingVideo.addEventListener('play', onPlaySuccess, { once: true });
            loadingVideo.addEventListener('playing', onPlaySuccess, { once: true });
            loadingVideo.addEventListener('error', onPlayError);
            
            // Try to play with promise handling
            const playPromise = loadingVideo.play();
            
            if (playPromise && typeof playPromise.then === 'function') {
                playPromise
                    .then(onPlaySuccess)
                    .catch(onPlayError);
            } else {
                // Legacy browser fallback
                setTimeout(() => {
                    if (loadingVideo.paused) {
                        onPlayError('Video not playing after attempt');
                    } else {
                        onPlaySuccess();
                    }
                }, 500);
            }
            
            // Safety timeout
            setTimeout(() => {
                if (!videoPlaySuccess && loadingVideo.paused) {
                    console.warn('⏰ Mobile video timeout - using fallback');
                    onPlayError('Timeout');
                }
            }, 4000);
        }
    }

    function tryDesktopCanvasVideo() {
        console.log('🖥️ Setting up canvas video for desktop...');
        
        // Apply video attributes
        loadingVideo.setAttribute('playsinline', 'true');
        loadingVideo.setAttribute('webkit-playsinline', 'true');
        loadingVideo.muted = true;
        loadingVideo.defaultMuted = true;
        loadingVideo.autoplay = true;
        console.log('Applied video optimizations for desktop');
        
        // Make video invisible but loaded for canvas source
        loadingVideo.style.display = 'block';
        loadingVideo.style.opacity = '0';
        loadingVideo.style.position = 'absolute';
        loadingVideo.style.pointerEvents = 'none';
        loadingVideo.style.zIndex = '-1';
        loadingVideo.style.visibility = 'hidden';
        
        let videoReady = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        const onVideoReady = () => {
            if (videoReady) return;
            videoReady = true;
            
            console.log('✅ Desktop video ready for canvas');
            console.log('Video dimensions:', loadingVideo.videoWidth, 'x', loadingVideo.videoHeight);
            
            // Setup canvas with video dimensions
            loadingCanvas.width = loadingVideo.videoWidth || 200;
            loadingCanvas.height = loadingVideo.videoHeight || 200;
            loadingCanvas.style.display = 'block';
            loadingCanvas.style.opacity = '0.9';
            
            console.log('Canvas configured:', loadingCanvas.width, 'x', loadingCanvas.height);
            
            // Start canvas animation
            startCanvasAnimation();
            console.log('✅ Canvas animation started');
        };
        
        const onVideoError = (error) => {
            console.warn('❌ Desktop video failed (attempt ' + (attempts + 1) + '):', error);
            
            attempts++;
            if (attempts < maxAttempts) {
                console.log('🔄 Retrying desktop video...');
                setTimeout(() => {
                    loadingVideo.load();
                    attemptPlay();
                }, 1000);
                return;
            }
            
            console.log('❌ All desktop video attempts failed, using CSS fallback');
            loadingVideo.style.display = 'none';
            showVideoFallback();
        };
        
        const attemptPlay = () => {
            console.log('🎬 Attempting to play desktop video...');
            const playPromise = loadingVideo.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('✅ Desktop video playing successfully');
                        setTimeout(onVideoReady, 200);
                    })
                    .catch(onVideoError);
            } else {
                setTimeout(() => {
                    if (loadingVideo.readyState >= 2) {
                        onVideoReady();
                    } else {
                        onVideoError('Video not ready after timeout');
                    }
                }, 1500);
            }
        };
        
        // Add event listeners
        loadingVideo.addEventListener('loadedmetadata', () => {
            console.log('📊 Desktop video metadata loaded');
            if (!videoReady && loadingVideo.readyState >= 1) {
                onVideoReady();
            }
        });
        
        loadingVideo.addEventListener('canplay', () => {
            console.log('▶️ Desktop video can play');
            if (!videoReady) {
                onVideoReady();
            }
        });
        
        loadingVideo.addEventListener('error', onVideoError);
        
        // Start the process
        console.log('🚀 Loading desktop video...');
        loadingVideo.load();
        setTimeout(attemptPlay, 300);
        
        // Timeout fallback
        setTimeout(() => {
            if (!videoReady) {
                console.log('⏰ Desktop video timeout - falling back to CSS');
                onVideoError('Timeout after 8 seconds');
            }
        }, 8000);
    }

    function hideLoadingVideo() {
                let attempts = 0;
                const maxAttempts = 3;
                
                const onVideoReady = () => {
                    if (videoReady) return;
                    videoReady = true;
                    
                    console.log('✅ Video ready for canvas');
                    console.log('Video dimensions:', loadingVideo.videoWidth, 'x', loadingVideo.videoHeight);
                    console.log('Video readyState:', loadingVideo.readyState);
                    
                    // Setup canvas with video dimensions
                    loadingCanvas.width = loadingVideo.videoWidth || 200;
                    loadingCanvas.height = loadingVideo.videoHeight || 200;
                    loadingCanvas.style.display = 'block';
                    loadingCanvas.style.opacity = '0.9';
                    
                    console.log('Canvas configured:', loadingCanvas.width, 'x', loadingCanvas.height);
                    
                    // Start canvas animation
                    startCanvasAnimation();
                    console.log('✅ Canvas animation started');
                };
                
                const onVideoError = (error) => {
                    console.warn('❌ Video failed (attempt ' + (attempts + 1) + '):', error);
                    console.warn('Video error details:', {
                        networkState: loadingVideo.networkState,
                        readyState: loadingVideo.readyState,
                        error: loadingVideo.error
                    });
                    
                    attempts++;
                    if (attempts < maxAttempts) {
                        console.log('🔄 Retrying video...');
                        setTimeout(() => {
                            loadingVideo.load();
                            attemptPlay();
                        }, 1000);
                        return;
                    }
                    
                    console.log('❌ All video attempts failed, using CSS fallback as last resort');
                    loadingVideo.style.display = 'none';
                    showVideoFallback();
                };
                
                const attemptPlay = () => {
                    console.log('🎬 Attempting to play video...');
                    const playPromise = loadingVideo.play();
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                console.log('✅ Video playing successfully');
                                setTimeout(onVideoReady, 200);
                            })
                            .catch((error) => {
                                console.log('❌ Play promise rejected:', error);
                                onVideoError(error);
                            });
                    } else {
                        console.log('⚠️ Browser doesn\'t support play promise, using fallback method');
                        setTimeout(() => {
                            if (loadingVideo.readyState >= 2) {
                                onVideoReady();
                            } else {
                                onVideoError('Video not ready after timeout');
                            }
                        }, 1500);
                    }
                };
                
                // Add event listeners with logging
                loadingVideo.addEventListener('loadedmetadata', () => {
                    console.log('📊 Video metadata loaded');
                    if (!videoReady && loadingVideo.readyState >= 1) {
                        onVideoReady();
                    }
                });
                
                loadingVideo.addEventListener('loadeddata', () => {
                    console.log('📊 Video data loaded');
                    if (!videoReady && loadingVideo.readyState >= 2) {
                        onVideoReady();
                    }
                });
                
                loadingVideo.addEventListener('canplay', () => {
                    console.log('▶️ Video can play');
                    if (!videoReady) {
                        onVideoReady();
                    }
                });
                
                loadingVideo.addEventListener('canplaythrough', () => {
                    console.log('▶️ Video can play through');
                    if (!videoReady) {
                        onVideoReady();
                    }
                });
                
                loadingVideo.addEventListener('error', (e) => {
                    console.error('🚨 Video error event:', e);
                    onVideoError(e);
                });
                
                loadingVideo.addEventListener('play', () => {
                    console.log('🎬 Video started playing');
                });
                
                loadingVideo.addEventListener('pause', () => {
                    console.log('⏸️ Video paused');
                });
                
                // Start the process
                console.log('🚀 Loading video...');
                loadingVideo.load();
                
                // Give it a moment then try to play
                setTimeout(attemptPlay, 300);
                
                // Timeout fallback - only if absolutely nothing works
                setTimeout(() => {
                    if (!videoReady) {
                        console.log('⏰ Video timeout after 8 seconds - falling back to CSS');
                        onVideoError('Timeout after 8 seconds');
                    }
                }, 8000);
    }

    function hideLoadingVideo() {
        console.log('🔄 Hiding loading video and showing duration timer...');
        
        // Stop and hide video element completely
        if (loadingVideo) {
            loadingVideo.pause();
            loadingVideo.style.display = 'none !important';
            loadingVideo.style.visibility = 'hidden';
            loadingVideo.style.opacity = '0';
            console.log('✅ Video element hidden');
        }
        
        // Stop canvas animation and hide canvas
        stopCanvasAnimation();
        if (loadingCanvas) {
            loadingCanvas.style.display = 'none !important';
            loadingCanvas.style.visibility = 'hidden';
            loadingCanvas.style.opacity = '0';
            console.log('✅ Canvas element hidden');
        }
        
        // Hide fallback spinner
        hideVideoFallback();
        
        // Remove loading class to show countdown text
        if (countdownTimer) {
            countdownTimer.classList.remove('loading');
            console.log('✅ Loading class removed from timer');
        }
        
        // Show the duration display when loading is complete
        if (currentTimeDisplay && totalSessionDuration > 0) {
            currentTimeDisplay.style.display = 'block';
            currentTimeDisplay.style.visibility = 'visible';
            currentTimeDisplay.style.opacity = '1';
            currentTimeDisplay.style.transition = 'opacity 0.3s ease';
            currentTimeDisplay.textContent = formatTime(totalSessionDuration);
            console.log('✅ Duration timer shown:', formatTime(totalSessionDuration));
        }
        
        console.log('🎯 Loading video hide complete - duration should now be visible');
    }

    // Canvas animation for transparent video with black removal
    let canvasAnimationId = null;
    
    function startCanvasAnimation() {
        if (!loadingCanvas || !loadingVideo) {
            console.log('❌ Cannot start canvas animation - missing elements');
            console.log('loadingCanvas:', loadingCanvas ? 'OK' : 'MISSING');
            console.log('loadingVideo:', loadingVideo ? 'OK' : 'MISSING');
            return;
        }
        
        console.log('🎨 Starting canvas animation...');
        const ctx = loadingCanvas.getContext('2d');
        
        if (!ctx) {
            console.error('❌ Could not get canvas 2D context');
            return;
        }
        
        let frameCount = 0;
        
        function drawFrame() {
            frameCount++;
            if (frameCount % 30 === 0) { // Log every 30 frames
                console.log(`🖼️ Drawing frame ${frameCount}, video readyState: ${loadingVideo.readyState}`);
            }
            
            // Clear canvas with transparent background
            ctx.clearRect(0, 0, loadingCanvas.width, loadingCanvas.height);
            
            // Draw video frame if available
            if (loadingVideo.readyState >= loadingVideo.HAVE_CURRENT_DATA) {
                try {
                    ctx.drawImage(loadingVideo, 0, 0, loadingCanvas.width, loadingCanvas.height);
                    
                    // Remove black background by processing pixels
                    removeBlackBackground(ctx, loadingCanvas.width, loadingCanvas.height);
                    
                    if (frameCount === 1) {
                        console.log('✅ First frame drawn and processed successfully');
                    }
                } catch (error) {
                    console.error('❌ Error drawing video frame:', error);
                }
            } else {
                if (frameCount <= 10) { // Only log first few attempts
                    console.log('⏳ Video not ready yet, readyState:', loadingVideo.readyState);
                }
            }
            
            canvasAnimationId = requestAnimationFrame(drawFrame);
        }
        
        drawFrame();
        console.log('🎨 Canvas animation loop started');
    }
    
    function removeBlackBackground(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];     // Red
            const g = data[i + 1]; // Green
            const b = data[i + 2]; // Blue
            const a = data[i + 3]; // Alpha
            
            // If pixel is very dark (close to black), make it transparent
            const brightness = (r + g + b) / 3;
            if (brightness < 30) { // Threshold for "black" pixels
                data[i + 3] = 0; // Set alpha to 0 (transparent)
            }
            // If pixel is slightly dark, reduce its opacity
            else if (brightness < 60) {
                data[i + 3] = Math.max(0, a - (60 - brightness) * 2);
            }
        }
        
        // Put the processed image data back
        ctx.putImageData(imageData, 0, 0);
    }
    
    function stopCanvasAnimation() {
        if (canvasAnimationId) {
            cancelAnimationFrame(canvasAnimationId);
            canvasAnimationId = null;
        }
    }

    // Improved fallback CSS animation if video fails to load/play
    function showVideoFallback() {
        console.log('=== SHOWING IMPROVED CSS FALLBACK ===');
        console.log('loadingFallback element:', loadingFallback ? 'EXISTS' : 'MISSING');
        
        // Hide video elements first to prevent overlapping
        if (loadingVideo) {
            loadingVideo.style.display = 'none';
            loadingVideo.pause(); // Stop any playing video
            console.log('Hidden and paused video element');
        }
        if (loadingCanvas) {
            loadingCanvas.style.display = 'none';
            console.log('Hidden canvas element');
        }
        
        if (loadingFallback) {
            // Enhanced fallback spinner styling for better visibility
            Object.assign(loadingFallback.style, {
                display: 'block',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80px',
                height: '80px',
                opacity: '0.9',
                zIndex: '15', // Higher than other elements
                border: '4px solid rgba(255, 255, 255, 0.3)',
                borderTop: '4px solid rgba(255, 255, 255, 0.9)',
                borderRadius: '50%',
                animation: 'spin 1.2s linear infinite'
            });
            
            // Hide timer text to avoid confusion
            if (currentTimeDisplay) {
                currentTimeDisplay.style.opacity = '0.3'; // Keep slightly visible for countdown
                currentTimeDisplay.style.transition = 'opacity 0.3s ease';
            }
            
            console.log('✅ Enhanced CSS fallback spinner configured and visible');
        } else {
            console.error('❌ loadingFallback element not found!');
            
            // Create a temporary fallback if element is missing
            const tempSpinner = document.createElement('div');
            tempSpinner.className = 'temp-loading-spinner';
            Object.assign(tempSpinner.style, {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80px',
                height: '80px',
                border: '4px solid rgba(255, 255, 255, 0.3)',
                borderTop: '4px solid white',
                borderRadius: '50%',
                animation: 'spin 1.2s linear infinite',
                zIndex: '15'
            });
            
            const countdownContainer = document.querySelector('.countdown-timer');
            if (countdownContainer) {
                countdownContainer.appendChild(tempSpinner);
                console.log('✅ Created temporary fallback spinner');
            }
        }
        
        console.log('=== ENHANCED CSS FALLBACK SETUP COMPLETE ===');
    }

    function hideVideoFallback() {
        // Hide CSS fallback spinner
        if (loadingFallback) {
            loadingFallback.style.display = 'none';
            loadingFallback.style.visibility = 'hidden';
            loadingFallback.style.opacity = '0';
        }
        
        // Also remove any temporary spinners that might have been created
        const tempSpinners = document.querySelectorAll('.temp-loading-spinner');
        tempSpinners.forEach(spinner => {
            spinner.remove();
        });
        
        console.log('✅ Video fallback elements hidden');
    }

    // Function to get duration estimates for text content
    async function getDurationEstimates(texts) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/estimate-duration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts })
            });
            const data = await response.json();
            return data.durations || [];
        } catch (error) {
            console.error('Error getting duration estimates:', error);
            // Fallback to simple estimation: ~150 words per minute
            return texts.map(text => {
                if (!text) return 0;
                const words = text.split(' ').length;
                return (words / 150) * 60;
            });
        }
    }

    async function createSubtitleTimeline(sessionType) {
        // Build subtitle timeline: 1 subtitle per audio segment, automatically timed
        const personalizedContent = { lineA, lineB };
        const version = sessionType.duration; // 2 or 3
        
        console.log(`Creating automated subtitle timeline for ${version}-minute version`);
        console.log('Audio segments:', audioSegments.length, 'segments');
        console.log('Segment durations:', segmentDurations);
        console.log('Total session duration:', totalSessionDuration);
        
        if (audioSegments.length === 0) {
            console.error('No audio segments available for subtitle creation!');
            return;
        }
        
        if (segmentDurations.length === 0) {
            console.error('No segment durations available for subtitle timing!');
            return;
        }
        
        // Define subtitle texts for each segment position in the sequence
        let subtitleTexts;
        
        if (version === 2) {
            // 2-MINUTE VERSION - One subtitle per segment (update these texts):
            subtitleTexts = [
                "This is Zenotal Reset. The guidance here is an invitation—feel free to shift, open your eyes, or pause at any time.",           // Segment 0: file1
                "~",
                "Begin by making a definite change in posture so that you are sitting or standing with a sense of wakefulness from the sensitivity, allowing the eyes to close, or letting the gaze soften gently. Step 1, Recognising - What is here right now?",       // Segment 1: file2
                "~",
                personalizedContent.lineA || "Notice your current experience", // Segment 2: Line A (TTS)
                "~",
                "As best we can, there are too many sensations in the body. Bringing interest to whatever you want and simply recognizing and acknowledging what's here.",                      // Segment 3: file3
                "~",                       // Segment 4: file4
                "Now, moving on to step two, Gathering - Collect attention into the sensations of breathing.",                  // Segment 5: file5
                "~",
                "Investigating the breath with curiosity and kindness… Is it deep or shallow, rough or smooth? Tuning into the full duration of the in breath, the out breath, all the sensations are rising and falling away.",                        // Segment 6: file6
                "~",                      // Segment 7: file4 (repeat)
                "If the mind wanders, greet the thought, then gently guide attention back to breath.",                 // Segment 8: file7
                "~",
                "Then, moving into step 3 Expanding - Gently expanding the field of awareness, the body as a whole, body as it sits or stands here, as it breathes, as best you can, softening and opening to your experience to what's here like that.",                     // Segment 9: file8
                "~",
                personalizedContent.lineB || "How are you feeling now?", // Segment 10: Line B (TTS)
                "~",
                "And then, when you're ready, allow the eyes to open if they are closed, bringing these attitudes of awareness and openness to the next few moments of your day.",             // Segment 11: file10
                "~"
                // Add more subtitle texts as needed for your sequence
            ];
        } else {
            // 3-MINUTE VERSION - One subtitle per segment (update these texts):
            subtitleTexts = [
                "This is Zenotal Reset. The guidance here is an invitation—feel free to shift, open your eyes, or pause at any time. Pausing in difficulty—thank you for your courage.",          // Segment 0: file1
                "~",
                "Begin by making a definite change in posture so that you are sitting or standing with a sense of wakefulness from the sensitivity, allowing the eyes to close, alone, suffering the gaze gently. Step 1, Recognising - What is here right now?",      // Segment 1: file2
                "~",
                personalizedContent.lineA || "Notice your current experience", // Segment 2: Line A (TTS)
                "~",
                "As best we can, there are too many sensations in the body. Bringing interest to whatever you want and simply recognizing and acknowledging what's here.",           // Segment 3: file3
                "~",                      // Segment 4: file4
                "Now, moving on to step two, Gathering – Collect attention into the sensations of breathing.",                 // Segment 5: file5
                "~",
                "Investigating the breath with curiosity and kindness… Is it deep or shallow, rough or smooth? Tuning into the full duration of the in breath, the out breath, all the sensations are rising and falling away.",              // Segment 6: file6
                "~",                     // Segment 7: file4 (repeat)
                "You may want to gently count each in-breath up to five, then begin again.",                // Segment 8: file7
                "~",                  // Segment 9: file4 (repeat)
                "Then, moving into step 3 Expanding - Gently expanding the field of awareness, the body as a whole, body as it sits or stands here, as it breathes, as best you can, softening and opening to your experience to what's here like that.",                  // Segment 10: file8
                "Where you notice tension, imagine breathing warmth into that spot, letting resistance melt by one degree.",          // Segment 11: file9
                "~", 
                personalizedContent.lineB || "How are you feeling now?", // Segment 12: Line B (TTS)
                "~", 
                "Offer yourself a silent phrase - 'May I meet this moment with kindness' — carrying that compassion into whatever comes next.",                  // Segment 13: file11
                "~",           // Segment 14: file12
                "And then, when you're ready, allow the eyes to open if they are closed, bringing these attitudes of awareness and openness to the next few moments of your day.",            // Segment 15: file10
                "~"
                // Add more subtitle texts as needed for your sequence
            ];
        }
        
        // Generate timeline: each segment gets one subtitle at its start time
        subtitleTimeline = [];
        let cumulativeTime = 0;
        
        for (let i = 0; i < audioSegments.length && i < subtitleTexts.length; i++) {
            const segmentDuration = segmentDurations[i] || 0;
            const subtitleText = subtitleTexts[i] || `Segment ${i + 1}`;
            
            subtitleTimeline.push({
                time: cumulativeTime,
                text: subtitleText
            });
            
            cumulativeTime += segmentDuration;
        }
        
        // Sort by time to ensure proper order (should already be sorted)
        subtitleTimeline.sort((a, b) => a.time - b.time);
        
        console.log(`Subtitle timeline created: ${subtitleTimeline.length} subtitles for ${audioSegments.length} segments`);
        console.log('Timeline:', subtitleTimeline.map(s => `${s.time}s: ${s.text}`));
    }

    function showTextBasedMeditation() {
        // Fallback to text-based meditation if audio fails
        let textIndex = 0;
        const textMeditation = [
            "Welcome to your meditation session.",
            "Find a comfortable position and close your eyes.",
            "Take a deep breath in... and slowly exhale.",
            "Notice your breathing, without trying to change it.",
            "If your mind wanders, gently return to your breath.",
            "Feel your body relaxing with each exhale.",
            "You are safe, you are calm, you are present.",
            "Continue breathing mindfully...",
            "When you're ready, slowly open your eyes.",
            "Take a moment to notice how you feel."
        ];
        subtitlesContainer.classList.add('visible');
        showSubtitles = true;
        function showNextText() {
            if (textIndex < textMeditation.length) {
                subtitlesText.textContent = textMeditation[textIndex];
                textIndex++;
                setTimeout(showNextText, 15000);
            } else {
                setTimeout(showSessionComplete, 3000);
            }
        }
        showNextText();
    }

    function setupControlEventListeners() {
        playPauseBtn && playPauseBtn.addEventListener('click', togglePlayPause);
        subtitlesBtn && subtitlesBtn.addEventListener('click', toggleSubtitles);
        blackoutBtn && blackoutBtn.addEventListener('click', toggleBlackout);
        finishBtn && finishBtn.addEventListener('click', finishSession);
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && playPauseBtn) {
                e.preventDefault();
                togglePlayPause();
            }
            // Debug: Skip to next segment with 'n' key (for testing)
            if (e.key === 'n' && audioElement) {
                console.log('🔧 Debug: Manually skipping to next segment');
                currentSegmentIndex++;
                if (currentSegmentIndex < audioSegments.length) {
                    playNextSegment();
                } else {
                    showSessionComplete();
                }
            }
            // Debug: Reset to beginning with 'r' key (for testing)
            if (e.key === 'r') {
                console.log('🔧 Debug: Resetting session to beginning');
                if (audioElement) {
                    audioElement.pause();
                    audioElement = null;
                }
                currentSegmentIndex = 0;
                cumulativeTime = 0;
                segmentStartTime = 0;
                currentSessionTime = 0;
                isPlaying = false;
                if (playIcon && pauseIcon) {
                    playIcon.style.display = 'block';
                    pauseIcon.style.display = 'none';
                }
            }
        });
    }

    function setupAudioEventListeners() {
        // This function sets up audio-specific event listeners
        // Currently handled in playNextSegment(), but can be expanded here
        console.log('Audio event listeners set up');
    }

    function finishSession() {
        // Keep session completion data for sharing page
        // localStorage.removeItem('conversationChoice');
        // localStorage.removeItem('chatHistory');
        window.location.href = 'sharing.html';
    }

    // Utility
    function base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    // Initial UI state
    audioContainer && audioContainer.classList.add('loading');
    subtitlesContainer && subtitlesContainer.classList.remove('visible');
    
    // Add initial-load class for the fade-in animation, remove it after animation completes
    if (audioContainer) {
        audioContainer.classList.add('initial-load');
        // Remove the class after animation completes (1 second) to prevent it from running again
        setTimeout(() => {
            audioContainer.classList.remove('initial-load');
        }, 1100); // Slightly longer than animation duration
    }
});