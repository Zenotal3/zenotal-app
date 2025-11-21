document.addEventListener('DOMContentLoaded', () => {
    console.log('=== SHARING PAGE LOADING ===');

    // DOM Elements
    const completionText = document.getElementById('completionText');
    const sessionCard = document.querySelector('.session-card');
    const sharingContainer = document.querySelector('.sharing-container');
    const popupOverlay = document.getElementById('popupOverlay');

    // Popup timing variables
    let backSideTimer = null;
    let popupShown = false;

    // Get session data from localStorage
    const sessionCompletedEmotion = localStorage.getItem('sessionCompletedEmotion') || localStorage.getItem('userEmotion') || 'neutral';
    const lastSessionCompleted = localStorage.getItem('lastSessionCompleted');
    
    console.log('Session data:', {
        emotion: sessionCompletedEmotion,
        completedAt: lastSessionCompleted
    });

    // Define emotions based on the actual emotion-body-map.json
    const positiveEmotions = [
        'joyful', 'content', 'interested', 'proud', 'optimistic', 'amazed'
    ];

    const neutralEmotions = [
        'confused', 'startled', 'perplexed', 'shocked', 'uncertain', 'curious'
    ];

    const negativeEmotions = [
        'stressed', 'busy', 'bored', 'tired', 'overwhelmed', 'apathetic',
        'vulnerable', 'lonely', 'depressed', 'isolated', 'fragile', 'empty',
        'repelled', 'disapproving', 'nauseated', 'appalled', 'revulsed', 'judgmental',
        'frustrated', 'annoyed', 'mad', 'furious', 'jealous', 'irritated',
        'anxious', 'insecure', 'helpless', 'nervous', 'exposed', 'worried'
    ];

    // Initialize the page
    initializeSharingPage();

    function initializeSharingPage() {
        // Set the appropriate completion message
        setCompletionMessage(sessionCompletedEmotion);
        
        // Initialize the current date immediately
        initializeCurrentDate();
        
        // Add click listener for card flip and close button
        setupCardInteraction();
        
        // Setup close button for session card
        setupSessionCardClose();
        
        // Setup download button
        setupDownloadButton();
        
        // Setup popup functionality
        setupPopup();
        
        // Initialize sharing popup functionality
        initializeSharingPopup();
        
        // Remove loading state after initialization
        setTimeout(() => {
            sharingContainer.classList.remove('loading');
        }, 500);
    }

    function initializeCurrentDate() {
        // Set the actual current system date immediately on page load
        const dateElement = document.querySelector('.session-date');
        if (dateElement) {
            const today = new Date();
            const day = today.getDate().toString().padStart(2, '0');
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const year = today.getFullYear();
            const formattedDate = `${day}.${month}.${year}`;
            dateElement.textContent = formattedDate;
            console.log('System date initialized to:', formattedDate);
        }
    }

    function setCompletionMessage(emotion) {
        const emotionLower = emotion.toLowerCase();
        let message;

        console.log('Processing emotion:', emotionLower);
        console.log('Positive emotions:', positiveEmotions);
        console.log('Negative emotions:', negativeEmotions);

        if (positiveEmotions.includes(emotionLower)) {
            message = "Well done nourishing what's already strong.";
            console.log('→ Using POSITIVE message');
        } else if (negativeEmotions.includes(emotionLower)) {
            message = "You did it! That was a reset well earned";
            console.log('→ Using NEGATIVE message');
        } else {
            // Default message for neutral or unrecognized emotions
            message = "You did it! That was a reset well earned";
            console.log('→ Using DEFAULT message (neutral/unknown)');
        }

        completionText.textContent = message;
        
        console.log(`Final result - Emotion: ${emotion} (${emotionLower}) -> Message: ${message}`);
    }

    function setupCardInteraction() {
        if (sessionCard) {
            sessionCard.addEventListener('click', flipCard);

            // Add hover effects
            sessionCard.addEventListener('mouseenter', () => {
                if (!sessionCard.classList.contains('flipped')) {
                    sessionCard.style.transform = 'translateY(-5px) scale(1.02)';
                }
            });

            sessionCard.addEventListener('mouseleave', () => {
                if (!sessionCard.classList.contains('flipped')) {
                    sessionCard.style.transform = 'translateY(0) scale(1)';
                }
            });
        }
    }

    function setupSessionCardClose() {
        const closeButton = document.getElementById('sessionCardClose');
        if (closeButton) {
            closeButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent card flip when clicking close button
                console.log('Session card close button clicked - showing donation popup');
                
                // Show the donation popup directly
                showPopup();
            });
            console.log('Session card close button setup complete - leads to donation popup');
        }
    }

    function flipCard() {
        console.log('Card clicked - flipping card');
        
        // Toggle the flipped state
        if (sessionCard.classList.contains('flipped')) {
            sessionCard.classList.remove('flipped');
            console.log('Flipped back to front side');
        } else {
            sessionCard.classList.add('flipped');
            console.log('Flipped to back side');
            
            // Setup the back side content if not already done
            if (!sessionCard.classList.contains('back-populated')) {
                setupBackSideContent();
                sessionCard.classList.add('back-populated');
            }
            
            // Auto-timer functionality has been removed - user must manually trigger popup
        }
        
        // Remove hover transform when flipped
        sessionCard.style.transform = '';
    }

    function setupBackSideContent() {
        console.log('Setting up back side content');
        
        // Get session data
        const sessionData = getSessionData();
        
        // Update date to current system date (not session date)
        const dateElement = document.querySelector('.session-date');
        if (dateElement) {
            const today = new Date(); // Always use current system date
            // Format as DD.MM.YYYY
            const day = today.getDate().toString().padStart(2, '0');
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const year = today.getFullYear();
            const formattedDate = `${day}.${month}.${year}`;
            dateElement.textContent = formattedDate;
            console.log('Back side date set to current system date:', formattedDate);
        }

        // Update conversation insights
        updateConversationInsights(sessionData);
    }

    function getSessionData() {
        // Debug: check what's actually in localStorage
        console.log('=== DEBUGGING LOCALSTORAGE ===');
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                console.log(`${key}: ${localStorage.getItem(key)}`);
            }
        }
        console.log('===============================');
        
        return {
            emotion: localStorage.getItem('sessionCompletedEmotion') || localStorage.getItem('userEmotion') || 'neutral',
            completedAt: localStorage.getItem('lastSessionCompleted'),
            chatHistory: JSON.parse(localStorage.getItem('chatHistory') || '[]'),
            stressLevel: localStorage.getItem('userStressScale'),
            conversationChoice: localStorage.getItem('conversationChoice'),
            // Get the extracted HCB data - try different possible key names
            bodySensations: JSON.parse(localStorage.getItem('bodySensations') || localStorage.getItem('extractedBodySensations') || '[]'),
            userThoughts: JSON.parse(localStorage.getItem('userThoughts') || localStorage.getItem('extractedThoughts') || '[]'),
            userImpulses: JSON.parse(localStorage.getItem('userImpulses') || localStorage.getItem('extractedImpulses') || '[]'),
            userNeed: JSON.parse(localStorage.getItem('userNeed') || localStorage.getItem('extractedNeed') || '[]')
        };
    }

    function updateConversationInsights(sessionData) {
        console.log('🎴 SHARING CARD - PROCESSING INSIGHTS');
        console.log('📥 Input sessionData:', sessionData);
        console.log('🔍 Checking individual data fields:');
        console.log('  - emotion:', sessionData.emotion);
        console.log('  - bodySensations:', sessionData.bodySensations);
        console.log('  - userThoughts:', sessionData.userThoughts);
        console.log('  - userImpulses:', sessionData.userImpulses);
        console.log('  - userNeed:', sessionData.userNeed);
        
        // Use the actual extracted data from HCB conversation
        const insights = {
            feelings: sessionData.emotion || 'Not specified',
            sensations: Array.isArray(sessionData.bodySensations) && sessionData.bodySensations.length > 0 
                ? sessionData.bodySensations.join(' • ') 
                : 'Body awareness noted',
            thoughts: Array.isArray(sessionData.userThoughts) && sessionData.userThoughts.length > 0 
                ? sessionData.userThoughts.join(' • ') 
                : 'Mental patterns observed',
            impulses: Array.isArray(sessionData.userImpulses) && sessionData.userImpulses.length > 0 
                ? sessionData.userImpulses.join(' • ') 
                : 'Behavioral tendencies noticed',
            needs: Array.isArray(sessionData.userNeed) && sessionData.userNeed.length > 0 
                ? sessionData.userNeed.join(' • ') 
                : 'Personal needs identified'
        };

        console.log('✨ GENERATED INSIGHTS FOR CARD:', insights);
        
        // Update each category
        const categories = ['feelings', 'sensations', 'thoughts', 'impulses', 'needs'];
        categories.forEach(category => {
            const element = document.querySelector(`.insight-${category} .insight-text`);
            if (element && insights[category]) {
                element.textContent = insights[category];
                console.log(`Updated ${category}: ${insights[category]}`);
            }
        });
    }

    function extractInsightsFromChat(chatHistory) {
        // This is a simplified extraction - in a real app you'd use NLP or structured data
        const insights = {
            feelings: "Processed emotions during meditation",
            sensations: "Body awareness and physical responses",
            thoughts: "Mental patterns and reflections",
            impulses: "Behavioral tendencies observed",
            needs: "Personal requirements identified"
        };

        // If we have actual chat data, try to extract real insights
        if (chatHistory && chatHistory.length > 0) {
            // Look for user messages that might contain insights
            const userMessages = chatHistory.filter(msg => msg.sender === 'user');
            
            if (userMessages.length > 0) {
                // Simple keyword-based extraction
                const allText = userMessages.map(msg => msg.message).join(' ').toLowerCase();
                
                if (allText.includes('feel') || allText.includes('emotion')) {
                    insights.feelings = userMessages[0].message.substring(0, 50) + '...';
                }
                
                if (allText.includes('body') || allText.includes('physical')) {
                    insights.sensations = "Physical awareness during session";
                }
                
                if (allText.includes('think') || allText.includes('thought')) {
                    insights.thoughts = "Mental observations from meditation";
                }
            }
        }

        return insights;
    }

    // Future function for navigating to next step
    function proceedToNext() {
        console.log('Proceeding to next step...');
        // This will be implemented when you provide the next step
    }

    // Utility function to clean up session data if needed
    function cleanupSessionData() {
        // Keep essential data but remove temporary session data
        const keysToKeep = [
            'sessionCompletedEmotion',
            'lastSessionCompleted',
            'userEmotion'
        ];
        
        // Remove other temporary session data
        const keysToRemove = [
            'conversationChoice',
            'chatHistory',
            'lineA',
            'lineB',
            'stressLevel',
            'userStressScale'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log('Session data cleaned up');
    }

    // Download functionality
    function setupDownloadButton() {
        const downloadButton = document.getElementById('downloadButton');
        if (downloadButton) {
            downloadButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent card flip
                downloadCard();
            });
            console.log('Download button setup complete');
        }
    }

    async function downloadCard() {
        console.log('Starting card download...');
        
        try {
            // Import html2canvas dynamically
            const html2canvas = await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.js');
            
            // Get the card element
            const cardElement = document.querySelector('.session-card');
            if (!cardElement) {
                console.error('Card element not found');
                return;
            }

            // Temporarily hide the download button for the screenshot
            const downloadBtn = document.getElementById('downloadButton');
            const originalDisplay = downloadBtn.style.display;
            downloadBtn.style.display = 'none';

            // Configure html2canvas options
            const options = {
                backgroundColor: null, // Transparent background
                useCORS: true,
                allowTaint: true,
                scale: 2, // Higher quality
                width: cardElement.offsetWidth,
                height: cardElement.offsetHeight,
                scrollX: 0,
                scrollY: 0
            };

            // Capture the card
            console.log('Capturing card with html2canvas...');
            const canvas = await html2canvas.default(cardElement, options);
            
            // Restore download button
            downloadBtn.style.display = originalDisplay;

            // Create download link
            const link = document.createElement('a');
            const currentDate = new Date();
            const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            const timeString = currentDate.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
            const filename = `mindreset-card-${dateString}-${timeString}.png`;
            
            link.download = filename;
            link.href = canvas.toDataURL('image/png', 1.0);
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('Card downloaded successfully as:', filename);
            
            // Show popup after 2 seconds - DISABLED
            setTimeout(() => {
                 showPopup();
            }, 2000);
            
        } catch (error) {
            console.error('Error downloading card:', error);
            
            // Fallback: show instructions to user
            alert('Download failed. Please try right-clicking on the card and selecting "Save image as..." or take a screenshot.');
        }
    }

    // Popup functionality
    function setupPopup() {
        const popupClose = document.getElementById('popupClose');
        const amountButtons = document.querySelectorAll('.amount-btn');
        const customAmountBtn = document.getElementById('customAmountBtn');
        const confirmBtn = document.getElementById('confirmBtn');
        const maybeLaterBtn = document.getElementById('maybeLaterBtn');
        
        // Close popup when clicking close button or maybe later
        popupClose.addEventListener('click', hidePopup);
        maybeLaterBtn.addEventListener('click', hidePopup);
        
        // Close popup when clicking outside
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) {
                hidePopup();
            }
        });
        
        // Handle amount button selection
        amountButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove selected class from all buttons (including custom amount)
                amountButtons.forEach(b => b.classList.remove('selected'));
                customAmountBtn.classList.remove('selected');
                // Add selected class to clicked button
                btn.classList.add('selected');
                // Enable confirm button
                confirmBtn.classList.add('active');
                
                console.log('Selected amount:', btn.dataset.amount);
            });
        });
        
        // Handle custom amount button selection
        customAmountBtn.addEventListener('click', () => {
            // Remove selected class from all buttons
            amountButtons.forEach(b => b.classList.remove('selected'));
            customAmountBtn.classList.remove('selected');
            // Add selected class to custom button
            customAmountBtn.classList.add('selected');
            // Enable confirm button
            confirmBtn.classList.add('active');
            
            console.log('Selected custom amount option');
        });
        
        // Handle confirm button
        confirmBtn.addEventListener('click', () => {
            const selectedStandardAmount = document.querySelector('.amount-btn.selected');
            const selectedCustomAmount = customAmountBtn.classList.contains('selected');
            
            if (selectedStandardAmount) {
                const amount = selectedStandardAmount.dataset.amount;
                console.log('Confirming donation of $' + amount);
                
                // Define URLs for each donation amount
                const donationUrls = {
                    '3': 'https://buy.stripe.com/00wfZh70Z1O7eKg1sI3wQ00',    // Replace with your $3 donation URL
                    '5': 'https://buy.stripe.com/fZufZh0CB78rby40oE3wQ01',    // Replace with your $5 donation URL
                    '10': 'https://buy.stripe.com/7sY5kD70Z0K36dKfjy3wQ02',  // Replace with your $10 donation URL
                    '50': 'https://buy.stripe.com/fZucN53ONfEX8lSb3i3wQ03'   // Replace with your $50 donation URL
                };
                
                // Get the corresponding URL for the selected amount
                const donationUrl = donationUrls[amount];
                
                if (donationUrl) {
                    // Open the donation page in a new tab
                    window.open(donationUrl, 'payment', 'width=800,height=600,scrollbars=yes,resizable=yes');
                }
            } else if (selectedCustomAmount) {
                console.log('Confirming custom amount donation');
                
                // Custom amount URL
                const customDonationUrl = 'https://buy.stripe.com/6oU7sLetrfEXau03AQ3wQ04';
                
                // Open the custom donation page in a new tab
                window.open(customDonationUrl, 'payment', 'width=800,height=600,scrollbars=yes,resizable=yes');
            }
            
            // Hide the popup and show sharing popup
            hidePopup();
            showSharingPopup();
        });
        
        // Handle maybe later button
        maybeLaterBtn.addEventListener('click', () => {
            console.log('Maybe later clicked');
            hidePopup();
            showSharingPopup();
        });
        
        // Handle close button
        popupClose.addEventListener('click', () => {
            console.log('Popup close clicked');
            hidePopup();
            showSharingPopup();
        });
    }

    function startBackSideTimer() {
        // Auto-timer functionality has been removed
        // Users now need to manually trigger any popups or actions
        console.log('Auto-timer functionality disabled - manual interaction required');
        
        // Clear any existing timer for cleanup
        if (backSideTimer) {
            clearTimeout(backSideTimer);
            backSideTimer = null;
        }
    }

    function showPopup() {
        if (!popupShown) {
            popupShown = true;
            popupOverlay.classList.add('show');
            console.log('Popup shown');
        }
    }

    function hidePopup() {
        popupOverlay.classList.remove('show');
        popupShown = false;
        
        // Clear timer if running
        if (backSideTimer) {
            clearTimeout(backSideTimer);
            backSideTimer = null;
        }
        
        console.log('Popup hidden');
    }

    function initializeSharingPopup() {
        const sharingOverlay = document.getElementById('sharingOverlay');
        const sharingClose = document.getElementById('sharingClose');
        const copyButton = document.getElementById('copyButton');
        const downloadSocialBtn = document.getElementById('downloadSocialBtn');
        const whatsappBtn = document.getElementById('whatsappBtn');
        const linkedinBtn = document.getElementById('linkedinBtn');
        const twitterBtn = document.getElementById('twitterBtn');
        
        // Handle close button
        if (sharingClose) {
            sharingClose.addEventListener('click', () => {
                hideSharingPopup();
                // Redirect to zenotal.ai after closing
                window.location.href = 'https://www.zenotal.ai/thank-you';
            });
        }
        
        // Handle copy URL button
        if (copyButton) {
            copyButton.addEventListener('click', async () => {
                const url = 'www.zenotal.ai';
                try {
                    await navigator.clipboard.writeText(url);
                    
                    // Provide feedback
                    const originalText = copyButton.textContent;
                    copyButton.textContent = 'Copied!';
                    copyButton.style.background = '#4CAF50';
                    
                    setTimeout(() => {
                        copyButton.textContent = originalText;
                        copyButton.style.background = '#000000';
                    }, 2000);
                    
                    console.log('URL copied to clipboard');
                } catch (err) {
                    console.error('Failed to copy URL:', err);
                    
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = url;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => {
                        copyButton.textContent = 'Copy';
                    }, 2000);
                }
                
                // Redirect to zenotal.ai after copying
                setTimeout(() => {
                    window.location.href = 'https://www.zenotal.ai/thank-you';
                }, 1000);
            });
        }
        
        // Handle download social button (download shareimage.png)
        if (downloadSocialBtn) {
            downloadSocialBtn.addEventListener('click', () => {
                console.log('Download social image clicked');
                downloadSocialImage();
                // Redirect to zenotal.ai after download
                setTimeout(() => {
                    window.location.href = 'https://www.zenotal.ai/thank-you';
                }, 1000);
            });
        }
        
        // Handle WhatsApp sharing
        if (whatsappBtn) {
            whatsappBtn.addEventListener('click', () => {
                console.log('WhatsApp sharing clicked');
                shareToWhatsApp();
                // Redirect to zenotal.ai after sharing
                setTimeout(() => {
                    window.location.href = 'https://www.zenotal.ai/thank-you';
                }, 1000);
            });
        }
        
        // Handle LinkedIn sharing
        if (linkedinBtn) {
            linkedinBtn.addEventListener('click', () => {
                console.log('LinkedIn sharing clicked');
                shareToLinkedIn();
                // Redirect to zenotal.ai after sharing
                setTimeout(() => {
                    window.location.href = 'https://www.zenotal.ai/thank-you';
                }, 1000);
            });
        }
        
        // Handle Twitter sharing
        if (twitterBtn) {
            twitterBtn.addEventListener('click', () => {
                console.log('Twitter sharing clicked');
                shareToTwitter();
                // Redirect to zenotal.ai after sharing
                setTimeout(() => {
                    window.location.href = 'https://www.zenotal.ai/thank-you';
                }, 1000);
            });
        }
    }
    
    function showSharingPopup() {
        const sharingOverlay = document.getElementById('sharingOverlay');
        if (sharingOverlay) {
            console.log('Showing sharing popup');
            sharingOverlay.classList.add('show');
        }
    }
    
    function hideSharingPopup() {
        const sharingOverlay = document.getElementById('sharingOverlay');
        if (sharingOverlay) {
            console.log('Hiding sharing popup');
            sharingOverlay.classList.remove('show');
        }
    }
    
    function downloadSocialImage() {
        // Download the local share image from assets folder
        const localImageUrl = './assets/images/shareimage.png';
        const link = document.createElement('a');
        link.href = localImageUrl;
        link.download = 'zenotal-mindful-reset.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('Local share image download initiated');
    }
    
    function shareToWhatsApp() {
        // Share the OG image URL directly for WhatsApp preview
        const shareText = 'Just completed a mindful reset with Zenotal Reset. A moment of calm well earned.';
        const ogImageUrl = 'https://www.zenotal.ai/';
        
        // WhatsApp will automatically generate a preview with the OG image when sharing this URL
        const text = encodeURIComponent(`${shareText}\n\n${ogImageUrl}`);
        const whatsappUrl = `https://wa.me/?text=${text}`;
        window.open(whatsappUrl, 'whatsapp', 'width=600,height=600');
        console.log('WhatsApp sharing with OG image preview');
    }
    
    function shareToLinkedIn() {
        // Share the OG image URL directly for LinkedIn preview
        const ogImageUrl = 'https://www.zenotal.ai/';
        const postUrl = encodeURIComponent(ogImageUrl);
        const title = encodeURIComponent('Mindful Reset - Zenotal');
        const summary = encodeURIComponent('Just completed a mindful reset with Zenotal. A moment of calm well earned. 🧘‍♀️✨');
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${postUrl}`;
        window.open(linkedinUrl, 'linkedin', 'width=600,height=600');
    }
    
    function shareToTwitter() {
        // Share the OG image URL directly for Twitter preview
        const shareText = 'Just completed a mindful reset with Zenotal. A moment of calm well earned. 🧘‍♀️✨';
        const ogImageUrl = 'https://www.zenotal.ai/';
        
        // Twitter will automatically use the OG meta tags when sharing the URL
        const text = encodeURIComponent(`${shareText}\n\n${ogImageUrl}`);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(twitterUrl, 'twitter', 'width=600,height=600');
        console.log('Twitter sharing with OG image preview');
    }

    // Export functions for potential external use
    window.sharingPage = {
        proceedToNext,
        cleanupSessionData,
        setCompletionMessage,
        downloadCard,
        showPopup,
        hidePopup,
        testEmotion: function(emotion) {
            console.log('=== TESTING EMOTION: ' + emotion + ' ===');
            setCompletionMessage(emotion);
        }
    };
});
