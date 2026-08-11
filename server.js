const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Database Setup
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('DB Error:', err.message);
    else console.log('Connected to SQLite Database.');
});

db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, balance REAL DEFAULT 0)");

// Register Route
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Guutuu guutuutti guuti' });

    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(INSERT INTO users(username, password, balance) VALUES(?, ?, 100), [username, hashedPassword], function (err) {
        if (err) return res.status(400).json({ error: 'Maqaa fayyadamaa kana dura jiruun galmeeffameera' });
        res.json({ success: true, message: 'Galmeen milkaa\'eera' });
    });
});

// Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(SELECT * FROM users WHERE username = ?, [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Maqaa ykn jecha iccitiistii sirrii miti' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: 'Jechi icciitii sirrii miti' });

        res.json({ success: true, username: user.username, balance: user.balance });
    });
});

// Deposit / Withdraw Simulator (Telebirr & CBE)
app.post('/api/transaction', (req, res) => {
    const { username, amount, type, method } = req.body;

    db.get(SELECT * FROM users WHERE username = ?, [username], (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Fayyisaan hin argamne' });

        let newBalance = user.balance;
        if (type === 'deposit') {
            newBalance += parseFloat(amount);
        } else if (type === 'withdraw') {
            if (user.balance < amount) return res.status(400).json({ error: 'Herrega kee irra maallaqni ga’u hin jiru' });
            newBalance -= parseFloat(amount);
        }

        db.run(UPDATE users SET balance = ? WHERE username = ?, [newBalance, username], (err) => {
            if (err) return res.status(500).json({ error: 'Rakkoo server mudate' });
            res.json({ success: true, balance: newBalance, message: ${ method } irraa ${ type } milkaa'eera! });
        });
    });
});

// Aviator Game Loop (WebSocket)
let currentMultiplier = 1.00;
let gameState = 'WAITING';

function startAviatorGame() {
    gameState = 'WAITING';
    currentMultiplier = 1.00;
    io.emit('game_state', { state: gameState, multiplier: currentMultiplier });

    setTimeout(() => {
        gameState = 'RUNNING';
        let crashPoint = (Math.random() * 5 + 1).toFixed(2);

        let interval = setInterval(() => {
            currentMultiplier += 0.05;
            if (currentMultiplier >= crashPoint) {
                clearInterval(interval);
                gameState = 'CRASHED';
                io.emit('game_state', { state: gameState, multiplier: parseFloat(crashPoint) });
                setTimeout(startAviatorGame, 4000);
            } else {
                io.emit('game_state', { state: gameState, multiplier: parseFloat(currentMultiplier.toFixed(2)) });
            }
        }, 100);
    }, 3000);
}

startAviatorGame();

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(Server is running on port ${ PORT }));