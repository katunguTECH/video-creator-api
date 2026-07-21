const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'data.db');

// Create or open database
const db = new sqlite3.Database(dbPath);

// Initialize tables
db.serialize(() => {
  // Revenue table
  db.run(`
    CREATE TABLE IF NOT EXISTS revenue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT UNIQUE,
      email TEXT,
      amount REAL,
      service_type TEXT,
      payment_reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Video usage table
  db.run(`
    CREATE TABLE IF NOT EXISTS video_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT,
      user_email TEXT,
      video_type TEXT,
      prompt TEXT,
      cost REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // API credits table
  db.run(`
    CREATE TABLE IF NOT EXISTS api_credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT,
      amount REAL,
      type TEXT, -- 'purchase' or 'usage'
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Site visits table
  db.run(`
    CREATE TABLE IF NOT EXISTS site_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Activity log table
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT,
      action TEXT,
      details TEXT,
      amount REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database initialized');
});

module.exports = db;