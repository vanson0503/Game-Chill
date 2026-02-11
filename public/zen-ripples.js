const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io('/ripples');

let ripples = [];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

canvas.addEventListener('mousedown', (e) => {
    createRipple(e.clientX, e.clientY);
});

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        createRipple(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: false });

function createRipple(x, y) {
    const ripple = {
        x: x,
        y: y,
        r: 0,
        maxR: 150 + Math.random() * 100,
        alpha: 1,
        color: `hsl(${Math.random() * 360}, 50%, 70%)`
    };
    socket.emit('addRipple', ripple);
}

socket.on('newRipple', (ripple) => {
    ripples.push(ripple);
});

function draw() {
    ctx.fillStyle = '#080c12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 2;
        r.alpha -= 0.01;

        if (r.alpha <= 0) {
            ripples.splice(i, 1);
            continue;
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = r.color.replace(')', `, ${r.alpha})`).replace('hsl', 'hsla');
        ctx.lineWidth = 2;
        ctx.stroke();

        // Secondary ring
        if (r.r > 20) {
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r - 20, 0, Math.PI * 2);
            ctx.strokeStyle = r.color.replace(')', `, ${r.alpha * 0.5})`).replace('hsl', 'hsla');
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    requestAnimationFrame(draw);
}

draw();
