const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let multiplier = 1.00;
let isRunning = false;
let crashPoint = 1.00;
let gameInterval = null;
let userBalance = 100.00;
let history = [];
let liveBets = [];

// Majlisoota Bot-oota sobaa
const fakeUsers = ['Abebe', 'Chala', 'Bonsa', 'Tigist', 'Marta', 'Kefele', 'Gadaa', 'Lensa'];

function generateCrashPoint() {
    const hash = crypto.randomBytes(32).toString('hex');
    const hexVal = parseInt(hash.substring(0, 8), 16);
    let point = (4294967296 / (hexVal + 1)) * (1 - 0.03);
    return parseFloat(Math.max(1.00, point).toFixed(2));
}

function generateFakeBets() {
    liveBets = fakeUsers.map(user => ({
        user: user,
        amount: Math.floor(Math.random() * 50) + 10,
        cashedOut: false,
        cashoutMultiplier: null,
        winAmount: 0
    }));
}

function updateFakeBets(currentMult) {
    liveBets.forEach(bet => {
        if (!bet.cashedOut && currentMult > 1.2) {
            // Bot-oonni akka tasaa Cash out godhu
            if (Math.random() < 0.08) {
                bet.cashedOut = true;
                bet.cashoutMultiplier = currentMult.toFixed(2);
                bet.winAmount = (bet.amount * currentMult).toFixed(2);
            }
        }
    });
}

function startGame() {
    multiplier = 1.00;
    isRunning = true;
    crashPoint = generateCrashPoint();
    generateFakeBets();

    console.log(`Round Haaraa: Crash Point: ${crashPoint}x`);
    io.emit('game_started', { crashPoint, bets: liveBets });

    gameInterval = setInterval(() => {
        if (!isRunning) return;

        multiplier += 0.01 + (multiplier * 0.0025);
        updateFakeBets(multiplier);

        if (multiplier >= crashPoint) {
            isRunning = false;
            clearInterval(gameInterval);

            history.unshift(crashPoint.toFixed(2));
            if (history.length > 8) history.pop();

            io.emit('game_crashed', {
                crashPoint: crashPoint.toFixed(2),
                history: history,
                bets: liveBets
            });
            console.log(`CRASHED AT: ${crashPoint}x`);

            setTimeout(() => { startGame(); }, 4000);
        } else {
            io.emit('multiplier_update', {
                multiplier: parseFloat(multiplier.toFixed(2)),
                bets: liveBets
            });
        }
    }, 100);
}

io.on('connection', (socket) => {
    socket.emit('update_balance', { balance: userBalance });
    socket.emit('init_history', { history });

    socket.on('place_bet', (data) => {
        const bet = parseFloat(data.amount);
        if (!isRunning && bet > 0 && userBalance >= bet) {
            userBalance -= bet;
            socket.emit('update_balance', { balance: userBalance });
            socket.emit('bet_placed', { amount: bet });

            liveBets.unshift({
                user: 'SI' + ' (Siin)',
                amount: bet,
                cashedOut: false,
                cashoutMultiplier: null,
                winAmount: 0
            });
        } else if (isRunning) {
            socket.emit('error_msg', { message: 'Round-ni eegaleera!' });
        } else {
            socket.emit('error_msg', { message: 'Baalansiin gahaa miti!' });
        }
    });

    socket.on('cash_out', (data) => {
        if (isRunning) {
            const win = data.betAmount * multiplier;
            userBalance += win;

            let myBet = liveBets.find(b => b.user.includes('(Siin)'));
            if (myBet) {
                myBet.cashedOut = true;
                myBet.cashoutMultiplier = multiplier.toFixed(2);
                myBet.winAmount = win.toFixed(2);
            }

            socket.emit('update_balance', { balance: userBalance });
            socket.emit('cash_out_success', { winAmount: win, multiplier: multiplier.toFixed(2) });
        }
    });
});

server.listen(3000, () => {
    console.log('Server Aviator Pro Port 3000 irratti hojjechaa jira...');
    startGame();
});