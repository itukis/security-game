const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Initialize SQLite database
const db = new Database(':memory:');
const initSql = fs.readFileSync(path.join(__dirname, 'db', 'init.sql'), 'utf8');
db.exec(initSql);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// VULNERABLE LOGIN ENDPOINT
// This intentionally uses string concatenation to build SQL queries.
// This is the vulnerability users must find and fix.
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Missing username or password' });
  }

  try {
    const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    const row = db.prepare(sql).get();

    if (row) {
      res.json({ success: true, user: { id: row.id, username: row.username } });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`sqli-login vulnerable app listening on port ${PORT}`);
});
