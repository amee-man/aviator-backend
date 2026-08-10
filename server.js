const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

// Static files serve gochuuf
app.use(express.static(path.join(__dirname)));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Game State & Logic
let gameState = {
    status: 'WAITING',
    multiplier: 1.00,
    crashPoint: 1.00,
    history: []
};

function generateCrashPoint() {
    const e = 100;
    const h = Math.random() * 100;
    if (h < 3) return 1.00;
    return Math.max(1.00, parseFloat((e / (100 - h)).toFixed(2)));
}

function startGameLoop() {
    gameState.status = 'WAITING';
    gameState.multiplier = 1.00;
    gameState.crashPoint = generateCrashPoint();
    io.emit('game_state', gameState);

    setTimeout(() => {
        gameState.status = 'RUNNING';
        runGame();
    }, 5000);
}

function runGame() {
    const gameInterval = setInterval(() => {
        gameState.multiplier = parseFloat((gameState.multiplier + 0.01).toFixed(2));

        if (gameState.multiplier >= gameState.crashPoint) {
            clearInterval(gameInterval);
            gameState.status = 'CRASHED';
            gameState.history.unshift(gameState.crashPoint);
            if (gameState.history.length > 10) gameState.history.pop();

            io.emit('game_crash', { crashPoint: gameState.crashPoint });
            setTimeout(startGameLoop, 3000);
        } else {
            io.emit('multiplier_update', { multiplier: gameState.multiplier });
        }
    }, 100);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
    startGameLoop();
});