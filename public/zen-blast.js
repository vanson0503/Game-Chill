const canvas = document.getElementById('gameCanvas'); // Placeholder if needed, but we use DOM for this one
const socket = io('/blast');

const boardEl = document.getElementById('board');
const piecesEl = document.getElementById('pieces-container');
const scoreEl = document.getElementById('score');

let grid = Array(8).fill().map(() => Array(8).fill(null));
let availablePieces = [];

// Initialize board
for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        boardEl.appendChild(cell);
    }
}

socket.on('updateGameState', (data) => {
    grid = data.grid;
    availablePieces = data.pieces;
    scoreEl.innerText = data.score;
    render();
});

let activeDraggingPiece = null;
let dragStartX, dragStartY;

function render() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const r = cell.dataset.r;
        const c = cell.dataset.c;
        const val = grid[r][c];
        cell.style.background = val ? val : 'rgba(255,255,255,0.03)';
        cell.classList.toggle('filled', !!val);
    });

    piecesEl.innerHTML = '';
    availablePieces.forEach((p, idx) => {
        if (!p) return;
        const pWrapper = document.createElement('div');
        pWrapper.className = 'piece-wrapper';
        pWrapper.style.width = '120px'; // Consistent width to prevent layout shifts
        pWrapper.style.height = '120px';
        pWrapper.style.display = 'flex';
        pWrapper.style.justifyContent = 'center';
        pWrapper.style.alignItems = 'center';
        pWrapper.style.touchAction = 'none';

        const pEl = document.createElement('div');
        pEl.className = 'piece';
        pEl.style.display = 'grid';
        pEl.style.gridTemplateColumns = `repeat(${p.shape[0].length}, 25px)`;
        pEl.style.transition = 'transform 0.1s ease-out, opacity 0.2s';
        pEl.style.cursor = 'grab';

        p.shape.forEach((row, r) => {
            row.forEach((val, c) => {
                const pc = document.createElement('div');
                pc.className = 'p-cell';
                pc.style.width = '25px';
                pc.style.height = '25px';
                pc.style.background = val ? p.color : 'transparent';
                pc.style.borderRadius = '4px';
                pEl.appendChild(pc);
            });
        });

        const startDrag = (x, y) => {
            const rect = pEl.getBoundingClientRect();
            // Calculate where the piece is relative to the touch point
            activeDraggingPiece = {
                idx,
                element: pEl,
                ...p,
                rect,
                touchOffsetX: x - (rect.left + rect.width / 2),
                touchOffsetY: y - (rect.top + rect.height / 2)
            };

            pEl.style.position = 'fixed';
            pEl.style.left = rect.left + 'px';
            pEl.style.top = rect.top + 'px';
            pEl.style.margin = '0';
            pEl.style.zIndex = '1000';
            pEl.style.pointerEvents = 'none';
            pEl.style.transition = 'none'; // Instant follow during drag

            updatePiecePos(x, y);
        };

        pEl.addEventListener('mousedown', (e) => {
            startDrag(e.clientX, e.clientY);
            e.preventDefault();
        });
        pEl.addEventListener('touchstart', (e) => {
            startDrag(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault();
        }, { passive: false });

        pWrapper.appendChild(pEl);
        piecesEl.appendChild(pWrapper);
    });
}

function updatePiecePos(x, y) {
    if (activeDraggingPiece) {
        const p = activeDraggingPiece;
        // current mouse/touch minus where we started on the piece
        const dx = x - p.touchOffsetX - p.rect.left - (p.rect.width / 2);
        const dy = y - p.touchOffsetY - p.rect.top - (p.rect.height / 2);

        // Scale 1.8 to match 45px board cells from 25px original
        // Using translate3d for better performance
        p.element.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.8)`;
        p.element.style.opacity = '0.9';
    }
}

window.addEventListener('mousemove', (e) => {
    if (activeDraggingPiece) updatePiecePos(e.clientX, e.clientY);
});
window.addEventListener('touchmove', (e) => {
    if (activeDraggingPiece) {
        updatePiecePos(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
    }
}, { passive: false });

window.addEventListener('mouseup', (e) => handleDragEnd(e.clientX, e.clientY));
window.addEventListener('touchend', (e) => {
    if (e.changedTouches.length > 0) {
        handleDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
});

function handleDragEnd(x, y) {
    if (activeDraggingPiece) {
        const p = activeDraggingPiece;
        const rect = p.element.getBoundingClientRect();

        // Center of the top-left cell of the scaled piece
        // Since we scale(1.8), each 25px cell becomes 45px
        const dropX = rect.left + 22;
        const dropY = rect.top + 22;

        const target = document.elementFromPoint(dropX, dropY)?.closest('.cell');

        if (target) {
            socket.emit('placePiece', {
                pieceIdx: p.idx,
                r: parseInt(target.dataset.r),
                c: parseInt(target.dataset.c)
            });
        }

        activeDraggingPiece = null;
        render(); // Reset visual state
    }
}


boardEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = e.target.closest('.cell');
    if (target) {
        target.style.background = 'rgba(255,255,255,0.1)';
    }
});

boardEl.addEventListener('dragleave', (e) => {
    const target = e.target.closest('.cell');
    if (target) {
        const r = target.dataset.r;
        const c = target.dataset.c;
        const val = grid[r][c];
        target.style.background = val ? val : 'rgba(255,255,255,0.03)';
    }
});

boardEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const pieceIdx = e.dataTransfer.getData('pieceIdx');
    // We want the cell that is actually UNDER the mouse
    const target = document.elementFromPoint(e.clientX, e.clientY).closest('.cell');

    if (target && pieceIdx !== "") {
        socket.emit('placePiece', {
            pieceIdx: parseInt(pieceIdx),
            r: parseInt(target.dataset.r),
            c: parseInt(target.dataset.c)
        });
    }
});

function draw() { } // Dummy for compatibility
