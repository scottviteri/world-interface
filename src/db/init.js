const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function createDatabase(dbPath) {
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err);
        } else {
            console.log('Connected to notes database:', dbPath);
            
            db.serialize(() => {
                db.run(`
                    CREATE TABLE IF NOT EXISTS notes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        note TEXT NOT NULL,
                        embedding TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
            });
        }
    });

    return db;
}

module.exports = createDatabase; 