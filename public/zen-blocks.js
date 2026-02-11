const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io('/blocks');

let blocks = [];
let draggingBlock = null;
let offset = { x: 0, y: 0 };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

socket.on('initBlocks', (serverBlocks) => {
    blocks = serverBlocks;
});

socket.on('updateBlocks', (serverBlocks) => {
    // Only update blocks we aren't dragging
    serverBlocks.forEach(sb => {
        const local = blocks.find(lb => lb.id === sb.id);
        if (local && (!draggingBlock || draggingBlock.id !== local.id)) {
            local.x = sb.x;
            local.y = sb.y;
        } else if (!local) {
            blocks.push(sb);
        }
    });
});

window.addEventListener('mousedown', (e) => {
    handleStart(e.clientX, e.clientY);
});

window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: false });

function handleStart(mouseX, mouseY) {
    // Find block under cursor
    for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
            draggingBlock = b;
            offset.x = mouseX - b.x;
            offset.y = mouseY - b.y;
            break;
        }
    }
}

window.addEventListener('mousemove', (e) => {
    handleMove(e.clientX, e.clientY);
});

window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: false });

function handleMove(x, y) {
    if (draggingBlock) {
        draggingBlock.x = x - offset.x;
        draggingBlock.y = y - offset.y;
        socket.emit('moveBlock', { id: draggingBlock.id, x: draggingBlock.x, y: draggingBlock.y });
    }
}

window.addEventListener('mouseup', () => {
    draggingBlock = null;
});

window.addEventListener('touchend', () => {
    draggingBlock = null;
});

function draw() {
    ctx.fillStyle = '#0a0a1f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    blocks.forEach(b => {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = b.color;

        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.8;
        // Rounded rect for premium feel
        const r = 8;
        ctx.beginPath();
        ctx.moveTo(b.x + r, b.y);
        ctx.lineTo(b.x + b.w - r, b.y);
        ctx.quadraticCurveTo(b.x + b.w, b.y, b.x + b.w, b.y + r);
        ctx.lineTo(b.x + b.w, b.y + b.h - r);
        ctx.quadraticCurveTo(b.x + b.w, b.y + b.h, b.x + b.w - r, b.y + b.h);
        ctx.lineTo(b.x + r, b.y + b.h);
        ctx.quadraticCurveTo(b.x, b.y + b.h, b.x, b.y + b.h - r);
        ctx.lineTo(b.x, b.y + r);
        ctx.quadraticCurveTo(b.x, b.y, b.x + r, b.y);
        ctx.fill();

        // Inner glow/border
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    });

    requestAnimationFrame(draw);
}

draw();
