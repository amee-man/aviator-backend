const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Socket.io CORS Configuration (Frontend Render fi Local irratti akka hojjetuuf)
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Game State Storage
let gameState = {
    status: 'WAITING',
    multiplier: 1.00,
    crashPoint: 1.00,
    history: []
};

// Crash Point Generator Algorithm
function generateCrashPoint() {
    const e = 100;
    const h = Math.random() * 100;
    if (h < 3) return 1.00;
    return Math.max(1.00, parseFloat((e / (100 - h)).toFixed(2)));
}

// Start New Round
function startGameLoop() {
    gameState.status = 'WAITING';
    gameState.multiplier = 1.00;
    gameState.crashPoint = generateCrashPoint();

    // Client-oota hundumaaf State erguu
    io.emit('game_state', gameState);

    console.log("---------------------------------");
    console.log("Round Haaraa: Crash Point: " + gameState.crashPoint + "x");

    setTimeout(() => {
        gameState.status = 'RUNNING';
        runGame();
    }, 5000);
}

// Multiplier Running Loop
function runGame() {
    const gameInterval = setInterval(() => {
        gameState.multiplier = parseFloat((gameState.multiplier + 0.01).toFixed(2));

        // Multiplier haromfame Socket dhaan Frontend-tti erguu
        io.emit('multiplier_update', { multiplier: gameState.multiplier });

        // Terminal/CMD irrattiis akka socho'uuf (Optional Log)
        console.log("Multiplier: " + gameState.multiplier + "x");

        if (gameState.multiplier >= gameState.crashPoint) {
            clearInterval(gameInterval);
            gameState.status = 'CRASHED';
            gameState.history.unshift(gameState.crashPoint);
            if (gameState.history.length > 10) gameState.history.pop();

            // Crash Event Client-ootaaf erguu
            io.emit('game_crash', { crashPoint: gameState.crashPoint });
            console.log("CRASHED AT: " + gameState.crashPoint + "x");

            // Round haaraa eegaluuf
            setTimeout(startGameLoop, 3000);
        }
    }, 100);
}

// Socket Connections Handling
io.on('connection', (socket) => {
    // Client haaraan yoo dhufe state amma jiru erguuf
    socket.emit('game_state', gameState);
});

// Server Listen (Render fi Local Environment)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
    startGameLoop();
});