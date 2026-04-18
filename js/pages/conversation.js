document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const characterSelection = document.getElementById('characterSelection');
    const conversationButtons = document.getElementById('conversationButtons');
    const sarahBtn = document.getElementById('sarahBtn');
    const jeremyBtn = document.getElementById('jeremyBtn');
    const yesBtn = document.getElementById('yesBtn');
    const skipBtn = document.getElementById('skipBtn');
    const characterName = document.getElementById('characterName');
    const speechText = document.getElementById('speechText');
    
    // State
    let selectedCharacter = null;
    let selectedVoice = null;
    
    // Get user data from previous steps
    const userEmotion = localStorage.getItem('userEmotion');
    const emotionIntensity = localStorage.getItem('emotionIntensity');
    const stressLevel = localStorage.getItem('userStressLevel'); // 0-100% from new slider
    const stressScale = localStorage.getItem('userStressScale'); // 1-5 scale for backend
    
    console.log('User data:', { userEmotion, emotionIntensity, stressLevel, stressScale });
    
    // Handle character selection
    sarahBtn.addEventListener('click', () => {
        selectCharacter('sarah', 'female', 'Sarah');
    });
    
    jeremyBtn.addEventListener('click', () => {
        selectCharacter('jeremy', 'male', 'Jeremy');
    });
    
    // Handle Yes button click
    yesBtn.addEventListener('click', () => {
        handleConversationChoice('yes');
    });
    
    // Handle Skip button click
    skipBtn.addEventListener('click', () => {
        handleConversationChoice('skip');
    });
    
    // Function to handle character selection
    function selectCharacter(character, voice, displayName) {
        selectedCharacter = character;
        selectedVoice = voice;
        
        // Store selection in localStorage
        localStorage.setItem('selectedCharacter', character);
        localStorage.setItem('selectedVoice', voice);
        localStorage.setItem('selectedCharacterName', displayName);
        
        console.log('Character selected:', { character, voice, displayName });
        
        // Update UI
        updateToConversationPhase(displayName);
    }
    
    // Function to update UI to conversation phase
    function updateToConversationPhase(characterDisplayName) {
        // Update character name and speech text
        characterName.textContent = characterDisplayName;
        speechText.textContent = 'Want to talk about it for a minute?';
        
        // Hide character selection, show conversation buttons
        characterSelection.style.display = 'none';
        conversationButtons.style.display = 'flex';
    }
    
    // Function to handle conversation choice
    function handleConversationChoice(choice) {
        if (!selectedCharacter) {
            console.error('No character selected');
            return;
        }
        
        // Add loading state
        yesBtn.classList.add('loading');
        skipBtn.classList.add('loading');

        // Save user choice
        localStorage.setItem('conversationChoice', choice);

        console.log(`User chose: ${choice}`);

        // Simulate processing time
        setTimeout(() => {
            if (choice === 'yes') {
                // Navigate to actual conversation interface
                navigateToConversation();
            } else {
                // Navigate to summary or next step
                navigateToSummary();
            }
        }, 500);
    }
    
    // Function to navigate to conversation interface
    function navigateToConversation() {
        console.log('Navigating to conversation interface...');
        
        // Clear any existing chat history to start fresh
        localStorage.removeItem('chatHistory');
        
        // Save that user chose to have the conversation
        localStorage.setItem('conversationChoice', 'yes');
        
        // Start fade transition then navigate to app page
        startFadeTransition(() => {
            window.location.href = 'app.html';
        });
    }
    
    // Function to navigate to summary
    function navigateToSummary() {
        console.log('Navigating to app interface for meditation...');
        
        // Save that user chose to skip
        localStorage.setItem('conversationChoice', 'skip');

        // Bug 1 fix: show a loading overlay immediately so user knows something is happening
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'skip-loading-overlay';
        loadingOverlay.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
            'background:rgba(255,255,255,0.92)', 'z-index:9998',
            'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
            'gap:16px', 'font-family:Outfit,sans-serif'
        ].join(';');
        loadingOverlay.innerHTML = [
            '<div style="width:40px;height:40px;border:3px solid #e0d5cc;border-top-color:#c0533a;',
            'border-radius:50%;animation:zn-spin 0.8s linear infinite"></div>',
            '<p style="color:#888;font-size:14px;margin:0">Preparing your session…</p>',
            '<style>@keyframes zn-spin{to{transform:rotate(360deg)}}</style>'
        ].join('');
        document.body.appendChild(loadingOverlay);

        // Infer body sensations and generate Line A/B, then store in localStorage before redirect
        (async () => {
            const userEmotion = localStorage.getItem('userEmotion');
            // Infer body sensations from map
            let bodySensations = [];
            try {
                const res = await fetch('js/emotion-body-map.json');
                const map = await res.json();
                bodySensations = map[userEmotion] || ['bodily sensation'];
            } catch (e) {
                bodySensations = ['bodily sensation'];
            }

            // Generate Line A
            let lineA = '';
            try {
                const respA = await generateLineA(userEmotion, bodySensations[0]);
                lineA = respA.response || '';
            } catch (e) {
                lineA = 'Notice any tension or sensations you might be feeling right now in your body.';
            }
            localStorage.setItem('lineA', lineA);

            // Generate Line B
            let lineB = '';
            try {
                const respB = await generateLineB(userEmotion, bodySensations[0], [], []);
                lineB = respB.response || '';
            } catch (e) {
                lineB = 'How are you feeling in this moment? What thoughts or feelings are present?';
            }
            localStorage.setItem('lineB', lineB);

            // Now redirect to audio.html after fade transition
            startFadeTransition(() => {
                window.location.href = 'audio.html';
            });
        })();
    }
    
    // Function to start fade to black transition
    function startFadeTransition(callback) {
        // Create fade overlay
        const fadeOverlay = document.createElement('div');
        fadeOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            opacity: 0;
            z-index: 9999;
            transition: opacity 1s ease-in-out;
        `;
        
        document.body.appendChild(fadeOverlay);
        
        // Start fade to black
        setTimeout(() => {
            fadeOverlay.style.opacity = '1';
        }, 50);
        
        // Execute callback after fade completes
        setTimeout(() => {
            if (callback) callback();
        }, 1000);
    }
    
    // Add keyboard support
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            // Default to "Yes" on Enter/Space
            if (!yesBtn.classList.contains('loading')) {
                yesBtn.click();
            }
        } else if (e.key === 'Escape') {
            // Skip on Escape
            if (!skipBtn.classList.contains('loading')) {
                skipBtn.click();
            }
        }
    });
    
    // Add visual feedback for keyboard users
    yesBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            yesBtn.click();
        }
    });
    
    skipBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            skipBtn.click();
        }
    });
    
    // Initialize page
    function initializePage() {
        // Remove loading states if they exist
        yesBtn.classList.remove('loading');
        skipBtn.classList.remove('loading');
        
        // Focus on the Yes button for better accessibility
        yesBtn.focus();
    }
    
    // Initialize when page loads
    initializePage();
});
