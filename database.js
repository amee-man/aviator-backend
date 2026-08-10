const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./aviator.db');

db.serialize(() => {
    // Table users
    db.run(CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'player',
        balance REAL DEFAULT 100.00
    ));

    // Table transactions (Telebirr/Chapa)
    db.run(CREATE TABLE IF NOT EXISTS transactions(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        type TEXT, --DEPOSIT / WITHDRAWAL
        amount REAL,
        status TEXT DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ));
});

module.exports = db;