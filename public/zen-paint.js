const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io('/paint');

let points = [];
let isDrawing = false;
let myColor = `hsl(${Math.random() * 360}, 100%, 70%)`;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

window.addEventListener('mousedown', () => isDrawing = true);
window.addEventListener('mouseup', () => isDrawing = false);

window.addEventListener('touchstart', (e) => {
    isDrawing = true;
    handleDraw(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

window.addEventListener('touchend', () => isDrawing = false);

window.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        handleDraw(e.clientX, e.clientY);
    }
});

window.addEventListener('touchmove', (e) => {
    if (isDrawing && e.touches.length > 0) {
        handleDraw(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: false });

function handleDraw(x, y) {
    const point = {
        x: x,
        y: y,
        color: myColor,
        size: 10 + Math.random() * 10
    };
    socket.emit('draw', point);
}

socket.on('draw', (point) => {
    points.push({ ...point, alpha: 1 });
});

function draw() {
    // Fade background slowly for trail
    ctx.fillStyle = 'rgba(5, 5, 10, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        p.alpha -= 0.005;

        if (p.alpha <= 0) {
            points.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(')', `, ${p.alpha * 0.5})`).replace('hsl', 'hsla');
        ctx.fill();

        ctx.restore();
    }

    requestAnimationFrame(draw);
}

draw();
