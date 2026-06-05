const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Mock session middleware: treat the X-User-Id header as the authenticated
// user. Falls back to 'user-1' so cURL probes work without setting a header.
// Real JWT/session is intentionally out of scope; this problem is about the
// missing authorization check, not the auth mechanism itself.
app.use((req, _res, next) => {
  req.userId = req.headers['x-user-id'] || 'user-1';
  next();
});

const PROFILES = {
  'user-1': { id: 'user-1', name: 'Alice', email: 'alice@example.com', secret: 'public bio' },
  'user-2': { id: 'user-2', name: 'Bob',   email: 'bob@example.com',   secret: 'CONFIDENTIAL: launch codes' },
  'user-3': { id: 'user-3', name: 'Carol', email: 'carol@example.com', secret: 'CONFIDENTIAL: bank PIN 4823' },
};

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// VULNERABLE PROFILE ENDPOINT
// Looks up profile by URL :id without checking that the authenticated user
// owns it. Any logged-in user can read any other user's profile by changing
// the URL — classic IDOR (Insecure Direct Object Reference).
app.get('/profile/:id', (req, res) => {
  const profile = PROFILES[req.params.id];
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json(profile);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`idor-profile vulnerable app listening on port ${PORT}`);
});
