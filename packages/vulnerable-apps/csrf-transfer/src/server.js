const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let balance = { 'user-1': 10000, 'user-2': 500 };

app.use((req, _res, next) => {
  req.userId = req.headers['x-user-id'] || 'user-1';
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/balance', (req, res) => {
  res.json({ userId: req.userId, balance: balance[req.userId] || 0 });
});

// VULNERABLE TRANSFER ENDPOINT
// Accepts POST without verifying that the request actually originated from the
// app's own UI. An attacker page can submit a hidden form on the victim's
// behalf and silently move money — classic CSRF (Cross-Site Request Forgery).
app.post('/transfer', (req, res) => {
  const { to, amount } = req.body;
  const amt = parseInt(amount, 10);
  if (!to || !amt || amt <= 0) return res.status(400).json({ error: 'Invalid transfer' });
  if ((balance[req.userId] || 0) < amt) return res.status(400).json({ error: 'Insufficient funds' });
  balance[req.userId] -= amt;
  balance[to] = (balance[to] || 0) + amt;
  res.json({ success: true, newBalance: balance[req.userId] });
});

app.post('/reset', (_req, res) => {
  balance = { 'user-1': 10000, 'user-2': 500 };
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`csrf-transfer listening on ${PORT}`));
