const canvas = document.createElement('canvas');
canvas.id = 'gameCanvas';
const ctx = canvas.getContext('2d');
const gridSize = 30;
const rows = 20;
const cols = 10;

const shapes = [
    { shape: [[1, 1, 1, 1]], color: '#81A1C1' }, // I - Nordic Blue
    { shape: [[1, 1], [1, 1]], color: '#EBCB8B' }, // O - Soft Amber
    { shape: [[1, 1, 1], [0, 1, 0]], color: '#A3BE8C' }, // T - Muted Green
    { shape: [[1, 1, 1], [1, 0, 0]], color: '#D08770' }, // L - Dusty Orange
    { shape: [[1, 1, 1], [0, 0, 1]], color: '#5E81AC' }, // J - Slate Blue
    { shape: [[1, 1, 0], [0, 1, 1]], color: '#88C0D0' }, // S - Ice Blue
    { shape: [[0, 1, 1], [1, 1, 0]], color: '#BF616A' } // Z - Rose Red
];

let board = Array(rows).fill().map(() => Array(cols).fill(0));
let currentPiece = null;
let nextPiece = null;
let score = 0;
let linesCleared = 0;
let level = 1;
let baseDropSpeed = 1000;
let dropSpeed = baseDropSpeed;
let lastTime = 0;
let gameOver = false;
let isPaused = false;
let isLocked = false;
let pieceBag = [];
let flashEffects = [];
let lightningEffects = [];
let shakeTime = 0;

document.addEventListener('DOMContentLoaded', () => {
    const gameArea = document.getElementById('game-area');
    gameArea.appendChild(canvas);
    canvas.width = cols * gridSize;
    canvas.height = rows * gridSize;
    resetGame();
    requestAnimationFrame(gameLoop);
});

document.addEventListener('mousedown', (e) => {
    if (e.target.tagName !== 'INPUT') e.preventDefault();
});

function resetGame() {
    board = Array(rows).fill().map(() => Array(cols).fill(0));
    gameOver = false;
    isPaused = false;
    isLocked = false;
    score = 0;
    linesCleared = 0;
    level = 1;
    dropSpeed = baseDropSpeed;
    pieceBag = [];
    flashEffects = [];
    lightningEffects = [];
    shakeTime = 0;
    currentPiece = spawnPiece();
    nextPiece = spawnPiece();
    updateUI();
    drawNext();
    document.getElementById('message').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('pause').textContent = 'Pause';
    requestAnimationFrame(gameLoop);
}

function fillPieceBag() {
    pieceBag = [...shapes];
    const gapCount = board.map(row => row.filter(cell => !cell).length).reduce((a, b) => a + b, 0);
    if (gapCount > cols * 2) {
        pieceBag.push(shapes[0], shapes[1]); // Extra I and O
    }
    for (let i = pieceBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieceBag[i], pieceBag[j]] = [pieceBag[j], pieceBag[i]];
    }
}

function spawnPiece() {
    if (pieceBag.length === 0) fillPieceBag();
    const piece = pieceBag.pop();
    return {
        shape: piece.shape.map(row => [ ...row ]),
        color: piece.color,
        x: Math.floor(cols / 2) - Math.floor(piece.shape[0].length / 2),
        y: 0
    };
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let shakeX = 0, shakeY = 0;
    if (shakeTime > 0) {
        shakeX = (Math.random() - 0.5) * 4;
        shakeY = (Math.random() - 0.5) * 4;
        ctx.translate(shakeX, shakeY);
        document.getElementById('game-container').style.transform = `translateX(calc(-50% + ${shakeX}px)) translateY(${shakeY}px)`;
        shakeTime--;
    } else {
        document.getElementById('game-container').style.transform = 'translateX(-50%)';
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * gridSize);
        ctx.lineTo(canvas.width, r * gridSize);
        ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * gridSize, 0);
        ctx.lineTo(c * gridSize, canvas.height);
        ctx.stroke();
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c]) {
                drawBlock(c, r, board[r][c]);
            }
        }
    }

    if (shakeTime > 0) ctx.translate(-shakeX, -shakeY);
}

function drawBlock(x, y, color) {
    const gradient = ctx.createLinearGradient(x * gridSize, y * gridSize, (x + 1) * gridSize, (y + 1) * gridSize);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, darkenColor(color, 0.7));
    ctx.fillStyle = gradient;
    ctx.fillRect(x * gridSize, y * gridSize, gridSize - 1, gridSize - 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x * gridSize, y * gridSize + gridSize - 2, gridSize - 1, 2);
    ctx.fillRect(x * gridSize + gridSize - 2, y * gridSize, 2, gridSize - 1);
}

function darkenColor(hex, factor) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.floor(r * factor);
    g = Math.floor(g * factor);
    b = Math.floor(b * factor);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function drawPiece(piece) {
    if (!piece) return;
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c]) {
                drawBlock(piece.x + c, piece.y + r, piece.color);
            }
        }
    }
}

function drawShadow() {
    if (!currentPiece) return;
    let shadowY = currentPiece.y;
    while (!collide(currentPiece, 0, shadowY - currentPiece.y + 1)) {
        shadowY++;
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                ctx.fillRect((currentPiece.x + c) * gridSize, (shadowY + r) * gridSize, gridSize - 1, gridSize - 1);
            }
        }
    }
}

function drawNext() {
    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = 60;
    nextCanvas.height = 60;
    const nextCtx = nextCanvas.getContext('2d');
    nextCtx.clearRect(0, 0, 60, 60);
    if (nextPiece) {
        for (let r = 0; r < nextPiece.shape.length; r++) {
            for (let c = 0; c < nextPiece.shape[r].length; c++) {
                if (nextPiece.shape[r][c]) {
                    const gradient = nextCtx.createLinearGradient(c * 15 + 15, r * 15 + 15, c * 15 + 29, r * 15 + 29);
                    gradient.addColorStop(0, nextPiece.color);
                    gradient.addColorStop(1, darkenColor(nextPiece.color, 0.7));
                    nextCtx.fillStyle = gradient;
                    nextCtx.fillRect(c * 15 + 15, r * 15 + 15, 14, 14);
                    nextCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    nextCtx.fillRect(c * 15 + 15, r * 15 + 27, 14, 2);
                    nextCtx.fillRect(c * 15 + 27, r * 15 + 15, 2, 14);
                }
            }
        }
    }
    document.getElementById('next-pieces').innerHTML = '';
    document.getElementById('next-pieces').appendChild(nextCanvas);
}

function collide(piece, dx = 0, dy = 0) {
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (!piece.shape[r][c]) continue;
            const newX = piece.x + c + dx;
            const newY = piece.y + r + dy;
            if (newX < 0 || newX >= cols || newY >= rows || (newY >= 0 && board[newY][newX])) {
                return true;
            }
        }
    }
    return false;
}

function mergePiece() {
    if (!currentPiece) return;
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                board[currentPiece.y + r][currentPiece.x + c] = currentPiece.color;
            }
        }
    }
    clearLines();
}

function createFlashEffect(row) {
    shakeTime = 10;
    flashEffects.push({
        x: canvas.width / 2,
        y: row * gridSize + gridSize / 2,
        radius: 0,
        maxRadius: canvas.width,
        life: 20,
        alpha: 1
    });
}

function createLightningEffect(x, yStart, yEnd) {
    lightningEffects.push({
        x: x * gridSize + gridSize / 2,
        yStart: yStart * gridSize,
        yEnd: yEnd * gridSize,
        progress: 0,
        speed: (yEnd - yStart) * gridSize / 20,
        life: 30
    });
}

function updateEffects() {
    flashEffects = flashEffects.filter(f => f.life > 0);
    flashEffects.forEach(f => {
        f.radius += (f.maxRadius - f.radius) * 0.2;
        f.life--;
        f.alpha = f.life / 20;
    });

    lightningEffects = lightningEffects.filter(l => l.life > 0);
    lightningEffects.forEach(l => {
        l.progress += l.speed;
        l.life--;
        if (l.progress > l.yEnd - l.yStart) l.progress = l.yEnd - l.yStart;
    });
}

function drawEffects() {
    flashEffects.forEach(f => {
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${f.alpha})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = gradient;
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    lightningEffects.forEach(l => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0, 255, 255, ${l.life / 30})`;
        ctx.lineWidth = 3;
        let y = l.yStart;
        const trailLength = 50;
        while (y < l.yStart + l.progress) {
            const nextY = y + Math.random() * 20 + 10;
            const xOffset = (Math.random() - 0.5) * 15;
            ctx.moveTo(l.x + xOffset, y);
            ctx.lineTo(l.x + xOffset, Math.min(nextY, l.yStart + l.progress));
            y = nextY;
        }
        ctx.globalAlpha = l.life / 30 * 0.5;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        y = Math.max(l.yStart, l.yStart + l.progress - trailLength);
        while (y < l.yStart + l.progress) {
            const nextY = y + Math.random() * 10 + 5;
            const xOffset = (Math.random() - 0.5) * 10;
            ctx.moveTo(l.x + xOffset, y);
            ctx.lineTo(l.x + xOffset, Math.min(nextY, l.yStart + l.progress));
            y = nextY;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
    });
}

function clearLines() {
    let lines = 0;
    let clearedRows = [];
    for (let r = 0; r < rows; r++) {
        if (board[r].every(cell => cell)) {
            clearedRows.push(r);
            lines++;
        }
    }
    if (lines > 0) {
        clearedRows.sort((a, b) => b - a);
        clearedRows.forEach(r => {
            board.splice(r, 1);
            board.unshift(Array(cols).fill(0));
        });
        linesCleared += lines;
        score += lines * 100 * level;
        level = Math.floor(linesCleared / 5) + 1;
        dropSpeed = Math.max(100, baseDropSpeed * Math.pow(0.9, level - 1));
        clearedRows.forEach(row => createFlashEffect(row));
        updateUI();
    }
    isLocked = false;
    currentPiece = nextPiece;
    nextPiece = spawnPiece();
    drawNext();
    if (collide(currentPiece)) {
        gameOver = true;
        document.getElementById('message').innerHTML = `Game Over! Score: ${score}<br>Level: ${level}<br><button onclick="resetGame()">Restart</button>`;
        document.getElementById('message').style.display = 'block';
    }
}

function drop() {
    if (isLocked || gameOver || isPaused || !currentPiece) return;
    if (!collide(currentPiece, 0, 1)) {
        currentPiece.y++;
    } else {
        mergePiece();
    }
}

function hardDrop() {
    if (isLocked || gameOver || isPaused || !currentPiece) return;
    const startY = currentPiece.y;
    while (!collide(currentPiece, 0, 1)) {
        currentPiece.y++;
    }
    if (currentPiece.y - startY > 2) {
        for (let r = 0; r < currentPiece.shape.length; r++) {
            for (let c = 0; c < currentPiece.shape[r].length; c++) {
                if (currentPiece.shape[r][c]) {
                    createLightningEffect(currentPiece.x + c, startY, currentPiece.y + r);
                }
            }
        }
    }
    mergePiece();
}

function rotatePiece() {
    if (!currentPiece) return;
    const rotated = currentPiece.shape[0].map((_, i) => currentPiece.shape.map(row => row[i]).reverse());
    const oldShape = currentPiece.shape;
    currentPiece.shape = rotated;
    if (collide(currentPiece)) {
        currentPiece.shape = oldShape;
    }
}

function gameLoop(time = 0) {
    if (gameOver || isPaused) return;
    const delta = time - lastTime;
    if (delta >= dropSpeed) {
        drop();
        lastTime = time;
    }
    drawBoard();
    if (!isLocked && currentPiece) drawShadow();
    drawPiece(currentPiece);
    updateEffects();
    drawEffects();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    if (gameOver || isPaused || isLocked || !currentPiece) return;
    switch (e.key.toLowerCase()) {
        case 'a':
        case 'arrowleft':
            if (!collide(currentPiece, -1, 0)) currentPiece.x--;
            break;
        case 'd':
        case 'arrowright':
            if (!collide(currentPiece, 1, 0)) currentPiece.x++;
            break;
        case 's':
        case 'arrowdown':
            drop();
            break;
        case 'w':
        case 'arrowup':
            rotatePiece();
            break;
        case ' ':
            hardDrop();
            break;
        case 'p':
            togglePause();
            break;
    }
});

function updateUI() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('section').textContent = `Lines: ${linesCleared}`;
    document.getElementById('level').textContent = `Level: ${level}`;
}

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pause').textContent = isPaused ? 'Resume' : 'Pause';
    document.getElementById('pause-menu').style.display = isPaused ? 'block' : 'none';
    if (!isPaused) requestAnimationFrame(gameLoop);
}

function resumeGame() {
    togglePause();
}

function restartAndResume() {
    resetGame();
    isPaused = false;
    document.getElementById('pause').textContent = 'Pause';
    document.getElementById('pause-menu').style.display = 'none';
    requestAnimationFrame(gameLoop);
}

function showHelp() {
    alert('Tetris Controls:\n- Left Arrow / A: Move Left\n- Right Arrow / D: Move Right\n- Down Arrow / S: Soft Drop\n- Up Arrow / W: Rotate\n- Space: Hard Drop\n- P: Pause/Resume');
}