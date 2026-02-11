const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io('/petals');

let petals = [];
let mouse = { x: -100, y: -100 };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

socket.on('initPetals', (serverPetals) => {
    petals = serverPetals;
});

socket.on('updatePetals', (serverPetals) => {
    petals = serverPetals;
});

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    socket.emit('wind', { x: mouse.x, y: mouse.y });
});

window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        socket.emit('wind', { x: mouse.x, y: mouse.y });
    }
}, { passive: false });

function draw() {
    ctx.fillStyle = '#050a05'; // Deep dark green
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    petals.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        // Petal shape
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-5, -5, -5, -15, 0, -20);
        ctx.bezierCurveTo(5, -15, 5, -5, 0, 0);

        ctx.fillStyle = p.color;
        ctx.fill();

        ctx.restore();
    });

    requestAnimationFrame(draw);
}

draw();
