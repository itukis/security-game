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
  'user-1':  { id: 'user-1',  name: 'Alice',   email: 'alice@example.com',   secret: 'public bio' },
  'user-2':  { id: 'user-2',  name: 'Bob',     email: 'bob@example.com',     secret: 'CONFIDENTIAL: launch codes' },
  'user-3':  { id: 'user-3',  name: 'Carol',   email: 'carol@example.com',   secret: 'CONFIDENTIAL: bank PIN 4823' },
  'user-4':  { id: 'user-4',  name: 'Dave',    email: 'dave@example.com',    secret: 'CONFIDENTIAL: SSN 901-23-4567' },
  'user-5':  { id: 'user-5',  name: 'Eve',     email: 'eve@example.com',     secret: 'CONFIDENTIAL: API key sk_live_9f3a2e7c1b' },
  'user-6':  { id: 'user-6',  name: 'Frank',   email: 'frank@example.com',   secret: 'CONFIDENTIAL: internal salary $182,000' },
  'user-7':  { id: 'user-7',  name: 'Grace',   email: 'grace@example.com',   secret: 'CONFIDENTIAL: 2FA seed JBSWY3DPEHPK3PXP' },
  'user-8':  { id: 'user-8',  name: 'Heidi',   email: 'heidi@example.com',   secret: 'CONFIDENTIAL: medical record - prescription A123' },
  'user-9':  { id: 'user-9',  name: 'Ivan',    email: 'ivan@example.com',    secret: 'CONFIDENTIAL: private message - "meeting at 21:00"' },
  'user-10': { id: 'user-10', name: 'Judy',    email: 'judy@example.com',    secret: 'CONFIDENTIAL: admin master key adm_master_8f7e2d1c' },
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
