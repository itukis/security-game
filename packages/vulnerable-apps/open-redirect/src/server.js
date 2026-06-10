const express = require('express');
const app = express();

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// VULNERABLE REDIRECT ENDPOINT
// Hands the value of ?redirect= directly to res.redirect without checking
// whether the destination is on our own site. Attackers can craft links
// like /login-success?redirect=https://evil.example.com to bounce victims
// to phishing pages after a legitimate-looking login.
app.get('/login-success', (req, res) => {
  const redirectTo = req.query.redirect || '/dashboard';
  res.redirect(redirectTo);
});

app.get('/dashboard', (_req, res) => {
  res.send('<!doctype html><html><body><h1>Dashboard</h1><p>Welcome back!</p></body></html>');
});

app.post('/reset', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`open-redirect listening on ${PORT}`));
