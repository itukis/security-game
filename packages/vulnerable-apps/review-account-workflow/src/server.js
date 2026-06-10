const express = require('express');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const ADMIN_API_KEY = 'sk-review-admin-ledger-12345';

let accounts = {
  'user-1': { id: 'user-1', owner: 'Alice', email: 'alice@example.com', balance: 10000, secretNote: 'VIP limit: 50000' },
  'user-2': { id: 'user-2', owner: 'Bob', email: 'bob@example.com', balance: 500, secretNote: 'Collections hold' },
};

app.use((req, _res, next) => {
  req.userId = req.headers['x-user-id'] || 'user-1';
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// VULNERABLE: admin key is shipped to the browser.
app.get('/', (_req, res) => {
  res.send(`<!doctype html>
<html><body>
  <h1>Account Center</h1>
  <p id="summary"></p>
  <script>
    const ADMIN_API_KEY = '${ADMIN_API_KEY}';
    fetch('/api/admin/accounts', { headers: { 'Authorization': 'Bearer ' + ADMIN_API_KEY } })
      .then(r => r.json())
      .then(d => document.getElementById('summary').textContent = d.accounts.length + ' accounts loaded');
  </script>
</body></html>`);
});

// VULNERABLE: IDOR, because URL :id is trusted without authorization.
app.get('/account/:id', (req, res) => {
  const account = accounts[req.params.id];
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json(account);
});

app.get('/balance', (req, res) => {
  const account = accounts[req.userId];
  res.json({ userId: req.userId, balance: account ? account.balance : 0 });
});

// VULNERABLE: state-changing transfer accepts requests without a CSRF token.
app.post('/transfer', (req, res) => {
  const { to, amount } = req.body;
  const amt = parseInt(amount, 10);
  if (!to || !amt || amt <= 0) return res.status(400).json({ error: 'Invalid transfer' });
  if (!accounts[to]) return res.status(404).json({ error: 'Recipient not found' });
  if ((accounts[req.userId]?.balance || 0) < amt) return res.status(400).json({ error: 'Insufficient funds' });
  accounts[req.userId].balance -= amt;
  accounts[to].balance += amt;
  res.json({ success: true, newBalance: accounts[req.userId].balance });
});

app.get('/api/admin/accounts', (req, res) => {
  if (req.headers.authorization === `Bearer ${ADMIN_API_KEY}`) {
    return res.json({ accounts: Object.values(accounts) });
  }
  res.status(401).json({ error: 'Unauthorized' });
});

app.post('/reset', (_req, res) => {
  accounts = {
    'user-1': { id: 'user-1', owner: 'Alice', email: 'alice@example.com', balance: 10000, secretNote: 'VIP limit: 50000' },
    'user-2': { id: 'user-2', owner: 'Bob', email: 'bob@example.com', balance: 500, secretNote: 'Collections hold' },
  };
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`review-account-workflow listening on ${PORT}`));
