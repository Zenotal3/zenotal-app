// js/tts.js

// Global variable to track current TTS audio
let currentTTSAudio = null;

// Function to stop current TTS audio - make it globally available
window.stopCurrentTTS = function stopCurrentTTS() {
    if (currentTTSAudio) {
        console.log('Stopping current TTS audio...');
        currentTTSAudio.pause();
        currentTTSAudio.currentTime = 0;
        
        // Clean up the URL object to free memory
        if (currentTTSAudio.src) {
            URL.revokeObjectURL(currentTTSAudio.src);
        }
        
        currentTTSAudio = null;
    }
}

async function speakResponse(text) {
    try {
        // Stop any currently playing TTS audio first
        stopCurrentTTS();
        
        const res = await getTextToSpeech(text);
        
        if (res && res.audioContent) {
            // Decode base64 audio content to a Blob
            const binaryString = atob(res.audioContent);
            const binaryData = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                binaryData[i] = binaryString.charCodeAt(i);
            }

            const audioBlob = new Blob([binaryData], { type: "audio/mp3" });

            // Create a URL for the Blob and play the audio
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            // Store reference to current audio
            currentTTSAudio = audio;
            
            // Add event listener to clean up when audio ends
            audio.addEventListener('ended', () => {
                if (currentTTSAudio === audio) {
                    console.log('TTS audio ended, cleaning up...');
                    URL.revokeObjectURL(audioUrl);
                    currentTTSAudio = null;
                }
            });
            
            // Add error handler
            audio.addEventListener('error', (e) => {
                console.error('TTS audio error:', e);
                if (currentTTSAudio === audio) {
                    URL.revokeObjectURL(audioUrl);
                    currentTTSAudio = null;
                }
            });
            
            audio.play();
            return true;
        } else if (res && res.error) {
            console.error("TTS error:", res.error);
            return false;
        }
    } catch (error) {
        console.error("Error playing audio:", error);
        return false;
    }
}