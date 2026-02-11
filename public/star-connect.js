const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io('/stars'); // Use namespace for separate logic

let stars = [];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

window.addEventListener('mousedown', (e) => {
    createStar(e.clientX, e.clientY);
});

window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        createStar(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: false });

function createStar(x, y) {
    const star = {
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 3 + 1,
        color: `hsl(${200 + Math.random() * 60}, 80%, 70%)`
    };
    socket.emit('addStar', star);
}

socket.on('initStars', (serverStars) => {
    stars = serverStars;
});

socket.on('newStar', (star) => {
    stars.push(star);
});

socket.on('updateStars', (serverStars) => {
    // Basic sync
    stars = serverStars;
});

function draw() {
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw stars
    for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Simple drift
        s.x += s.vx;
        s.y += s.vy;

        // Bounce
        if (s.x < 0 || s.x > canvas.width) s.vx *= -1;
        if (s.y < 0 || s.y > canvas.height) s.vy *= -1;

        // Draw connections
        for (let j = i + 1; j < stars.length; j++) {
            const s2 = stars[j];
            const dx = s.x - s2.x;
            const dy = s.y - s2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 150) {
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s2.x, s2.y);
                ctx.strokeStyle = `rgba(150, 180, 255, ${1 - dist / 150})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }

        // Draw star
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = s.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    requestAnimationFrame(draw);
}

draw();
