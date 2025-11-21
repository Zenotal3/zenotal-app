document.addEventListener('DOMContentLoaded', () => {
    // Get page elements
    const launchPage = document.getElementById('launchPage');
    const emotionWheelPage = document.getElementById('emotionWheelPage');
    const appContainer = document.getElementById('appContainer');
    
    // Modified: Always show launch page first
    function checkNavigationState() {
        // Always show the launch page when first loading the site
        launchPage.style.display = 'block';
        emotionWheelPage.style.display = 'none';
        appContainer.style.display = 'none';
        
        // Ensure launch page is visible
        launchPage.style.opacity = '1';
    }
    
    // Navigation function to switch between pages
    window.navigateTo = function(pageId) {
        console.log('🔄 Navigating to:', pageId);
        console.log('🔍 Launch page display before:', launchPage.style.display);
        console.log('🔍 Emotion wheel display before:', emotionWheelPage.style.display);
        
        if (pageId === 'emotion-wheel') {
            // Animate the transition
            launchPage.style.opacity = '0';
            setTimeout(() => {
                launchPage.style.display = 'none';
                emotionWheelPage.style.display = 'block';
                emotionWheelPage.style.opacity = '1';
                
                console.log('✅ Transition complete');
                console.log('🔍 Launch page display after:', launchPage.style.display);
                console.log('🔍 Emotion wheel display after:', emotionWheelPage.style.display);
                console.log('🔍 Emotion wheel opacity after:', emotionWheelPage.style.opacity);
                console.log('🔍 Emotion wheel element:', emotionWheelPage);
                
                // Initialize emotion wheel after it becomes visible
                if (typeof window.initializeEmotionWheel === 'function') {
                    console.log('🎡 Initializing emotion wheel...');
                    window.initializeEmotionWheel();
                } else {
                    console.log('❌ Emotion wheel initialization function not found');
                }
            }, 500);
        } else if (pageId === 'app') {
            // Determine which page is currently shown
            const currentPage = emotionWheelPage.style.display === 'block' ? 
                emotionWheelPage : launchPage;
            
            // Animate the transition
            currentPage.style.opacity = '0';
            setTimeout(() => {
                launchPage.style.display = 'none';
                emotionWheelPage.style.display = 'none';
                appContainer.style.display = 'block';
                
                // Optional: fade in the app
                setTimeout(() => {
                    appContainer.style.opacity = '1';
                    
                    // Initialize app with emotion data when navigating to app
                    if (typeof window.initializeApp === 'function') {
                        window.initializeApp();
                    }
                }, 50);
            }, 500);
        } else if (pageId === 'launch') {
            // Animate the transition from any page
            emotionWheelPage.style.opacity = '0';
            appContainer.style.opacity = '0';
            setTimeout(() => {
                emotionWheelPage.style.display = 'none';
                appContainer.style.display = 'none';
                launchPage.style.display = 'block';
                
                setTimeout(() => {
                    launchPage.style.opacity = '1';
                }, 50);
            }, 500);
        }
    };
    
    // Initial check
    checkNavigationState();
});