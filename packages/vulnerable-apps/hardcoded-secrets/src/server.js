const express = require('express');
const app = express();

const ADMIN_API_KEY = 'sk-secret-admin-key-12345';
const DATA = { public: 'This is public info', secret: 'TOP SECRET: merger plan Q3' };

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// VULNERABLE DASHBOARD ENDPOINT
// The admin API key is embedded directly in the HTML the server returns to
// the browser. Anyone who opens DevTools (or simply views source) can read
// it and then call /api/data themselves as admin.
app.get('/', (_req, res) => {
  res.send(`<!doctype html>
<html><head><title>Dashboard</title></head>
<body>
  <h1>Dashboard</h1>
  <p id="data"></p>
  <script>
    const API_KEY = '${ADMIN_API_KEY}';
    fetch('/api/data', { headers: { 'Authorization': 'Bearer ' + API_KEY } })
      .then(r => r.json())
      .then(d => document.getElementById('data').textContent = d.public);
  </script>
</body></html>`);
});

app.get('/api/data', (req, res) => {
  const auth = req.headers.authorization;
  if (auth === `Bearer ${ADMIN_API_KEY}`) {
    return res.json(DATA);
  }
  res.status(401).json({ error: 'Unauthorized' });
});

app.post('/reset', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`hardcoded-secrets listening on ${PORT}`));
