const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

let players = {};
let targetPlayers = {}; // Server state for interpolation
let mouse = { x: 0, y: 0 };
let lastEmitTime = 0;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

// Handle mouse movement with throttling
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    if (socket.id && players[socket.id]) {
        players[socket.id].x = mouse.x;
        players[socket.id].y = mouse.y;
    }

    const now = Date.now();
    if (now - lastEmitTime > 40) {
        socket.emit('movement', { x: mouse.x, y: mouse.y });
        lastEmitTime = now;
    }
});

// Handle touch interaction
window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        socket.emit('movement', { x: mouse.x, y: mouse.y });
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        const now = Date.now();
        if (now - lastEmitTime > 40) {
            socket.emit('movement', { x: mouse.x, y: mouse.y });
            lastEmitTime = now;
        }
    }
}, { passive: false });

// Socket listeners
socket.on('currentPlayers', (serverPlayers) => {
    targetPlayers = serverPlayers;
});

// For backward compatibility or if server sends it
socket.on('playerMoved', (playerInfo) => {
    if (targetPlayers[playerInfo.id]) {
        targetPlayers[playerInfo.id].x = playerInfo.x;
        targetPlayers[playerInfo.id].y = playerInfo.y;
    }
});

socket.on('playerDisconnected', (id) => {
    delete targetPlayers[id];
    delete players[id];
});

function drawOrb(x, y, color, isSelf = false) {
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.arc(x, y, isSelf ? 15 : 12, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, isSelf ? 6 : 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    ctx.restore();
}

function animate() {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    Object.keys(targetPlayers).forEach(id => {
        const target = targetPlayers[id];
        if (!players[id]) {
            players[id] = { ...target };
        } else {
            // Lerp to server target for smooth movement
            const lerpFactor = id === socket.id ? 0.8 : 0.15;
            players[id].x += (target.x - players[id].x) * lerpFactor;
            players[id].y += (target.y - players[id].y) * lerpFactor;
        }

        drawOrb(players[id].x, players[id].y, players[id].color, id === socket.id);
    });

    // Cleanup players who are no longer in server state
    Object.keys(players).forEach(id => {
        if (!targetPlayers[id]) delete players[id];
    });

    requestAnimationFrame(animate);
}

animate();
