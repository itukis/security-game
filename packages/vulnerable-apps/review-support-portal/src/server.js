const express = require('express');
const Database = require('better-sqlite3');

const app = express();
app.use(express.json());

const db = new Database(':memory:');
db.exec(`
CREATE TABLE agents (id TEXT PRIMARY KEY, email TEXT, password TEXT, name TEXT);
INSERT INTO agents VALUES ('agent-1','alice@support.local','correct-horse','Alice');
INSERT INTO agents VALUES ('agent-2','bob@support.local','battery-staple','Bob');
CREATE TABLE tickets (id TEXT PRIMARY KEY, title TEXT, customerEmail TEXT);
INSERT INTO tickets VALUES ('100','Login trouble','customer@example.com');
`);

let nextCommentId = 2;
const comments = [
  { id: 1, ticketId: '100', author: 'system', body: 'Initial triage note.' },
];

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// VULNERABLE: SQL injection in the agent login query.
app.post('/agent/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Missing credentials' });
  }

  const sql = `SELECT * FROM agents WHERE email = '${email}' AND password = '${password}'`;
  const agent = db.prepare(sql).get();
  if (!agent) return res.json({ success: false });
  res.json({ success: true, agent: { id: agent.id, email: agent.email, name: agent.name } });
});

app.post('/tickets/:id/comments', (req, res) => {
  const { author, body } = req.body || {};
  if (typeof author !== 'string' || typeof body !== 'string') {
    return res.status(400).json({ error: 'author and body must be strings' });
  }
  const comment = { id: nextCommentId++, ticketId: req.params.id, author, body };
  comments.push(comment);
  res.json({ ok: true, id: comment.id });
});

// VULNERABLE: comments are rendered into HTML without escaping.
app.get('/tickets/:id', (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).send('Ticket not found');
  const rendered = comments
    .filter((comment) => comment.ticketId === req.params.id)
    .map((comment) => `<li><b>${comment.author}</b>: ${comment.body}</li>`)
    .join('\n');
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!doctype html><html><body><h1>${ticket.title}</h1><ul>${rendered}</ul></body></html>`);
});

// VULNERABLE: any absolute URL can be used as a post-login redirect.
app.get('/handoff', (req, res) => {
  const next = req.query.next || '/tickets/100';
  res.redirect(next);
});

app.post('/reset', (_req, res) => {
  comments.length = 0;
  comments.push({ id: 1, ticketId: '100', author: 'system', body: 'Initial triage note.' });
  nextCommentId = 2;
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`review-support-portal listening on ${PORT}`));
