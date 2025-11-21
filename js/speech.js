// js/speech.js
class SpeechHandler {
    constructor(onResultCallback, onErrorCallback, onEndCallback) {
        this.recognition = null;
        this.running = false;
        this.onResultCallback = onResultCallback;
        this.onErrorCallback = onErrorCallback;
        this.onEndCallback = onEndCallback;
    }

    async start() {
        if (this.running) {
            console.log("Speech recognition already in progress.");
            return false;
        }

        try {
            // Request microphone permission
            await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Initialize speech recognition
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.recognition.lang = "en-US";
            this.recognition.interimResults = false;
            this.recognition.continuous = false;
            this.running = true;
            
            this.recognition.onresult = (e) => {
                const msg = e.results[0][0].transcript;
                console.log("🗣️ Recognized:", msg);
                if (this.onResultCallback) this.onResultCallback(msg);
            };
            
            this.recognition.onerror = (e) => {
                console.error("❌ Speech recognition error:", e.error);
                if (this.onErrorCallback) this.onErrorCallback(e);
            };
            
            this.recognition.onend = () => {
                console.log("🛑 Speech recognition ended.");
                this.running = false;
                if (this.onEndCallback) this.onEndCallback();
            };
            
            this.recognition.start();
            return true;
        } catch (err) {
            console.error("Microphone permission error:", err);
            this.running = false;
            if (this.onErrorCallback) this.onErrorCallback(err);
            return false;
        }
    }
}