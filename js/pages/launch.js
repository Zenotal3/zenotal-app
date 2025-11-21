document.addEventListener('DOMContentLoaded', () => {
    
    initGradientMesh();
    
    const beginResetBtn = document.getElementById('beginResetBtn');
    
    if (beginResetBtn) {
        beginResetBtn.addEventListener('click', () => {
            console.log('🔘 Button clicked! Navigating to emotion wheel...');
            // Navigate to the emotion wheel instead of directly to the app
            window.navigateTo('emotion-wheel');
        });
    } else {
        console.log('❌ Button not found!');
    }
    
    // Add animation to circular text
    const circularText = document.querySelector('.circular-text');
    if (circularText) {
        // Optional additional animations can be added here
    }
});

function initGradientMesh() {
    const canvas = document.getElementById('gradientMesh');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create more dynamic gradient points with colors closer to #fe9166
    const points = [
        { 
            x: canvas.width * 0.1, 
            y: canvas.height * 0.1, 
            dx: 0.5, 
            dy: 0.7, 
            color: 'rgba(254, 145, 102, 0.4)',
            radius: canvas.width * 0.6
        },
        { 
            x: canvas.width * 0.9, 
            y: canvas.height * 0.2, 
            dx: -0.4, 
            dy: 0.6, 
            color: 'rgba(254, 170, 140, 0.3)',
            radius: canvas.width * 0.5
        },
        { 
            x: canvas.width * 0.2, 
            y: canvas.height * 0.8, 
            dx: 0.6, 
            dy: -0.5, 
            color: 'rgba(255, 185, 160, 0.35)',
            radius: canvas.width * 0.4
        },
        { 
            x: canvas.width * 0.8, 
            y: canvas.height * 0.9, 
            dx: -0.3, 
            dy: -0.6, 
            color: 'rgba(254, 135, 92, 0.4)',
            radius: canvas.width * 0.7
        },
        { 
            x: canvas.width * 0.5, 
            y: canvas.height * 0.5, 
            dx: 0.4, 
            dy: 0.5, 
            color: 'rgba(255, 200, 180, 0.3)',
            radius: canvas.width * 0.3
        },
        { 
            x: canvas.width * 0.3, 
            y: canvas.height * 0.3, 
            dx: -0.6, 
            dy: 0.4, 
            color: 'rgba(254, 160, 120, 0.35)',
            radius: canvas.width * 0.35
        }
    ];
    
    let time = 0;
    
    // Animation with time-based variation
    function animate() {
        time += 0.5; // Increased speed from 0.02 to 0.05
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Move points with slight sinusoidal variation
        points.forEach((point, index) => {
            // Change direction when hitting boundaries
            if (point.x <= 0 || point.x >= canvas.width) point.dx *= -1;
            if (point.y <= 0 || point.y >= canvas.height) point.dy *= -1;
            
            // Move points with time-based variation for more organic movement
            const timeOffset = index * 0.5;
            point.x += point.dx * 1.5 + Math.sin(time + timeOffset) * 0.5; // Increased movement speed
            point.y += point.dy * 1.5 + Math.cos(time + timeOffset) * 0.5; // Increased movement speed
        });
        
        // Draw gradients with blend modes for better visual effect
        ctx.globalCompositeOperation = 'normal';
        
        for (let i = 0; i < points.length; i++) {
            const gradient = ctx.createRadialGradient(
                points[i].x, points[i].y, 0,
                points[i].x, points[i].y, points[i].radius
            );
            
            gradient.addColorStop(0, points[i].color);
            gradient.addColorStop(0.5, points[i].color.replace(/0\.\d+\)$/, '0.2)'));
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Reset blend mode
        ctx.globalCompositeOperation = 'source-over';
        
        requestAnimationFrame(animate);
    }
    
    animate();
}