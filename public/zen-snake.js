const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// --- CONFIGURATION ---
const FLAGS = [
    { code: 'vn', icon: '🇻🇳' }, { code: 'us', icon: '🇺🇸' }, { code: 'gb', icon: '🇬🇧' },
    { code: 'fr', icon: '🇫🇷' }, { code: 'de', icon: '🇩🇪' }, { code: 'it', icon: '🇮🇹' },
    { code: 'jp', icon: '🇯🇵' }, { code: 'kr', icon: '🇰🇷' }, { code: 'cn', icon: '🇨🇳' },
    { code: 'br', icon: '🇧🇷' }, { code: 'ru', icon: '🇷🇺' }, { code: 'ca', icon: '🇨🇦' },
    { code: 'au', icon: '🇦🇺' }, { code: 'in', icon: '🇮🇳' }, { code: 'es', icon: '🇪🇸' },
    { code: 'sg', icon: '🇸🇬' }, { code: 'th', icon: '🇹🇭' }, { code: 'my', icon: '🇲🇾' },
    { code: 'id', icon: '🇮🇩' }, { code: 'ph', icon: '🇵🇭' }
];

const SPECIAL_ICONS = ["🏳️‍🌈", "🏴‍☠️", "👾", "🐱", "🚀"];
const flagCache = {};

// Helper for gradient colors
function lerpColor(a, b, amount) {
    // If a or b is not hex (e.g. rgba), return a
    if (!a.startsWith('#') || !b.startsWith('#')) return a;
    try {
        const ah = parseInt(a.replace(/#/g, ''), 16),
            ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
            bh = parseInt(b.replace(/#/g, ''), 16),
            br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
            rr = ar + amount * (br - ar),
            rg = ag + amount * (bg - ag),
            rb = ab + amount * (bb - ab);
        return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
    } catch (e) { return a; }
}

const SKINS = [
    { id: 'red', type: 'solid', color: '#ff4444', name: 'Red' },
    { id: 'green', type: 'solid', color: '#44ff44', name: 'Green' },
    { id: 'blue', type: 'solid', color: '#4444ff', name: 'Blue' },
    { id: 'gold', type: 'striped', color: '#ffd700', color2: '#b8860b', name: 'Gold Stripe' },
    { id: 'bee', type: 'striped', color: '#ffd700', color2: '#111', name: 'Bumblebee' },
    { id: 'candy', type: 'striped', color: '#ff69b4', color2: '#fff', name: 'Candy' },
    { id: 'ocean', type: 'gradient', color: '#00bfff', color2: '#00008b', name: 'Ocean' },
    { id: 'toxic', type: 'spotted', color: '#ccff00', color2: '#000', name: 'Toxic' },
    { id: 'magma', type: 'spotted', color: '#ff4500', color2: '#800000', name: 'Magma' },
    { id: 'neon', type: 'glow', color: '#ff00ff', name: 'Neon' },
    { id: 'ghost', type: 'ghost', color: 'rgba(255,255,255,0.4)', name: 'Ghost' }
];

const socket = io('/snake');

// UI Elements
const loginOverlay = document.getElementById('login-overlay');
const usernameInput = document.getElementById('username');
const startBtn = document.getElementById('start-btn');
const scoresList = document.getElementById('scores-list');
const boostStatus = document.getElementById('boost-status');
const boostFill = document.getElementById('boost-fill');
const pickerModal = document.getElementById('picker-modal');
const pickerTitle = document.getElementById('picker-title');
const pickerGrid = document.getElementById('picker-grid');
const flagPreview = document.getElementById('flag-preview');
const skinPreview = document.getElementById('skin-preview');

// State
let players = {};
let targetPlayers = {};
let foods = [];
let worldRadius = 1500;
let myId = null;
let name = "";
let selectedSkin = SKINS[0];
let selectedFlag = 'vn';
let selectedFlagURL = `https://flagcdn.com/w80/vn.png`;
let isFlagImage = true;
let angle = 0;
let serverTime = Date.now();
let lastInputTime = 0;

// --- PICKER LOGIC ---
window.openPicker = (type) => {
    pickerModal.style.display = 'flex';
    pickerTitle.innerText = type === 'flag' ? 'Chọn Quốc Gia' : 'Chọn Ngoại Hình';
    renderPickerGrid(type);
};

window.closePicker = () => {
    pickerModal.style.display = 'none';
};

// Close modal on outside click
window.onclick = (event) => {
    if (event.target === pickerModal) closePicker();
};

function renderPickerGrid(type) {
    pickerGrid.innerHTML = '';
    const checkmark = '<div class="checkmark">✓</div>';

    if (type === 'flag') {
        // Country Flags
        FLAGS.forEach(flag => {
            const isSelected = selectedFlag === flag.code && isFlagImage;
            const div = document.createElement('div');
            div.className = `picker-option flag-item ${isSelected ? 'selected' : ''}`;
            div.innerHTML = `<img src="https://flagcdn.com/w80/${flag.code}.png"> ${isSelected ? checkmark : ''}`;
            div.onclick = () => selectFlag(flag.code, true);
            pickerGrid.appendChild(div);
        });
        // Special Icons
        SPECIAL_ICONS.forEach(icon => {
            const isSelected = selectedFlag === icon && !isFlagImage;
            const div = document.createElement('div');
            div.className = `picker-option flag-item emoji ${isSelected ? 'selected' : ''}`;
            div.innerHTML = `${icon} ${isSelected ? checkmark : ''}`;
            div.onclick = () => selectFlag(icon, false);
            pickerGrid.appendChild(div);
        });
    } else {
        // Preset Skins
        SKINS.forEach((skin, idx) => {
            const isSelected = selectedSkin.id === skin.id && selectedSkin.id !== 'custom';
            const div = document.createElement('div');
            div.className = `picker-option ${isSelected ? 'selected' : ''}`;
            div.innerHTML = `<div class="skin-item" style="background: ${getSkinBackground(skin)}"></div> ${isSelected ? checkmark : ''}`;
            div.onclick = () => selectSkin(idx);
            pickerGrid.appendChild(div);
        });

        // Integrated Custom Color Button
        const isCustom = selectedSkin.id === 'custom';
        const customDiv = document.createElement('div');
        customDiv.className = `picker-option ${isCustom ? 'selected' : ''}`;
        customDiv.setAttribute('data-id', 'custom-skin-btn');
        customDiv.style.background = isCustom ? selectedSkin.color : 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)';
        customDiv.style.boxShadow = isCustom ? `0 0 15px ${selectedSkin.color}` : 'none';

        // Use a wrapper for icon to allow better event targeting
        customDiv.innerHTML = `
            <span class="custom-icon" style="font-size: 1.5rem; pointer-events: none; filter: ${isCustom ? 'invert(1)' : 'none'}; mix-blend-mode: ${isCustom ? 'difference' : 'normal'};">🎨</span>
            ${isCustom ? checkmark : ''}
            <input type="color" id="hidden-picker" value="${isCustom ? selectedSkin.color : '#ffffff'}"
                style="position: absolute; top:0; left:0; width:100%; height:100%; opacity:0.01; cursor:pointer; padding:0; border:none; z-index:5;">
        `;

        pickerGrid.appendChild(customDiv);

        // Target the input directly inside the new div
        const colorInput = customDiv.querySelector('input');
        colorInput.oninput = (e) => selectCustomColor(e.target.value);
        colorInput.onchange = () => {
            // Optional: Close modal when they finish picking (click away from picker)
            // setTimeout(closePicker, 500);
        };
        colorInput.onclick = (e) => e.stopPropagation();
    }
}

function selectCustomColor(color) {
    selectedSkin = { id: 'custom', type: 'glow', color: color, name: 'Custom' };

    // Update main preview
    skinPreview.innerHTML = `<div style="width: 100%; height: 100%; border-radius: 50%; background: ${color}; box-shadow: 0 0 20px ${color}"></div>`;

    // Find the custom button in modal
    const customBtn = pickerGrid.querySelector('[data-id="custom-skin-btn"]');
    if (customBtn) {
        customBtn.style.background = color;
        customBtn.style.boxShadow = `0 0 15px ${color}`;
        customBtn.classList.add('selected');

        // Show checkmark if not there
        if (!customBtn.querySelector('.checkmark')) {
            const ck = document.createElement('div');
            ck.className = 'checkmark';
            ck.innerText = '✓';
            customBtn.appendChild(ck);
        }

        // Update icon invert logic
        const icon = customBtn.querySelector('.custom-icon');
        if (icon) {
            icon.style.filter = 'invert(1)';
            icon.style.mixBlendMode = 'difference';
        }

        // De-select others
        pickerGrid.querySelectorAll('.picker-option').forEach(opt => {
            if (opt !== customBtn) {
                opt.classList.remove('selected');
                const ck = opt.querySelector('.checkmark');
                if (ck) ck.remove();
            }
        });
    }
}

function selectFlag(val, isImg) {
    selectedFlag = val;
    isFlagImage = isImg;
    if (isImg) {
        selectedFlagURL = `https://flagcdn.com/w80/${val}.png`;
        flagPreview.innerHTML = `<img src="${selectedFlagURL}" style="width: 80%; border-radius: 4px;">`;
    } else {
        selectedFlagURL = null;
        flagPreview.innerHTML = `<span style="font-size: 2.5rem;">${val}</span>`;
    }
    renderPickerGrid('flag');
    setTimeout(closePicker, 600); // Slightly longer for "Checkmark" appreciation
}

function selectSkin(idx) {
    selectedSkin = SKINS[idx];
    skinPreview.innerHTML = `<div style="width: 100%; height: 100%; border-radius: 50%; background: ${getSkinBackground(selectedSkin)}"></div>`;
    renderPickerGrid('skin');
    setTimeout(closePicker, 600);
}


function initSelectionUI() {
    // Set Defaults
    selectFlag('vn', true);
    selectSkin(0);
}

function getSkinBackground(skin) {
    if (skin.type === 'solid' || skin.type === 'glow') return skin.color;
    if (skin.type === 'striped') return `repeating-linear-gradient(45deg, ${skin.color}, ${skin.color} 10px, ${skin.color2} 10px, ${skin.color2} 20px)`;
    if (skin.type === 'gradient') return `linear-gradient(135deg, ${skin.color}, ${skin.color2})`;
    if (skin.type === 'spotted') return `radial-gradient(circle at 30% 30%, ${skin.color2} 10%, ${skin.color} 10%)`;
    if (skin.type === 'ghost') return `radial-gradient(circle, rgba(255,255,255,0.8), rgba(255,255,255,0.1))`;
    return skin.color;
}

initSelectionUI();

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

startBtn.addEventListener('click', () => {
    name = usernameInput.value.trim();
    if (name) {
        loginOverlay.style.display = 'none';
        boostStatus.style.display = 'block';
        // Send flag info: if image, send the URL, else send the emoji
        const flagData = isFlagImage ? { type: 'img', val: selectedFlagURL } : { type: 'emoji', val: selectedFlag };
        socket.emit('join', { name, skin: selectedSkin, flag: flagData });
    }
});

socket.on('init', (data) => {
    myId = data.id;
});

// PC Mouse Control
window.addEventListener('mousemove', (e) => {
    if (!myId || !targetPlayers[myId]) return;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

    const now = Date.now();
    if (now - lastInputTime > 30) {
        socket.emit('input', { angle });
        lastInputTime = now;
    }
});

let leaderboardCounter = 0;
function updateLeaderboard() {
    leaderboardCounter++;
    if (leaderboardCounter % 10 !== 0) return; // Throttled

    const sorted = Object.values(targetPlayers).sort((a, b) => b.score - a.score).slice(0, 10);
    scoresList.innerHTML = sorted.map(p => {
        const flag = p.flag || { type: 'emoji', val: '' };
        const flagHTML = flag.type === 'img'
            ? `<img src="${flag.val}" style="width: 20px; height: 14px; vertical-align: middle; margin-right: 5px; border-radius: 2px;">`
            : `<span style="margin-right: 5px;">${flag.val}</span>`;

        return `
            <div class="score-item">
                <span style="color: ${p.skin ? p.skin.color : '#fff'}; font-weight: 600; display: flex; align-items: center;">
                    ${flagHTML} ${p.name}
                </span>
                <span style="font-weight: 600;">${p.score}</span>
            </div>
        `;
    }).join('');
}

// Mobile Joystick Logic
const joystick = { active: false, x: 0, y: 0, curX: 0, curY: 0 };
window.addEventListener('touchstart', (e) => {
    if (loginOverlay.style.display !== 'none') return;
    for (let i = 0; i < e.touches.length; i++) {
        const tx = e.touches[i].clientX;
        const ty = e.touches[i].clientY;
        if (tx > canvas.width / 2) {
            socket.emit('boost');
            continue;
        }
        if (!joystick.active) {
            joystick.active = true;
            joystick.x = tx; joystick.y = ty;
            joystick.curX = tx; joystick.curY = ty;
        }
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (!joystick.active) return;
    for (let i = 0; i < e.touches.length; i++) {
        const tx = e.touches[i].clientX;
        const ty = e.touches[i].clientY;
        if (tx < canvas.width / 2) {
            joystick.curX = tx;
            joystick.curY = ty;
            angle = Math.atan2(joystick.curY - joystick.y, joystick.curX - joystick.x);
            socket.emit('input', { angle });
        }
    }
    e.preventDefault();
}, { passive: false });

// Keyboard Control for Boost
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        socket.emit('boost');
    }
});

socket.on('gameState', (state) => {
    targetPlayers = state.players;
    foods = state.foods;
    worldRadius = state.worldRadius;
    serverTime = state.now;
    updateLeaderboard();
});

function draw() {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (loginOverlay.style.display !== 'none') {
        requestAnimationFrame(draw);
        return;
    }

    // Interpolate players
    Object.keys(targetPlayers).forEach(id => {
        const target = targetPlayers[id];
        if (!players[id]) {
            players[id] = JSON.parse(JSON.stringify(target));
        } else {
            const p = players[id];
            // Improved Lerp for head position
            p.x += (target.x - p.x) * 0.4;
            p.y += (target.y - p.y) * 0.4;
            p.angle = target.angle;
            p.score = target.score;
            p.boostUntil = target.boostUntil;
            p.boostCooldownUntil = target.boostCooldownUntil;
            p.skin = target.skin;
            p.name = target.name;
            p.flag = target.flag;
            p.color = target.color;

            // Interpolate body segments with higher factor
            if (!p.body || p.body.length !== target.body.length) {
                p.body = JSON.parse(JSON.stringify(target.body));
            } else {
                for (let i = 0; i < p.body.length; i++) {
                    p.body[i].x += (target.body[i].x - p.body[i].x) * 0.4;
                    p.body[i].y += (target.body[i].y - p.body[i].y) * 0.4;
                }
            }
        }
    });
    // Remove disconnected players
    Object.keys(players).forEach(id => {
        if (!targetPlayers[id]) delete players[id];
    });

    const me = players[myId] || players[socket.id];
    if (!me) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.font = '16px Outfit';
        ctx.fillText('Đang kết nối vào đấu trường...', canvas.width / 2, canvas.height / 2);
        requestAnimationFrame(draw);
        return;
    }

    const isMobile = canvas.width < 768;
    const zoom = isMobile ? 0.6 : 0.8; // Slightly more zoom out for better visibility

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-me.x, -me.y);

    // Draw Circular Boundary
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(worldRadius, worldRadius, worldRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Optimize Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    const step = 200;
    const startX = Math.floor((me.x - 1000) / step) * step;
    const endX = startX + 2000;
    const startY = Math.floor((me.y - 1000) / step) * step;
    const endY = startY + 2000;

    for (let x = Math.max(0, startX); x <= Math.min(worldRadius * 2, endX); x += step) {
        ctx.beginPath(); ctx.moveTo(x, Math.max(0, startY)); ctx.lineTo(x, Math.min(worldRadius * 2, endY)); ctx.stroke();
    }
    for (let y = Math.max(0, startY); y <= Math.min(worldRadius * 2, endY); y += step) {
        ctx.beginPath(); ctx.moveTo(Math.max(0, startX), y); ctx.lineTo(Math.min(worldRadius * 2, endX), y); ctx.stroke();
    }

    // Draw Foods with Glow (Optimized: only draw what's on screen)
    const viewMargin = 100;
    foods.forEach(f => {
        // Frustum culling for foods
        if (f.x < me.x - (canvas.width / 2) / zoom - viewMargin ||
            f.x > me.x + (canvas.width / 2) / zoom + viewMargin ||
            f.y < me.y - (canvas.height / 2) / zoom - viewMargin ||
            f.y > me.y + (canvas.height / 2) / zoom + viewMargin) {
            return;
        }

        const fSize = f.size || 8;
        ctx.save();
        ctx.fillStyle = f.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, fSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Draw Snakes with specialized skins
    Object.values(players).forEach(p => {
        const isBoosting = serverTime < p.boostUntil;
        const baseSize = 20 + Math.sqrt(p.score) * 2;
        const skin = p.skin || { type: 'solid', color: p.color || '#fff' };

        if (!p.body || p.body.length < 2) return;

        ctx.save();

        // Common Glow (Viền sáng)
        if (isBoosting) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = skin.color;
        } else {
            ctx.shadowBlur = 15;
            ctx.shadowColor = skin.color;
        }

        if (skin.type === 'ghost') ctx.globalAlpha = 0.3;

        // Specialized Drawing based on skin type
        if (skin.type === 'solid' || skin.type === 'glow' || skin.type === 'ghost') {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = baseSize;
            ctx.strokeStyle = skin.color;
            if (skin.type === 'glow' || isBoosting) {
                ctx.shadowBlur = 40;
                ctx.shadowColor = skin.color;
            }
            ctx.beginPath();
            ctx.moveTo(p.body[0].x, p.body[0].y);
            for (let i = 1; i < p.body.length; i++) {
                ctx.lineTo(p.body[i].x, p.body[i].y);
            }
            ctx.stroke();
        } else {
            // Draw segment by segment for complex skins
            for (let i = p.body.length - 1; i >= 0; i--) {
                const seg = p.body[i];
                const size = baseSize * (1 - (i / p.body.length) * 0.3); // Tapered tail

                ctx.beginPath();
                ctx.arc(seg.x, seg.y, size / 2, 0, Math.PI * 2);

                if (skin.type === 'striped') {
                    ctx.fillStyle = (i % 8 < 4) ? skin.color : (skin.color2 || '#333');
                } else if (skin.type === 'gradient') {
                    // Approximate gradient by blending over length
                    const ratio = i / p.body.length;
                    ctx.fillStyle = lerpColor(skin.color, skin.color2 || '#fff', ratio);
                } else if (skin.type === 'spotted') {
                    ctx.fillStyle = skin.color;
                    ctx.fill();
                    // Small spot on the segment
                    ctx.fillStyle = skin.color2 || '#000';
                    ctx.beginPath();
                    ctx.arc(seg.x + size / 4, seg.y - size / 4, size / 5, 0, Math.PI * 2);
                } else {
                    ctx.fillStyle = skin.color;
                }
                ctx.fill();
            }
        }

        // Draw Head
        const headSeg = p.body[0];
        ctx.shadowBlur = 0; // Reset shadow for eyes
        ctx.globalAlpha = (skin.type === 'ghost') ? 0.4 : 1;

        // Head background
        ctx.fillStyle = skin.color;
        ctx.beginPath();
        ctx.arc(headSeg.x, headSeg.y, baseSize / 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        const eyeSize = baseSize / 4;
        const eyeOffset = baseSize / 3;
        const lx = headSeg.x + Math.cos(p.angle - 0.5) * eyeOffset;
        const ly = headSeg.y + Math.sin(p.angle - 0.5) * eyeOffset;
        const rx = headSeg.x + Math.cos(p.angle + 0.5) * eyeOffset;
        const ry = headSeg.y + Math.sin(p.angle + 0.5) * eyeOffset;

        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(lx, ly, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx, ry, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.arc(lx + Math.cos(p.angle) * eyeSize / 2, ly + Math.sin(p.angle) * eyeSize / 2, eyeSize / 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx + Math.cos(p.angle) * eyeSize / 2, ry + Math.sin(p.angle) * eyeSize / 2, eyeSize / 2, 0, Math.PI * 2); ctx.fill();

        // Name & Flag Icon
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff";
        const nameSize = Math.max(14, baseSize / 2) / zoom;
        ctx.font = `bold ${nameSize}px Outfit`;
        ctx.textAlign = "center";

        const playerFlag = p.flag || { type: 'emoji', val: '' };
        const nameY = p.y - baseSize - (10 / zoom);

        if (playerFlag.type === 'img') {
            // Draw Flag Image to Canvas
            let flagImg = flagCache[playerFlag.val];
            if (!flagImg) {
                flagImg = new Image();
                flagImg.src = playerFlag.val;
                flagCache[playerFlag.val] = flagImg;
            }
            if (flagImg.complete) {
                const fW = nameSize * 1.4;
                const fH = nameSize;
                const totalW = fW + 5 + ctx.measureText(p.name).width;
                ctx.drawImage(flagImg, p.x - totalW / 2, nameY - fH + 2, fW, fH);
                ctx.fillText(p.name, p.x + (fW + 5) / 2, nameY);
            } else {
                ctx.fillText(p.name, p.x, nameY);
            }
        } else {
            const displayName = (playerFlag.val ? playerFlag.val + " " : "") + p.name;
            ctx.fillText(displayName, p.x, nameY);
        }
        ctx.restore();
    });

    ctx.restore();

    // UI Updates
    if (me) {
        const onCooldown = serverTime < me.boostCooldownUntil;
        const isBoosting = serverTime < me.boostUntil;
        if (isBoosting) {
            boostFill.style.width = '0%';
        } else if (onCooldown) {
            const cdPercent = ((me.boostCooldownUntil - serverTime) / 5000) * 100;
            boostFill.style.width = cdPercent + '%';
        } else {
            boostFill.style.width = '0%';
        }
    }

    drawMinimap();
    requestAnimationFrame(draw);
}

function drawMinimap() {
    const size = 150;
    const margin = 20;
    const x = canvas.width - size - margin;
    const y = canvas.height - size - margin;

    ctx.save();
    ctx.translate(x, y);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const scale = size / (worldRadius * 2);

    // Foods (simplified as dots)
    foods.forEach(f => {
        ctx.fillStyle = f.color;
        const fmSize = (f.size || 8) * 0.15;
        ctx.fillRect(f.x * scale, f.y * scale, fmSize, fmSize);
    });

    // Other Players
    Object.keys(players).forEach(id => {
        const p = players[id];
        if (id === myId) return;
        ctx.fillStyle = p.skin ? p.skin.color : '#fff';
        ctx.beginPath();
        ctx.arc(p.x * scale, p.y * scale, 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Self (Larger, bright dot)
    const me = players[myId];
    if (me) {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.arc(me.x * scale, me.y * scale, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

draw();
