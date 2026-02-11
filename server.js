const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Routes
const gameRoutes = ['zen-space', 'star-connect', 'zen-ripples', 'zen-paint', 'zen-blocks', 'zen-petals', 'zen-blast', 'zen-riddle', 'zen-snake', 'zen-pop', 'zen-catch', 'zen-soccer', 'zen-fishing', 'zen-garden', 'zen-clouds'];
gameRoutes.forEach(route => {
    app.get(`/${route}`, (req, res) => res.sendFile(path.join(__dirname, 'public', `${route}.html`)));
});

const fs = require('fs');
const REVIEWS_FILE = path.join(__dirname, 'reviews.json');

app.use(express.json());

// Helper functions for file operations
function getReviews() {
    try {
        if (!fs.existsSync(REVIEWS_FILE)) return [];
        const data = fs.readFileSync(REVIEWS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Read error:", err);
        return [];
    }
}

function saveReviews(data) {
    try {
        fs.writeFileSync(REVIEWS_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Write error:", err);
    }
}

app.get('/api/reviews', (req, res) => {
    const reviews = getReviews();
    res.json(reviews.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

app.post('/api/reviews', (req, res) => {
    const { name, rating, text } = req.body;
    if (!rating || !text) return res.status(400).json({ error: "Thiếu thông tin" });

    const reviews = getReviews();
    const newReview = {
        name: name || "Ẩn danh",
        rating: parseInt(rating),
        text,
        date: new Date().toISOString()
    };

    reviews.push(newReview);
    saveReviews(reviews);
    res.json(newReview);
});


// 1. Zen Space
const players = {};
io.on('connection', (socket) => {
    players[socket.id] = { x: Math.random() * 800, y: Math.random() * 600, color: `hsl(${Math.random() * 360}, 70%, 60%)`, id: socket.id };
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);
    socket.on('movement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            // Removed immediate broadcast to prevent flooding
        }
    });
    socket.on('disconnect', () => { delete players[socket.id]; io.emit('playerDisconnected', socket.id); });
});

// Periodic broadcast for Zen Space (45ms)
setInterval(() => {
    if (Object.keys(players).length > 0) {
        io.emit('currentPlayers', players);
    }
}, 45);

// 2. Star Connect
const stars = [];
const starNamespace = io.of('/stars');
starNamespace.on('connection', (socket) => {
    socket.emit('initStars', stars);
    socket.on('addStar', (star) => { stars.push(star); if (stars.length > 80) stars.shift(); starNamespace.emit('newStar', star); });
});
setInterval(() => {
    stars.forEach(s => { s.x += s.vx; s.y += s.vy; if (s.x < 0 || s.x > 2000) s.vx *= -1; if (s.y < 0 || s.y > 2000) s.vy *= -1; });
    starNamespace.emit('updateStars', stars);
}, 2000);

// 3. Zen Ripples
const rippleNamespace = io.of('/ripples');
rippleNamespace.on('connection', (socket) => {
    socket.on('addRipple', (ripple) => rippleNamespace.emit('newRipple', ripple));
});

// 4. Zen Paint
const paintNamespace = io.of('/paint');
paintNamespace.on('connection', (socket) => {
    socket.on('draw', (point) => paintNamespace.emit('draw', point));
});

// 5. Zen Blocks
const blocks = Array.from({ length: 15 }, (_, i) => ({
    id: i, x: 100 + Math.random() * 600, y: 100 + Math.random() * 400,
    w: 60 + Math.random() * 40, h: 40 + Math.random() * 20, color: `hsl(${200 + Math.random() * 40}, 60%, 50%)`
}));
const blockNamespace = io.of('/blocks');
blockNamespace.on('connection', (socket) => {
    socket.emit('initBlocks', blocks);
    socket.on('moveBlock', (data) => {
        const b = blocks.find(b => b.id === data.id);
        if (b) { b.x = data.x; b.y = data.y; socket.broadcast.emit('updateBlocks', [b]); }
    });
});

// 6. Zen Petals
let petals = Array.from({ length: 50 }, () => ({
    x: Math.random() * 1000, y: Math.random() * 1000, vx: (Math.random() - 0.5), vy: 0.5 + Math.random(),
    angle: Math.random() * Math.PI * 2, va: (Math.random() - 0.5) * 0.02, color: `hsla(${340 + Math.random() * 40}, 80%, 80%, 0.8)`
}));
const petalNamespace = io.of('/petals');
petalNamespace.on('connection', (socket) => {
    socket.emit('initPetals', petals);
    socket.on('wind', (mouse) => {
        petals.forEach(p => {
            const dx = mouse.x - p.x, dy = mouse.y - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < 150) { p.vx += dx * 0.001; p.vy += dy * 0.001; }
        });
    });
});
setInterval(() => {
    petals.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.angle += p.va; p.vx *= 0.99; p.vy *= 0.99;
        if (p.x < -100) p.x = 2100; if (p.x > 2100) p.x = -100;
        if (p.y < -100) p.y = 2100; if (p.y > 2100) p.y = -100;
    });
    petalNamespace.emit('updatePetals', petals);
}, 50);

// 7. Zen Blast (Block Blast Style)
let blastState = {
    grid: Array(8).fill().map(() => Array(8).fill(null)),
    pieces: [],
    score: 0
};
const SHAPES = [
    { shape: [[1, 1], [1, 1]], color: '#ff6b6b' },
    { shape: [[1, 1, 1]], color: '#4ecdc4' },
    { shape: [[1], [1], [1]], color: '#45b7d1' },
    { shape: [[1, 0], [1, 0], [1, 1]], color: '#f9ca24' },
    { shape: [[1]], color: '#6ab04c' }
];
function generatePieces() {
    return Array(3).fill().map(() => {
        const s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        return { ...s, id: Math.random() };
    });
}
blastState.pieces = generatePieces();

const blastNamespace = io.of('/blast');
blastNamespace.on('connection', (socket) => {
    socket.emit('updateGameState', blastState);
    socket.on('placePiece', (data) => {
        const piece = blastState.pieces[data.pieceIdx];
        if (!piece) return;
        // Check fit
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c]) {
                    const nr = data.r + r, nc = data.c + c;
                    if (nr >= 8 || nc >= 8 || blastState.grid[nr][nc]) return;
                }
            }
        }
        // Place
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c]) blastState.grid[data.r + r][data.c + c] = piece.color;
            }
        }
        blastState.pieces[data.pieceIdx] = null;
        if (blastState.pieces.every(p => p === null)) blastState.pieces = generatePieces();

        // Clear lines
        let linesCleared = 0;
        // Rows
        for (let r = 0; r < 8; r++) { if (blastState.grid[r].every(cell => cell !== null)) { blastState.grid[r] = Array(8).fill(null); linesCleared++; } }
        // Cols
        for (let c = 0; c < 8; c++) {
            let full = true;
            for (let r = 0; r < 8; r++) if (blastState.grid[r][c] === null) full = false;
            if (full) { for (let r = 0; r < 8; r++) blastState.grid[r][c] = null; linesCleared++; }
        }
        if (linesCleared > 0) blastState.score += linesCleared * 10;

        blastNamespace.emit('updateGameState', blastState);
    });
});

// 8. Zen Riddle
const get1000Riddles = require('./riddles');
let riddleSeries = [];
let currentRiddlePosition = 0;

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function initializeRiddleSeries() {
    // Lấy bộ 1000 câu đố từ module
    riddleSeries = shuffle(get1000Riddles());
    currentRiddlePosition = 0;
    console.log("Đã khởi tạo hệ thống 1000 câu đố duy nhất.");
}

initializeRiddleSeries();

const riddleNamespace = io.of('/riddle');
riddleNamespace.on('connection', (socket) => {
    // Gửi câu đố hiện tại cho người mới vào
    socket.emit('newRiddle', riddleSeries[currentRiddlePosition].q);

    socket.on('guess', (text) => {
        const currentRiddle = riddleSeries[currentRiddlePosition];
        riddleNamespace.emit('message', { user: socket.id.substring(0, 5), text: text });

        if (text.toLowerCase() === currentRiddle.a.toLowerCase()) {
            riddleNamespace.emit('solved', { user: socket.id.substring(0, 5), answer: text });

            // Chuyển sang câu tiếp theo
            currentRiddlePosition++;

            // Nếu đã hết 1000 câu thì gen lại
            if (currentRiddlePosition >= 1000) {
                initializeRiddleSeries();
            }

            setTimeout(() => {
                riddleNamespace.emit('newRiddle', riddleSeries[currentRiddlePosition].q);
            }, 2000);
        }
    });
});

app.get('/zen-snake', (req, res) => res.sendFile(path.join(__dirname, 'public', 'zen-snake.html')));

// 9. Zen Snake
const snakeNamespace = io.of('/snake');
let snakes = {};
let foods = [];
const WORLD_RADIUS = 1500;
const MAX_FOOD = 400; // Increased food count

function spawnFood() {
    if (foods.length < MAX_FOOD) {
        const r = Math.sqrt(Math.random()) * WORLD_RADIUS;
        const theta = Math.random() * Math.PI * 2;
        const fSize = 4 + Math.random() * 8; // Random sizes
        foods.push({
            id: Math.random(),
            x: WORLD_RADIUS + r * Math.cos(theta),
            y: WORLD_RADIUS + r * Math.sin(theta),
            color: `hsl(${Math.random() * 360}, 100%, 70%)`,
            size: fSize,
            value: Math.floor(fSize * 2)
        });
    }
}

// Initial food
for (let i = 0; i < 200; i++) spawnFood();

snakeNamespace.on('connection', (socket) => {
    socket.on('join', (data) => {
        const startR = Math.random() * (WORLD_RADIUS * 0.8);
        const startTheta = Math.random() * Math.PI * 2;
        const startX = WORLD_RADIUS + startR * Math.cos(startTheta);
        const startY = WORLD_RADIUS + startR * Math.sin(startTheta);

        snakes[socket.id] = {
            id: socket.id,
            name: (data.name || "Khách").substring(0, 15),
            body: [],
            x: startX,
            y: startY,
            angle: Math.random() * Math.PI * 2,
            score: 0,
            baseSpeed: 6,
            speed: 6,
            length: 30,
            boostUntil: 0,
            boostCooldownUntil: 0,
            skin: data.skin || { type: 'solid', color: `hsl(${Math.random() * 360}, 70%, 60%)` },
            flag: data.flag || "",
            color: (data.skin && data.skin.color) ? data.skin.color : `hsl(${Math.random() * 360}, 70%, 60%)`
        };

        for (let i = 0; i < 30; i++) {
            snakes[socket.id].body.push({ x: startX, y: startY });
        }
        socket.emit('init', { id: socket.id });
    });

    socket.on('input', (data) => {
        const s = snakes[socket.id];
        if (s && typeof data.angle === 'number') {
            s.angle = data.angle;
        }
    });

    socket.on('boost', () => {
        const s = snakes[socket.id];
        if (s && Date.now() > s.boostCooldownUntil) {
            s.boostUntil = Date.now() + 2500; // Increased to 2.5s
            s.boostCooldownUntil = Date.now() + 3000; // Reduced to 3s cooldown
        }
    });

    socket.on('disconnect', () => {
        delete snakes[socket.id];
    });
});

// Main Snake Loop - Throttled to 40ms for slightly better responsiveness
setInterval(() => {
    const snakeList = Object.values(snakes);

    snakeList.forEach(s => {
        // Boost handling
        if (Date.now() < s.boostUntil) {
            s.speed = s.baseSpeed * 2;
            s.boostPenaltyCounter = (s.boostPenaltyCounter || 0) + 40;
            if (s.boostPenaltyCounter >= 250) {
                if (s.score > 10) {
                    const pointsToLose = 1 + Math.floor(s.score / 200);
                    s.score = Math.max(0, s.score - pointsToLose);
                    if (s.length > 30) s.length = Math.max(30, s.length - (pointsToLose * 0.4));
                }
                s.boostPenaltyCounter = 0;
            }
        } else {
            s.speed = s.baseSpeed;
            s.boostPenaltyCounter = 0;
        }

        // Movement
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;

        // Circular World Boundaries
        const dx = s.x - WORLD_RADIUS;
        const dy = s.y - WORLD_RADIUS;
        const distSq = dx * dx + dy * dy;
        if (distSq > (WORLD_RADIUS - 20) ** 2) {
            const angleToCenter = Math.atan2(dy, dx);
            s.x = WORLD_RADIUS + (WORLD_RADIUS - 20) * Math.cos(angleToCenter);
            s.y = WORLD_RADIUS + (WORLD_RADIUS - 20) * Math.sin(angleToCenter);
        }

        // Optimized Magnetism
        foods.forEach(f => {
            const fdx = s.x - f.x;
            const fdy = s.y - f.y;
            const fdistSq = fdx * fdx + fdy * fdy;
            if (fdistSq < 3600) {
                f.x += (s.x - f.x) * 0.15;
                f.y += (s.y - f.y) * 0.15;
            }
        });

        s.body.unshift({ x: s.x, y: s.y });
        if (s.body.length > s.length) s.body.pop();

        // Optimized Food Eating
        const headSize = 25 + Math.sqrt(s.score) * 1.5;
        const headSizeSq = (headSize * headSize) / 2;
        foods = foods.filter(f => {
            const fdx = s.x - f.x;
            const fdy = s.y - f.y;
            // Radius of collision combines snake head and food size
            const combinedRadiusSq = (headSize / 2 + (f.size || 8)) ** 2 * 0.8;
            if (fdx * fdx + fdy * fdy < combinedRadiusSq) {
                s.score += f.value || 10;
                s.length += (f.size || 8) * 0.3;
                return false;
            }
            return true;
        });
    });

    // Respawn food
    while (foods.length < 250) spawnFood();

    // Optimized Multi-snake Collision
    for (let i = 0; i < snakeList.length; i++) {
        const s1 = snakeList[i];
        if (!snakes[s1.id]) continue;

        for (let j = 0; j < snakeList.length; j++) {
            const s2 = snakeList[j];
            if (!snakes[s2.id] || s1.id === s2.id) continue;

            const headSize1 = 15 + Math.sqrt(s1.score);
            const segSize = 15 + Math.sqrt(s2.score);
            const colDistSq = ((headSize1 + segSize) / 2.5) ** 2;

            // Only check nearby segments or skip more
            for (let k = 0; k < s2.body.length; k += 6) {
                const seg = s2.body[k];
                const sdx = s1.x - seg.x;
                const sdy = s1.y - seg.y;
                if (sdx * sdx + sdy * sdy < colDistSq) {
                    killSnake(s1.id);
                    break;
                }
            }
            if (!snakes[s1.id]) break;
        }
    }

    // Bandwidth Optimization: Send sampled body segments
    // Instead of sending 300 segments, we send every 3rd one. 
    // The client draws lines between them, so it's still smooth.
    const optimizedPlayers = {};
    Object.keys(snakes).forEach(id => {
        const s = snakes[id];
        optimizedPlayers[id] = {
            ...s,
            body: s.body.filter((_, idx) => idx % 3 === 0 || idx === 0)
        };
    });

    snakeNamespace.emit('gameState', {
        players: optimizedPlayers,
        foods: foods,
        worldRadius: WORLD_RADIUS,
        now: Date.now()
    });
}, 45);

function killSnake(id) {
    const s = snakes[id];
    if (!s) return;

    // Food drop capped to prevent overwhelming the server
    const dropAmount = Math.min(Math.floor(s.score * 0.2 / 10), 40);
    for (let i = 0; i < dropAmount; i++) {
        const segIdx = Math.floor(Math.random() * s.body.length);
        const seg = s.body[segIdx] || { x: s.x, y: s.y };
        if (foods.length < MAX_FOOD) {
            foods.push({
                id: Math.random(),
                x: seg.x + (Math.random() - 0.5) * 40,
                y: seg.y + (Math.random() - 0.5) * 40,
                color: s.color
            });
        }
    }

    // Reset snake
    const startR = Math.random() * (WORLD_RADIUS * 0.8);
    const startTheta = Math.random() * Math.PI * 2;
    s.x = WORLD_RADIUS + startR * Math.cos(startTheta);
    s.y = WORLD_RADIUS + startR * Math.sin(startTheta);
    s.body = Array(30).fill({ x: s.x, y: s.y });
    s.score = 0;
    s.length = 30;
    s.boostUntil = 0;
    s.boostCooldownUntil = 0;
}

// 10. Zen Pop
let popScore = 0;
let balloons = [];
const popNamespace = io.of('/pop');
function spawnBalloon() {
    if (balloons.length < 15) {
        balloons.push({
            id: Math.random(),
            x: Math.random() * 100, // percentage
            y: 110, // start below screen
            speed: 0.2 + Math.random() * 0.5,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            size: 40 + Math.random() * 40
        });
    }
}
popNamespace.on('connection', (socket) => {
    socket.emit('init', { score: popScore, balloons });
    socket.on('pop', (id) => {
        const idx = balloons.findIndex(b => b.id === id);
        if (idx !== -1) {
            balloons.splice(idx, 1);
            popScore += 10;
            popNamespace.emit('popped', { id, score: popScore });
        }
    });
});
setInterval(() => {
    balloons = balloons.filter(b => {
        b.y -= b.speed;
        return b.y >= -20;
    });
    if (Math.random() < 0.1) spawnBalloon();
    popNamespace.emit('update', balloons);
}, 60);

// 11. Zen Catch
let catchScore = 0;
let fallingItems = [];
const catchNamespace = io.of('/catch');
function spawnItem() {
    if (fallingItems.length < 10) {
        fallingItems.push({
            id: Math.random(),
            x: Math.random() * 100,
            y: -10,
            speed: 0.3 + Math.random() * 0.4,
            type: Math.random() > 0.8 ? 'gold' : 'normal'
        });
    }
}
catchNamespace.on('connection', (socket) => {
    socket.emit('init', { score: catchScore, items: fallingItems });
    socket.on('catch', (id) => {
        const idx = fallingItems.findIndex(item => item.id === id);
        if (idx !== -1) {
            const item = fallingItems[idx];
            catchScore += item.type === 'gold' ? 50 : 10;
            fallingItems.splice(idx, 1);
            catchNamespace.emit('caught', { id, score: catchScore });
        }
    });
});
setInterval(() => {
    fallingItems = fallingItems.filter(item => {
        item.y += item.speed;
        return item.y <= 110;
    });
    if (Math.random() < 0.05) spawnItem();
    catchNamespace.emit('update', fallingItems);
}, 60);

// 12. Zen Soccer
let soccerState = {
    ball: { x: 500, y: 300, vx: 0, vy: 0 },
    players: {},
    score: { left: 0, right: 0 }
};
const soccerNamespace = io.of('/soccer');
soccerNamespace.on('connection', (socket) => {
    soccerState.players[socket.id] = { x: 500, y: 300, color: `hsl(${Math.random() * 360}, 70%, 50%)` };
    socket.emit('init', soccerState);
    socket.on('move', (pos) => {
        if (soccerState.players[socket.id]) {
            soccerState.players[socket.id].x = pos.x;
            soccerState.players[socket.id].y = pos.y;
        }
    });
    socket.on('disconnect', () => { delete soccerState.players[socket.id]; });
});
setInterval(() => {
    // Ball physics
    const b = soccerState.ball;
    b.x += b.vx; b.y += b.vy;
    b.vx *= 0.98; b.vy *= 0.98; // Friction

    // Wall bounce
    if (b.x < 20 || b.x > 980) {
        if (b.y > 200 && b.y < 400) { // Goal area
            if (b.x < 20) soccerState.score.right++;
            else soccerState.score.left++;
            b.x = 500; b.y = 300; b.vx = 0; b.vy = 0;
            soccerNamespace.emit('goal', soccerState.score);
        } else {
            b.vx *= -1; b.x = b.x < 20 ? 20 : 980;
        }
    }
    if (b.y < 20 || b.y > 580) { b.vy *= -1; b.y = b.y < 20 ? 20 : 580; }

    // Player collision with ball
    Object.values(soccerState.players).forEach(p => {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
            const angle = Math.atan2(dy, dx);
            const force = (40 - dist) * 0.5 + 5;
            b.vx += Math.cos(angle) * force;
            b.vy += Math.sin(angle) * force;
        }
    });

    soccerNamespace.emit('update', { ball: b, players: soccerState.players });
}, 30);

// 13. Zen Fishing
let fishingTotalKg = 0;
let fishPool = [];
let fishingPlayers = {};
const SEATS = [
    { x: 300, y: 750 }, { x: 450, y: 720 }, { x: 600, y: 750 },
    { x: 750, y: 720 }, { x: 900, y: 750 }
];

const fishingNamespace = io.of('/fishing');
function spawnFish() {
    if (fishPool.length < 18) { // More fish
        const weight = 0.5 + Math.random() * 14.5;
        fishPool.push({
            id: Math.random(),
            x: -100,
            y: 100 + Math.random() * 450, // Fish in upper area
            speed: 0.4 + Math.random() * 1.8,
            weight: weight,
            type: weight > 12 ? 'Legendary' : (weight > 7 ? 'Rare' : 'Common'),
            icon: weight > 12 ? '🦈' : (weight > 7 ? '🐠' : '🐟')
        });
    }
}

fishingNamespace.on('connection', (socket) => {
    socket.on('join', (name) => {
        // Find empty seat
        const occupiedSeats = Object.values(fishingPlayers).map(p => p.seatIdx);
        let seatIdx = 0;
        while (occupiedSeats.includes(seatIdx) && seatIdx < SEATS.length - 1) seatIdx++;

        fishingPlayers[socket.id] = {
            id: socket.id,
            name: name || "Ngư dân",
            seatIdx: seatIdx,
            pos: SEATS[seatIdx],
            state: 'idle' // idle, casting, hooked
        };
        socket.emit('init', { totalKg: fishingTotalKg, fish: fishPool, players: fishingPlayers, myId: socket.id });
        socket.broadcast.emit('playerJoined', fishingPlayers[socket.id]);
    });

    socket.on('cast', (data) => {
        if (fishingPlayers[socket.id]) {
            fishingPlayers[socket.id].state = 'casting';
            fishingPlayers[socket.id].target = data;
            fishingNamespace.emit('playerUpdate', fishingPlayers[socket.id]);
        }
    });

    socket.on('catch', (data) => {
        fishingTotalKg += data.weight;
        const p = fishingPlayers[socket.id];
        if (p) p.state = 'idle';
        fishingNamespace.emit('caught', {
            user: p ? p.name : "Ai đó",
            weight: data.weight,
            totalKg: fishingTotalKg,
            type: data.type,
            id: socket.id
        });
        // Remove fish from pool
        fishPool = fishPool.filter(f => f.id !== data.fishId);
    });

    socket.on('disconnect', () => {
        delete fishingPlayers[socket.id];
        fishingNamespace.emit('playerLeft', socket.id);
    });
});

setInterval(() => {
    fishPool = fishPool.filter(f => {
        f.x += f.speed;
        return f.x <= 1200;
    });
    if (Math.random() < 0.05) spawnFish();
    fishingNamespace.emit('update', fishPool);
}, 60);

// 14. Zen Garden
let plants = [];
const gardenNamespace = io.of('/garden');
gardenNamespace.on('connection', (socket) => {
    socket.emit('init', plants);
    socket.on('plant', (p) => {
        const newPlant = { ...p, id: Math.random(), growth: 0, life: 100 };
        plants.push(newPlant);
        if (plants.length > 50) plants.shift();
        gardenNamespace.emit('newPlant', newPlant);
    });
    socket.on('water', (id) => {
        const p = plants.find(p => p.id === id);
        if (p) { p.growth = Math.min(1, p.growth + 0.1); gardenNamespace.emit('updatePlant', p); }
    });
});

// 15. Zen Clouds
let cloudPlayers = {};
const cloudsNamespace = io.of('/clouds');
cloudsNamespace.on('connection', (socket) => {
    cloudPlayers[socket.id] = { x: 500, y: 500, color: `hsl(${Math.random() * 360}, 70%, 70%)` };
    socket.emit('init', cloudPlayers);
    socket.on('move', (data) => {
        if (cloudPlayers[socket.id]) {
            cloudPlayers[socket.id].x = data.x;
            cloudPlayers[socket.id].y = data.y;
            socket.broadcast.emit('updatePlayer', { id: socket.id, ...cloudPlayers[socket.id] });
        }
    });
    socket.on('disconnect', () => {
        delete cloudPlayers[socket.id];
        cloudsNamespace.emit('removePlayer', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
