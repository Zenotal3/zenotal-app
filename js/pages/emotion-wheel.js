// Define the emotion wheel initialization function
window.initializeEmotionWheel = function() {
    console.log('🎡 Emotion wheel initialization called');

    // Clear previous session's extracted conversation data
    localStorage.removeItem('bodySensations');
    localStorage.removeItem('userThoughts');
    localStorage.removeItem('userImpulses');
    localStorage.removeItem('userNeed');
    
    const container = document.querySelector('.emotion-cards-container');
    const slider = document.querySelector('.emotion-cards-slider');
    const wrapper = document.querySelector('.emotion-cards-wrapper');
    
    console.log('🔍 Container found:', container);
    console.log('🔍 Slider found:', slider);
    console.log('🔍 Wrapper found:', wrapper);
    
    if (!container || !slider) {
        console.error('❌ Required elements not found');
        return;
    }

    console.log('✅ All elements found, initializing emotion wheel...');

    // Clear the slider to remove any existing cards
    slider.innerHTML = '';
    
    // Add close button for zoom view
    const closeZoomBtn = document.createElement('button');
    closeZoomBtn.className = 'zoom-close-btn';
    closeZoomBtn.innerHTML = '&times;'; // Use HTML entity for proper × rendering
    closeZoomBtn.style.display = 'none';
    wrapper.appendChild(closeZoomBtn);

    // Define emotions with their details and sub-emotions
    const emotions = [
        { 
            name: 'happy', 
            color: '#F6C6BA',
            gradientColor: '#E68872',
            strokeColor: '#782F1E',
            text: 'Happy',
            subEmotions: ['Joyful', 'Content', 'Interested', 'Proud', 'Curious', 'Optimistic']
        },
        { 
            name: 'angry', 
            color: '#BBBBDB',
            gradientColor: '#7574B3',
            strokeColor: '#201F59',
            text: 'Angry',
            subEmotions: ['Furious', 'Irritated', 'Frustrated', 'Annoyed', 'Jealous', 'Mad']
        },
        { 
            name: 'surprised', 
            color: '#F6D3AA',
            gradientColor: '#EBA658',
            strokeColor: '#613B10',
            text: 'Surprised',
            subEmotions: ['Amazed', 'Confused', 'Startled', 'Perplexed', 'Shocked', 'Uncertain']
        },
        { 
            name: 'fearful', 
            color: '#81D6E1',
            gradientColor: '#00A3B8',
            strokeColor: '#0B4A52',
            text: 'Fearful',
            subEmotions: ['Anxious', 'Worried', 'Nervous', 'Terrified', 'Panicked', 'Scared']
        },
        { 
            name: 'disgusted', 
            color: '#DFBCE3',
            gradientColor: '#AF7BB4',
            strokeColor: '#481B4D',
            text: 'Disgusted',
            subEmotions: ['Repelled', 'Disapproving', 'Nauseated', 'Appalled', 'Revulsed', 'Judgmental']
        },
        { 
            name: 'sad', 
            color: '#F0BEC5',
            gradientColor: '#D37D8A',
            strokeColor: '#6D101E',
            text: 'Sad',
            subEmotions: ['Depressed', 'Lonely', 'Vulnerable', 'Isolated', 'Fragile', 'Empty']
        },
        { 
            name: 'unsettled', 
            color: '#90E8DA',
            gradientColor: '#00BC9F',
            strokeColor: '#073B33',
            text: 'Unsettled',
            subEmotions: ['Stressed', 'Uneasy', 'Bored', 'Tired', 'Overwhelmed', 'Apathetic']
        }
    ];
    
    // Responsive sizing functions
    function getResponsiveCardSize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Small mobile devices
        if (width < 480) return Math.min(120, width * 0.25, height * 0.15);
        
        // Mobile devices  
        if (width < 768) return Math.min(160, width * 0.2, height * 0.18);
        
        // Tablet devices
        if (width < 1200) return Math.min(200, width * 0.15, height * 0.2);
        
        // Desktop devices
        if (width < 1600) return Math.min(220, width * 0.12, height * 0.22);
        
        // Large desktop devices
        return Math.min(240, width * 0.1, height * 0.24);
    }
    
    function getResponsiveRadius() {
        const container = document.querySelector('.emotion-cards-container');
        if (!container) return 220; // fallback
        
        const containerRect = container.getBoundingClientRect();
        const containerSize = Math.min(containerRect.width, containerRect.height);
        
        // Use maximum radius for maximum spacing - go beyond container size
        // This will spread cards out as much as possible
        return Math.max(220, containerSize * 1.2); // Min 220px, 120% of container for extra spacing
    }
    
    function getResponsiveVisibilityRange() {
        // Make all cards visible by default to fix the invisible issue
        // We'll use a wide range to ensure cards are visible with increased spacing
        return 120; // Increased from 90 to 120 degrees to accommodate wider spread
    }
    
    // Curved layout state
    let currentRotation = 0;
    let isDragging = false;
    let startX = 0;
    let lastX = 0;
    let startY = 0; // Add Y coordinate tracking
    let totalDistance = 0; // Track total drag distance
    let dragThreshold = 10; // Minimum distance to consider it a drag
    let selectedEmotion = null;
    let isPositioning = false; // Prevent infinite loops
    
    // Dynamic layout configuration
    let cardWidth = getResponsiveCardSize();
    let radius = getResponsiveRadius();
    const totalAngle = 100; // Increased from 70 to 100 degrees for more spacing
    const angleStep = totalAngle / (emotions.length - 1);

    // Create emotion cards in curved layout
    function createEmotionCards() {
        console.log('Creating emotion cards...');
        
        emotions.forEach((emotion, index) => {
            const card = createCard(emotion, index);
            slider.appendChild(card);
            console.log(`Created card ${index}: ${emotion.name}`);
        });
        
        console.log(`Total cards created: ${emotions.length}`);
        console.log(`Card width: ${cardWidth}px, Radius: ${radius}px`);
        
        // Position cards in curve
        positionCards();
        updateHighlightedCard();
    }

    // Create a card element
    function createCard(emotion, index) {
        const card = document.createElement('div');
        card.className = 'emotion-card';
        card.setAttribute('data-emotion', emotion.name);
        card.setAttribute('data-index', index);
        
        // Set responsive size via JavaScript
        card.style.width = `${cardWidth}px`;
        card.style.height = `${cardWidth}px`;
        
        // Create SVG card with responsive size
        card.innerHTML = `
            <svg width="${cardWidth}" height="${cardWidth}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="200" rx="12" fill="${emotion.color}"/>
                <mask id="mask0_${emotion.name}" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
                    <rect width="200" height="200" rx="12" transform="matrix(-1 0 0 1 200 0)" fill="${emotion.color}"/>
                </mask>
                <g mask="url(#mask0_${emotion.name})">
                    <ellipse cx="98" cy="34" rx="98" ry="34" transform="matrix(-0.98 0.15 0.15 0.98 213 79)" stroke="${emotion.strokeColor}"/>
                    <ellipse cx="148" cy="98" rx="148" ry="98" transform="matrix(-0.98 0.17 0.17 0.98 189 -46)" fill="url(#paint0_radial_${emotion.name})"/>
                </g>
                <text x="100" y="110" text-anchor="middle" dominant-baseline="middle" 
                      fill="white" font-family="Outfit, sans-serif" font-size="24" font-weight="700">
                    ${emotion.text}
                </text>
                <defs>
                    <radialGradient id="paint0_radial_${emotion.name}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" 
                                   gradientTransform="translate(148 98) rotate(102.72) scale(101 148)">
                        <stop offset="0.40" stop-color="${emotion.gradientColor}"/>
                        <stop offset="0.92" stop-color="${emotion.gradientColor}" stop-opacity="0"/>
                    </radialGradient>
                </defs>
            </svg>
        `;
        
        // Add click event with flip animation
        card.addEventListener('click', (e) => {
            console.log('🖱️ Card clicked!', emotion.name, 'isDragging:', isDragging);
            console.log('📍 Click position:', e.clientX, e.clientY);
            console.log('📦 Card bounds:', card.getBoundingClientRect());
            if (!isDragging) {
                console.log('✅ Starting flip animation for:', emotion.name);
                flipAndZoomCard(card, emotion.name);
            } else {
                console.log('❌ Click ignored - was dragging');
            }
        });
        
        // Add touch event for mobile to ensure cards are clickable
        let cardTouchStartX = 0;
        let cardTouchStartY = 0;
        let cardTouchMoved = false;
        
        card.addEventListener('touchstart', (e) => {
            cardTouchStartX = e.touches[0].clientX;
            cardTouchStartY = e.touches[0].clientY;
            cardTouchMoved = false;
            console.log('👆 Card touch start:', emotion.name);
        }, { passive: true });
        
        card.addEventListener('touchmove', (e) => {
            const deltaX = e.touches[0].clientX - cardTouchStartX;
            const deltaY = e.touches[0].clientY - cardTouchStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance > 5) { // Small threshold for touch movement
                cardTouchMoved = true;
            }
        }, { passive: true });
        
        card.addEventListener('touchend', (e) => {
            console.log('👆 Card touch end:', emotion.name, 'moved:', cardTouchMoved, 'isDragging:', isDragging);
            
            // If it was a tap (not a drag) and we're not in the middle of wheel dragging
            if (!cardTouchMoved && !isDragging) {
                console.log('✅ Card tapped - starting flip animation:', emotion.name);
                e.preventDefault(); // Prevent the click event from also firing
                flipAndZoomCard(card, emotion.name);
            }
        }, { passive: false });
        
        return card;
    }

    // Position cards in curved quarter-circle layout - WHEEL SPINNING VERSION
    function positionCards() {
        if (isPositioning) return; // Prevent infinite loops
        
        // SKIP ALL POSITIONING WHEN ZOOM IS ACTIVE
        if (slider.classList.contains('zoom-active')) {
            console.log('🔍 Skipping positionCards - zoom is active');
            return;
        }
        
        isPositioning = true;
        
        // Get container dimensions and calculate center relative to container
        const containerRect = container.getBoundingClientRect();
        const containerCenterX = containerRect.width / 2;
        const containerCenterY = containerRect.height / 2;
        
        console.log(`Positioning cards - Container: ${containerRect.width}x${containerRect.height}, Center: ${containerCenterX},${containerCenterY}`);
        console.log(`Card width: ${cardWidth}px, Radius: ${radius}px`);
        
        // Use container center for positioning cards
        // This ensures perfect centering within the container
        
        // Apply rotation to the entire slider container (relative to container center)
        slider.style.transformOrigin = `${containerCenterX}px ${containerCenterY}px`;
        // Combine the rotation with the CSS translateY for downward movement
        slider.style.transform = `translateY(clamp(150px, 60vh, 300px)) rotate(${currentRotation}deg)`;
        
        // Position each card in its unique position on the quarter-circle
        emotions.forEach((emotion, index) => {
            const card = slider.querySelector(`[data-index="${index}"]`);
            if (!card) {
                console.log(`Card ${index} not found!`);
                return;
            }
            
            // Skip positioning for zoomed cards - let CSS handle their positioning
            if (card.classList.contains('zoomed')) {
                return;
            }
            
            // Calculate unique angle for this card position
            const baseAngle = (index * angleStep) - (totalAngle / 2); // Center the spread
            const radians = (baseAngle * Math.PI) / 180;
            
            // Calculate position on the curve (each card gets its own position)
            const x = containerCenterX + Math.sin(radians) * radius - cardWidth / 2;
            const y = containerCenterY - Math.cos(radians) * radius - cardWidth / 2;
            
            // Always apply position (remove the positioning flag check)
            card.style.left = `${x}px`;
            card.style.top = `${y}px`;
            card.style.transform = `rotate(${baseAngle}deg)`; // Rotate cards to follow the curve outward
            
            // Update visibility based on current rotation
            const currentAngle = baseAngle + currentRotation;
            
            // TEMPORARILY MAKE ALL CARDS VISIBLE TO FIX THE ISSUE
            const isVisible = true; // Force all cards to be visible
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
            
            if (index === 0) {
                console.log(`Card 0 positioned at: ${x},${y}, angle: ${baseAngle}°, visible: ${isVisible}`);
            }
        });
        
        isPositioning = false; // Reset the flag
    }

    // Update highlighted card (center-most card) - WHEEL VERSION
    function updateHighlightedCard() {
        // Find the card closest to center (angle closest to 0)
        let centerIndex = Math.round(-currentRotation / angleStep);
        centerIndex = ((centerIndex % emotions.length) + emotions.length) % emotions.length;
        
        // Update highlighted state
        document.querySelectorAll('.emotion-card').forEach((card, index) => {
            if (index === centerIndex) {
                card.classList.add('highlighted');
                selectedEmotion = emotions[index].name;
            } else {
                card.classList.remove('highlighted');
            }
        });
    }

    // Handle drag rotation
    function updateRotation(deltaX) {
        if (isPositioning) return; // Prevent calls during positioning
        
        // Convert horizontal drag to rotation (adjust sensitivity)
        const sensitivity = 0.3;
        currentRotation += deltaX * sensitivity;
        
        // Keep rotation within reasonable bounds
        const maxRotation = (emotions.length - 1) * angleStep;
        currentRotation = Math.max(-maxRotation, Math.min(maxRotation, currentRotation));
        
        positionCards();
        updateHighlightedCard();
    }

    // Add drag functionality
    function addDragHandlers() {
        // Mouse events
        container.addEventListener('mousedown', (e) => {
            // Don't allow dragging when zoomed
            if (slider.classList.contains('zoom-active')) return;
            
            isDragging = true;
            container.classList.add('spinning');
            startX = e.clientX;
            lastX = e.clientX;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastX;
            updateRotation(deltaX);
            lastX = e.clientX;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                container.classList.remove('spinning');
                snapToNearestCard();
                
                // Add a small delay to ensure click events work after dragging
                setTimeout(() => {
                    console.log('🔓 Dragging reset completed');
                }, 100);
            }
        });

        // Touch events for mobile
        container.addEventListener('touchstart', (e) => {
            // Don't allow dragging when zoomed
            if (slider.classList.contains('zoom-active')) return;
            
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            lastX = e.touches[0].clientX;
            totalDistance = 0;
            isDragging = false; // Don't set to true immediately
            
            // Don't preventDefault here - let the touch bubble up to individual cards first
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            // Calculate distance moved
            const deltaX = e.touches[0].clientX - startX;
            const deltaY = e.touches[0].clientY - startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Only start dragging if we've moved beyond the threshold
            if (distance > dragThreshold && !isDragging) {
                isDragging = true;
                container.classList.add('spinning');
                console.log('🖱️ Touch drag started, threshold exceeded:', distance);
            }
            
            if (isDragging) {
                const currentDeltaX = e.touches[0].clientX - lastX;
                updateRotation(currentDeltaX);
                lastX = e.touches[0].clientX;
                totalDistance += Math.abs(currentDeltaX);
                e.preventDefault(); // Only prevent default when actually dragging
            }
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                container.classList.remove('spinning');
                snapToNearestCard();
                
                // Add a small delay to ensure click events work after dragging
                setTimeout(() => {
                    console.log('🔓 Touch dragging reset completed, total distance:', totalDistance);
                }, 100);
            } else {
                // This was a tap, not a drag - let it bubble to card click handlers
                console.log('👆 Touch was a tap, not a drag. Distance:', totalDistance);
            }
            
            // Reset tracking variables
            totalDistance = 0;
        });
    }

    // Snap to nearest card
    function snapToNearestCard() {
        const targetRotation = Math.round(currentRotation / angleStep) * angleStep;
        
        // Animate to target rotation
        const startRotation = currentRotation;
        const rotationDiff = targetRotation - startRotation;
        const duration = 300;
        const startTime = Date.now();
        
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            
            currentRotation = startRotation + rotationDiff * easeProgress;
            positionCards();
            updateHighlightedCard();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }

    // Function to create properly-proportioned SVG for zoomed cards
    function createZoomedCardSVG(emotion, containerWidth, containerHeight) {
        // Use the aspect ratio from your reference design (385×564)
        const aspectRatio = 385 / 564;
        const targetWidth = containerWidth;
        const targetHeight = containerHeight;
        
        // Calculate proper dimensions that fit the container while maintaining aspect ratio
        let svgWidth, svgHeight;
        if (targetWidth / targetHeight > aspectRatio) {
            // Container is wider than needed, fit by height
            svgHeight = targetHeight;
            svgWidth = svgHeight * aspectRatio;
        } else {
            // Container is taller than needed, fit by width
            svgWidth = targetWidth;
            svgHeight = svgWidth / aspectRatio;
        }
        
        // Create SVG with proper proportions based on your card.xml reference
        return `
            <svg width="100%" height="100%" viewBox="0 0 385 564" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <defs>
                    <filter id="filter0_d_${emotion.name}" x="0" y="0" width="385" height="564" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                        <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                        <feMorphology radius="2" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_${emotion.name}"/>
                        <feOffset dy="4"/>
                        <feGaussianBlur stdDeviation="5"/>
                        <feComposite in2="hardAlpha" operator="out"/>
                        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_${emotion.name}"/>
                        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_${emotion.name}" result="shape"/>
                    </filter>
                    <radialGradient id="paint0_radial_${emotion.name}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(266.246 177.559) rotate(102.74) scale(182.041 265.595)">
                        <stop offset="0.408654" stop-color="${emotion.gradientColor}"/>
                        <stop offset="0.918269" stop-color="${emotion.gradientColor}" stop-opacity="0"/>
                    </radialGradient>
                </defs>
                
                <!-- Main card background with drop shadow - perfect full coverage -->
                <rect x="0" y="0" width="100%" height="100%" rx="12" fill="${emotion.color}" filter="url(#filter0_d_${emotion.name})"/>
                
                <!-- Gradient overlay mask - perfect full coverage -->
                <mask id="mask0_${emotion.name}" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="385" height="564">
                    <rect x="0" y="0" width="100%" height="100%" rx="12" fill="${emotion.color}"/>
                </mask>
                
                <!-- Gradient elements -->
                <g mask="url(#mask0_${emotion.name})">
                    <ellipse cx="177.564" cy="61.5796" rx="177.564" ry="61.5796" transform="matrix(-0.988578 0.15071 0.151225 0.988499 395.616 149.109)" stroke="${emotion.strokeColor}"/>
                    <ellipse cx="266.246" cy="177.559" rx="266.246" ry="177.559" transform="matrix(-0.984339 0.176287 0.176884 0.984232 351.82 -76.7625)" fill="url(#paint0_radial_${emotion.name})"/>
                </g>
                
                <!-- Emotion title text - positioned at top left with bigger font -->
                <text x="30" y="80" text-anchor="start" dominant-baseline="middle" 
                      fill="white" font-family="Outfit, sans-serif" font-size="44" font-weight="700">
                    ${emotion.text}
                </text>
                
                <!-- Sub-emotion prompt text - positioned below title at top left with bigger font -->
                <text x="30" y="140" text-anchor="start" 
                      fill="white" font-family="Outfit, sans-serif" font-size="24" font-weight="400">
                    and right now, are you more...
                </text>
            </svg>
        `;
    }

    // Function to handle flip animation and then zoom the card
    function flipAndZoomCard(card, emotionName) {
        console.log('🔄 Starting flip animation for:', emotionName);
        
        // Prevent multiple flips
        if (card.classList.contains('flipping') || card.classList.contains('zoomed') || slider.classList.contains('zoom-active')) {
            console.log('🔄 Flip already in progress or zoom active, returning');
            return;
        }
        
        // Start flip animation
        card.classList.add('flipping');
        card.style.zIndex = '100';
        
        // After flip completes, zoom the card
        setTimeout(() => {
            card.classList.remove('flipping');
            card.style.zIndex = '';
            zoomCard(card, emotionName);
        }, 600); // Match CSS animation duration
    }

    // Function to zoom a card and show sub-emotion selection
    function zoomCard(card, emotionName) {
        console.log('🔍 zoomCard called with:', emotionName);
        console.log('🔍 Card element:', card);
        console.log('🔍 Card current classes:', card.className);
        console.log('🔍 Card current style:', card.style.cssText);
        
        // If card is already zoomed or another card is zoomed, do nothing
        if (card.classList.contains('zoomed') || slider.classList.contains('zoom-active')) {
            console.log('🔍 Zoom already active, returning');
            return;
        }
        
        // Add zoom classes
        document.querySelector('.emotion-wheel-container').classList.add('zoom-active');
        wrapper.classList.add('zoom-active');
        slider.classList.add('zoom-active');
        card.classList.add('zoomed');
        
        // Create and add blur backdrop
        const blurBackdrop = document.createElement('div');
        blurBackdrop.className = 'zoom-blur-backdrop';
        blurBackdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 999;
        `;
        document.body.appendChild(blurBackdrop);
        
        console.log('🔍 Added zoom classes, card classes now:', card.className);
        console.log('🔍 Card bounding rect after zoom:', card.getBoundingClientRect());
        console.log('🔍 Viewport size:', window.innerWidth, 'x', window.innerHeight);
        console.log('🔍 Document scroll:', window.scrollX, window.scrollY);
        
        // Clear inline styles that override CSS positioning
        card.style.left = '';
        card.style.top = '';
        card.style.transform = '';
        card.style.position = '';
        
        // Replace the square SVG with properly-proportioned SVG for zoomed view
        const emotionData = emotions.find(e => e.name === emotionName);
        if (emotionData) {
            // Get the target container dimensions from CSS
            const computedStyle = window.getComputedStyle(card);
            const containerWidth = parseInt(computedStyle.width);
            const containerHeight = parseInt(computedStyle.height);
            
            console.log('🔍 Replacing SVG for zoom view:', containerWidth, 'x', containerHeight);
            
            // Replace the SVG content with the properly-proportioned version
            card.innerHTML = createZoomedCardSVG(emotionData, containerWidth, containerHeight);
        }
        
        console.log('🔍 Cleared inline styles, card style now:', card.style.cssText);
        console.log('🔍 Card bounding rect after clearing:', card.getBoundingClientRect());
        
        // Wait for the card to be positioned in its zoomed state, then position the close button
        setTimeout(() => {
            // Get the card's position after it has been moved to its zoomed state
            const cardRect = card.getBoundingClientRect();
            
            console.log('🔍 Card rect after zoom positioning:', cardRect);
            console.log('🔍 Screen dimensions:', window.innerWidth, 'x', window.innerHeight);
            console.log('🔍 Close button element:', closeZoomBtn);
            console.log('🔍 Close button parent:', closeZoomBtn.parentElement);
            
            // Instead of trying to calculate pixel positions, attach the close button to the card
            // and use CSS positioning relative to the card
            
            // Remove the close button from its current parent
            if (closeZoomBtn.parentElement) {
                closeZoomBtn.parentElement.removeChild(closeZoomBtn);
            }
            
            // Append the close button directly to the zoomed card
            card.appendChild(closeZoomBtn);
            
            // Set the close button to use absolute positioning relative to the card
            closeZoomBtn.style.position = 'absolute';
            closeZoomBtn.style.top = '-15px'; // 15px above the card
            closeZoomBtn.style.right = '-15px'; // 15px to the right of the card
            closeZoomBtn.style.left = 'auto'; // Clear any left positioning
            closeZoomBtn.style.display = 'flex';
            
            // Check if we're on mobile/tablet and use appropriate sizing
            const isMobile = window.innerWidth <= 768;
            const isTablet = window.innerWidth > 768 && window.innerWidth <= 1199;
            
            // Use device-appropriate sizing
            if (isMobile) {
                closeZoomBtn.style.width = '32px';
                closeZoomBtn.style.height = '32px';
                closeZoomBtn.style.fontSize = '20px';
            } else if (isTablet) {
                closeZoomBtn.style.width = '30px';
                closeZoomBtn.style.height = '30px';
                closeZoomBtn.style.fontSize = '18px';
            } else {
                closeZoomBtn.style.width = '28px';
                closeZoomBtn.style.height = '28px';
                closeZoomBtn.style.fontSize = '16px';
            }
            
            closeZoomBtn.style.borderRadius = '50%';
            closeZoomBtn.style.background = 'white';
            closeZoomBtn.style.border = 'none';
            closeZoomBtn.style.fontWeight = 'bold';
            closeZoomBtn.style.color = '#333';
            closeZoomBtn.style.cursor = 'pointer';
            closeZoomBtn.style.zIndex = '1003'; // Higher z-index for all devices
            closeZoomBtn.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
            closeZoomBtn.style.alignItems = 'center';
            closeZoomBtn.style.justifyContent = 'center';
            closeZoomBtn.style.lineHeight = '1'; // Ensure proper line height
            closeZoomBtn.style.fontFamily = 'Arial, sans-serif'; // Ensure font renders ×
            closeZoomBtn.style.pointerEvents = 'auto'; // Ensure button can be clicked
            closeZoomBtn.style.userSelect = 'none'; // Prevent text selection
            closeZoomBtn.innerHTML = '&times;'; // Use HTML entity for proper × rendering
            
            console.log('🔍 Close button positioned with absolute positioning relative to card');
            console.log('🔍 Close button parent:', closeZoomBtn.parentElement);
            console.log('🔍 Device type:', isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop');
            
            // Add visible class after positioning
            closeZoomBtn.classList.add('visible');
            
            // Force visibility immediately for mobile/tablet debugging
            closeZoomBtn.style.opacity = '1';
            closeZoomBtn.style.transform = 'scale(1)';
            closeZoomBtn.style.transition = 'all 0.3s ease';
            
            console.log('🔍 Added visible class to close button');
            console.log('🔍 Close button classList:', closeZoomBtn.classList.toString());
            console.log('🔍 Close button computed style display:', window.getComputedStyle(closeZoomBtn).display);
            console.log('🔍 Close button computed style opacity:', window.getComputedStyle(closeZoomBtn).opacity);
            console.log('🔍 Close button getBoundingClientRect:', closeZoomBtn.getBoundingClientRect());
            
            // Re-add the event listener to ensure it's working
            closeZoomBtn.removeEventListener('click', resetZoom); // Remove any existing listener
            closeZoomBtn.addEventListener('click', (e) => {
                console.log('🔍 Close button clicked!');
                e.preventDefault();
                e.stopPropagation();
                resetZoom();
            });
            
            // Add touch event support for mobile/tablet
            closeZoomBtn.addEventListener('touchend', (e) => {
                console.log('🔍 Close button touched!');
                e.preventDefault();
                e.stopPropagation();
                resetZoom();
            }, { passive: false });
            
            // Also add a test to see if the button can be clicked at all
            closeZoomBtn.addEventListener('mousedown', (e) => {
                console.log('🔍 Close button mousedown detected!');
            });
            
            console.log('🔍 Re-added event listeners to close button');
        }, window.innerWidth <= 768 ? 150 : 50); // Longer delay for mobile devices
        
        // Add backdrop click handler for closing zoom
        const handleBackdropClick = (e) => {
            // Only close if clicking the backdrop itself (not the card or close button)
            if (e.target.classList.contains('zoom-blur-backdrop')) {
                resetZoom();
                document.removeEventListener('click', handleBackdropClick);
            }
        };
        
        // Add click handler to the backdrop
        blurBackdrop.addEventListener('click', handleBackdropClick);
        
        // Get the emotion object for sub-emotion buttons
        const emotionForButtons = emotions.find(e => e.name === emotionName);
        
        // Add sub-emotion buttons to the card (after the SVG replacement)
        setTimeout(() => {
            if (emotionForButtons) {
                const subEmotionButtonsHTML = `
                    <div class="sub-emotion-buttons" style="position: absolute !important; bottom: clamp(15px, 3vh, 20px) !important; left: 50% !important; transform: translateX(-50%); display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: clamp(9px, 1.5vw, 13px) !important; width: clamp(253px, 29vw, 286px) !important; z-index: 25 !important; pointer-events: auto !important;">
                        ${emotionForButtons.subEmotions.map((subEmotion, index) => `
                            <button class="sub-emotion-btn" data-emotion="${subEmotion.toLowerCase()}" style="border-color: ${emotionForButtons.strokeColor}; color: ${emotionForButtons.strokeColor}; width: 121px; height: 55px; font-size: 15px; font-weight: 700;">
                                ${subEmotion}
                            </button>
                        `).join('')}
                    </div>
                `;
                card.insertAdjacentHTML('beforeend', subEmotionButtonsHTML);
                
                // Add click events to the sub-emotion buttons after they've been added to DOM
                const subEmotionButtons = card.querySelectorAll('.sub-emotion-btn');
                subEmotionButtons.forEach(button => {
                    // Mouse click event
                    button.addEventListener('click', () => {
                        const subEmotion = button.getAttribute('data-emotion');
                        selectEmotion(subEmotion);
                    });
                    
                    // Touch event for mobile/tablet
                    button.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const subEmotion = button.getAttribute('data-emotion');
                        console.log('🔍 Sub-emotion button touched:', subEmotion);
                        selectEmotion(subEmotion);
                    }, { passive: false });
                });
            }
        }, 50);
        
        // FORCE the correct positioning with inline styles to override any JavaScript interference
        setTimeout(() => {
            console.log('🔍 setTimeout executing, forcing positioning...');
            console.log('🔍 Card before forcing:', card.style.cssText);
            
            // Check parent transforms that might affect fixed positioning
            console.log('🔍 Parent transforms:');
            console.log('🔍 Container transform:', getComputedStyle(container).transform);
            console.log('🔍 Slider transform:', getComputedStyle(slider).transform);
            console.log('🔍 Wrapper transform:', getComputedStyle(wrapper).transform);
            
            // REMOVE the card from the transformed parent hierarchy
            // Move it to document.body to escape any parent transforms
            document.body.appendChild(card);
            
            // Let CSS control the sizing - remove JavaScript size forcing
            card.style.position = 'fixed';
            card.style.top = '100px';
            card.style.left = '50%';
            card.style.transform = 'translateX(-50%)';
            card.style.zIndex = '1000';
            
            console.log('🔍 Card after forcing:', card.style.cssText);
            console.log('🔍 Card computed style top:', getComputedStyle(card).top);
            console.log('🔍 Card computed style left:', getComputedStyle(card).left);
            console.log('🔍 Card computed style position:', getComputedStyle(card).position);
            console.log('🔍 Final card bounding rect:', card.getBoundingClientRect());
            console.log('🔍 Is card visible?', card.getBoundingClientRect().top >= 0 && card.getBoundingClientRect().top <= window.innerHeight);
        }, 0);
    }
    
    // Function to reset zoom
    function resetZoom() {
        document.querySelector('.emotion-wheel-container').classList.remove('zoom-active');
        wrapper.classList.remove('zoom-active');
        slider.classList.remove('zoom-active');
        
        // Remove blur backdrop
        const blurBackdrop = document.querySelector('.zoom-blur-backdrop');
        if (blurBackdrop) {
            document.body.removeChild(blurBackdrop);
        }
        
        // Find zoomed cards and move them back to slider before removing zoom class
        document.querySelectorAll('.emotion-card.zoomed').forEach(card => {
            // Move card back to slider if it was moved to document.body
            if (card.parentElement === document.body) {
                slider.appendChild(card);
            }
            card.classList.remove('zoomed');
            // Also remove any flip-related classes
            card.classList.remove('flipping', 'flip-to-zoom', 'clicked');
            card.style.zIndex = ''; // Reset z-index
        });
        
        // Hide close button and move it back to wrapper
        closeZoomBtn.classList.remove('visible');
        
        // Remove close button from the zoomed card if it's there
        if (closeZoomBtn.parentElement && closeZoomBtn.parentElement.classList.contains('emotion-card')) {
            closeZoomBtn.parentElement.removeChild(closeZoomBtn);
        }
        
        // If close button is in document body, remove it from there too
        if (closeZoomBtn.parentElement === document.body) {
            document.body.removeChild(closeZoomBtn);
        }
        
        // Always put the close button back in the wrapper and hide it
        wrapper.appendChild(closeZoomBtn);
        setTimeout(() => {
            closeZoomBtn.style.display = 'none';
        }, 300);
        
        // Recreate cards and restart curved layout
        slider.innerHTML = '';
        slider.style.transform = ''; // Reset slider transform
        currentRotation = 0; // Reset rotation
        createEmotionCards();
    }
    
    // Close zoom button event
    closeZoomBtn.addEventListener('click', resetZoom);
    
    // Close zoom button touch event for mobile/tablet
    closeZoomBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetZoom();
    }, { passive: false });
    
    // Function to handle emotion selection
    function selectEmotion(emotionName) {
        // Save selected emotion
        localStorage.setItem('userEmotion', emotionName);
        console.log(`Selected emotion: ${emotionName}`);
        
        // Immediately hide the emotion wheel page to make card disappear instantly
        document.getElementById('emotionWheelPage').style.display = 'none';
        
        // Clean up any zoom states and blur backdrops immediately
        document.querySelector('.emotion-wheel-container').classList.remove('zoom-active');
        wrapper.classList.remove('zoom-active');
        slider.classList.remove('zoom-active');
        
        // Remove any blur backdrops
        const blurBackdrops = document.querySelectorAll('.zoom-blur-backdrop');
        blurBackdrops.forEach(backdrop => {
            if (backdrop.parentElement) {
                backdrop.parentElement.removeChild(backdrop);
            }
        });
        
        // Hide any zoomed cards immediately
        document.querySelectorAll('.emotion-card.zoomed').forEach(card => {
            card.style.display = 'none';
            card.classList.remove('zoomed');
        });
        
        // Show stress checker immediately
        showStressChecker();
    }

    // Function to show stress checker
    function showStressChecker() {
        // Hide emotion wheel page
        document.getElementById('emotionWheelPage').style.display = 'none';
        
        // Show stress checker
        const stressChecker = document.getElementById('stressCheckerPage');
        if (stressChecker) {
            stressChecker.style.display = 'flex';
            
            // Move emoji to follow slider and initialize
            moveEmojiToSlider();
            initializeStressSlider();
            
            // Add backdrop click handler
            const backdrop = document.querySelector('.stress-checker-backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', hideStressChecker);
            }
        }
    }

    // Function to move emoji to follow slider
    function moveEmojiToSlider() {
        const emojiContainer = document.querySelector('.stress-emoji-container');
        const sliderContainer = document.querySelector('.stress-slider-container');
        
        if (emojiContainer && sliderContainer) {
            // Move emoji container to be positioned relative to slider
            sliderContainer.appendChild(emojiContainer);
        }
    }

    // Function to initialize stress slider
    function initializeStressSlider() {
        const handle = document.getElementById('stress-handle');
        const progress = document.getElementById('stress-progress');
        const currentPercentageText = document.getElementById('current-percentage');
        const continueBtn = document.getElementById('stressContinueBtn');
        const closeBtn = document.getElementById('stressCloseBtn');
        const sliderTrack = document.querySelector('.stress-slider-container svg');
        const emojiContainer = document.querySelector('.stress-emoji-container');
        const emojiBg = document.getElementById('stress-emoji-bg');
        const mouth = document.getElementById('mouth');
        
        if (!handle || !progress || !currentPercentageText || !emojiContainer) {
            console.error('Stress slider elements not found');
            return;
        }
        
        let isDraggingStress = false;
        let stressLevel = 0; // Start at 0%
        
        const sliderStart = 50;
        const sliderWidth = 400;
        const sliderEnd = 450;
        
        // Update slider visuals
        function updateStressSlider(level) {
            const clampedLevel = Math.round(Math.max(0, Math.min(100, level)));
            const handleX = sliderStart + (clampedLevel / 100) * sliderWidth;
            
            // Update handle position
            handle.setAttribute('cx', handleX);
            
            // Update progress line
            progress.setAttribute('x2', handleX);
            
            // Update emoji position to follow handle EXACTLY
            // Calculate the exact pixel position relative to the slider container
            if (sliderTrack && emojiContainer) {
                const sliderRect = sliderTrack.getBoundingClientRect();
                
                // Convert SVG coordinates to actual pixel position within the slider container
                const actualHandleX = (handleX / 500) * sliderRect.width;
                
                // Position emoji exactly above the handle
                emojiContainer.style.left = actualHandleX + 'px';
                emojiContainer.style.transform = 'translateX(-50%)'; // Center the emoji on the handle
                
                // Force a reflow to ensure positioning is applied immediately on mobile
                emojiContainer.offsetHeight;
            }
            
            // Update current percentage text position and value
            // Never show percentage at 0% or 100% since we have static labels
            currentPercentageText.style.display = 'none'; // Always hide for 0% and 100%
            
            // Only show percentage if it's between 1% and 99%
            if (clampedLevel > 0 && clampedLevel < 100) {
                currentPercentageText.style.display = 'block';
                let textX = handleX;
                if (clampedLevel < 15) {
                    textX = Math.max(handleX, 80); // Keep away from 0% label
                } else if (clampedLevel > 85) {
                    textX = Math.min(handleX, 420); // Keep away from 100% label
                }
                currentPercentageText.setAttribute('x', textX);
                currentPercentageText.textContent = clampedLevel + '%';
            }
            
            // Update emoji expression based on stress level
            updateEmoji(clampedLevel);
            
            stressLevel = clampedLevel;
            return clampedLevel;
        }
        
        // Update emoji based on stress level
        function updateEmoji(level) {
            // The emoji background color stays #F08763 as specified
            emojiBg.querySelector('path').setAttribute('fill', '#F08763');
            
            // Change mouth expression based on stress level
            if (level <= 20) {
                // Happy smile
                mouth.setAttribute('d', 'M26.1709 40.2622C31.5287 45.62 40.2154 45.62 45.5732 40.2622');
            } else if (level <= 40) {
                // Slight smile
                mouth.setAttribute('d', 'M28.1709 42.2622C31.5287 44.62 38.2154 44.62 41.5732 42.2622');
            } else if (level <= 60) {
                // Neutral
                mouth.setAttribute('d', 'M30.1709 42.2622L39.5732 42.2622');
            } else if (level <= 80) {
                // Slight frown
                mouth.setAttribute('d', 'M28.1709 45.2622C31.5287 41.62 38.2154 41.62 41.5732 45.2622');
            } else {
                // Deep frown
                mouth.setAttribute('d', 'M26.1709 47.2622C31.5287 41.62 40.2154 41.62 45.5732 47.2622');
            }
        }
        
        // Get position from mouse/touch
        function getPositionFromEvent(clientX) {
            const rect = sliderTrack.getBoundingClientRect();
            const svgX = (clientX - rect.left) / rect.width * 500; // Convert to SVG coordinates
            const clampedX = Math.max(sliderStart, Math.min(sliderEnd, svgX));
            const percentage = ((clampedX - sliderStart) / sliderWidth) * 100;
            return Math.max(0, Math.min(100, percentage));
        }
        
        // Mouse/touch event handlers for dragging
        function startDrag(clientX) {
            isDraggingStress = true;
            handle.style.cursor = 'grabbing';
            
            // Disable any remaining CSS transitions for immediate response
            emojiContainer.style.transition = 'none';
            
            const newLevel = getPositionFromEvent(clientX);
            updateStressSlider(newLevel);
        }
        
        function updateDrag(clientX) {
            if (!isDraggingStress) return;
            const newLevel = getPositionFromEvent(clientX);
            updateStressSlider(newLevel);
        }
        
        function endDrag() {
            if (!isDraggingStress) return;
            isDraggingStress = false;
            handle.style.cursor = 'grab';
            
            // Keep transitions disabled for immediate response
            emojiContainer.style.transition = 'none';
            
            // Force one final position update to ensure emoji is exactly positioned
            setTimeout(() => {
                updateStressSlider(stressLevel);
            }, 10);
        }
        
        // Mouse events for dragging
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startDrag(e.clientX);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDraggingStress) {
                e.preventDefault();
                updateDrag(e.clientX);
            }
        });
        
        document.addEventListener('mouseup', endDrag);
        
        // Touch events for mobile
        handle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            startDrag(touch.clientX);
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isDraggingStress) {
                e.preventDefault();
                e.stopPropagation();
                const touch = e.touches[0];
                updateDrag(touch.clientX);
            }
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            if (isDraggingStress) {
                e.preventDefault();
                e.stopPropagation();
                endDrag();
            }
        });
        
        // Click on slider track to move handle
        sliderTrack.addEventListener('click', (e) => {
            if (e.target === handle) return; // Don't handle clicks on the handle itself
            
            // Disable transitions for immediate response
            emojiContainer.style.transition = 'none';
            
            const newLevel = getPositionFromEvent(e.clientX);
            updateStressSlider(newLevel);
            
            // Force emoji position update after a brief delay
            setTimeout(() => {
                updateStressSlider(newLevel);
            }, 10);
        });
        
        // Touch events for slider track (mobile)
        sliderTrack.addEventListener('touchstart', (e) => {
            if (e.target === handle) return; // Don't handle touches on the handle itself
            
            e.preventDefault();
            e.stopPropagation();
            
            // Disable transitions for immediate response
            emojiContainer.style.transition = 'none';
            
            const touch = e.touches[0];
            const newLevel = getPositionFromEvent(touch.clientX);
            updateStressSlider(newLevel);
            
            // Force emoji position update
            setTimeout(() => {
                updateStressSlider(newLevel);
            }, 10);
        });
        
        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                hideStressChecker();
            });
        }
        
        // Continue button
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                // Convert 0-100% to 1-5 scale for backend compatibility
                const mappedStressLevel = convertStressLevelToScale(stressLevel);
                
                // Save both original percentage and mapped scale
                localStorage.setItem('userStressLevel', stressLevel); // Original 0-100%
                localStorage.setItem('userStressScale', mappedStressLevel); // Mapped 1-5 scale
                console.log(`Selected stress level: ${stressLevel}% (mapped to scale ${mappedStressLevel})`);
                
                // Navigate to conversation selection page
                showConversationPage();
            });
        }
        
        // Initialize with default position (0%)
        // Ensure no transitions for immediate response
        emojiContainer.style.transition = 'none';
        
        // Wait for DOM to be ready and then initialize
        setTimeout(() => {
            updateStressSlider(0);
        }, 50);
        
        // Add resize handler to maintain correct emoji positioning
        window.addEventListener('resize', () => {
            // Re-update emoji position when window resizes
            setTimeout(() => {
                emojiContainer.style.transition = 'none';
                updateStressSlider(stressLevel);
            }, 100); // Small delay to ensure layout is complete
        });
    }

    // Function to hide stress checker
    function hideStressChecker() {
        // Hide stress checker
        document.getElementById('stressCheckerPage').style.display = 'none';
        
        // Show emotion wheel page
        const emotionWheelPage = document.getElementById('emotionWheelPage');
        emotionWheelPage.style.display = 'block';
        
        // Reset any zoom state and restore functionality
        resetZoom();
        
        // Remove backdrop click handler to prevent memory leaks
        const backdrop = document.querySelector('.stress-checker-backdrop');
        if (backdrop) {
            backdrop.removeEventListener('click', hideStressChecker);
        }
        
        // Reset emoji position back to original
        const emojiContainer = document.querySelector('.stress-emoji-container');
        const modal = document.querySelector('.stress-checker-modal');
        if (emojiContainer && modal) {
            emojiContainer.classList.remove('stress-emoji-floating');
            emojiContainer.style.left = '';
            // Move emoji back to modal (for next time)
            modal.insertBefore(emojiContainer, modal.querySelector('.stress-slider-container'));
        }
    }

    // Function to convert 0-100% stress level to 1-5 scale for backend compatibility
    function convertStressLevelToScale(percentage) {
        if (percentage >= 0 && percentage <= 20) return 1;
        if (percentage >= 21 && percentage <= 40) return 2;
        if (percentage >= 41 && percentage <= 60) return 3;
        if (percentage >= 61 && percentage <= 80) return 4;
        if (percentage >= 81 && percentage <= 100) return 5;
        return 1; // Default fallback
    }

    // Function to show conversation selection page
    function showConversationPage() {
        // Hide stress checker
        document.getElementById('stressCheckerPage').style.display = 'none';
        
        // Navigate to conversation selection page (conversation.html)
        window.location.href = 'conversation.html';
    }

    // Update responsive values and re-render
    function updateResponsiveValues() {
        cardWidth = getResponsiveCardSize();
        radius = getResponsiveRadius();
        
        // Update all existing cards with new sizes
        emotions.forEach((emotion, index) => {
            const card = slider.querySelector(`[data-index="${index}"]`);
            if (card) {
                // Update card container size
                card.style.width = `${cardWidth}px`;
                card.style.height = `${cardWidth}px`;
                
                // Update SVG size
                const svg = card.querySelector('svg');
                if (svg) {
                    svg.setAttribute('width', cardWidth);
                    svg.setAttribute('height', cardWidth);
                }
            }
        });
        
        // Reposition cards with new values
        positionCards();
        updateHighlightedCard();
    }

    // Initialize the curved card layout
    function initializeCurvedLayout() {
        createEmotionCards();
        addDragHandlers();
        
        // Handle window resize with responsive updates
        window.addEventListener('resize', () => {
            updateResponsiveValues();
        });
    }

    // Start the curved layout
    initializeCurvedLayout();
}; // End of initializeEmotionWheel function

// Debug function to check positioning
function debugPosition() {
    const container = document.querySelector('.emotion-cards-container');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    console.log('Debug positioning info:');
    console.log(`Screen: ${screenWidth}x${screenHeight}`);
    console.log(`Container position: ${containerRect.left}, ${containerRect.top}`);
    console.log(`Container size: ${containerRect.width}x${containerRect.height}`);
    console.log(`Container center: ${containerRect.left + containerRect.width/2}, ${containerRect.top + containerRect.height/2}`);
    console.log(`Screen center: ${screenWidth/2}, ${screenHeight/2}`);
    console.log(`Is mobile: ${screenWidth < 768}`);
    
    // Show responsive values
    const cardSize = screenWidth < 480 ? Math.min(120, screenWidth * 0.25, screenHeight * 0.15) :
                     screenWidth < 768 ? Math.min(160, screenWidth * 0.2, screenHeight * 0.18) :
                     screenWidth < 1200 ? Math.min(200, screenWidth * 0.15, screenHeight * 0.2) :
                     screenWidth < 1600 ? Math.min(220, screenWidth * 0.12, screenHeight * 0.22) :
                     Math.min(240, screenWidth * 0.1, screenHeight * 0.24);
    
    const radiusValue = screenWidth < 768 ? screenWidth * 0.25 :
                        screenWidth < 1200 ? screenWidth * 0.35 : screenWidth * 0.4;
    
    const visibilityRange = screenWidth < 768 ? 30 : 60;
    
    console.log(`Responsive values:`);
    console.log(`Card size: ${cardSize}px`);
    console.log(`Radius: ${radiusValue}px`);
    console.log(`Visibility range: ${visibilityRange}°`);
}

// Make debug function available globally
window.debugPosition = debugPosition;

// Also run on DOMContentLoaded as backup (in case page is already visible)
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if emotion wheel page is already visible
    const emotionWheelPage = document.getElementById('emotionWheelPage');
    if (emotionWheelPage && emotionWheelPage.style.display !== 'none') {
        window.initializeEmotionWheel();
    }
});