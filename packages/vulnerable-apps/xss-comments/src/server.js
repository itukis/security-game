const express = require('express');

const app = express();
app.use(express.json());

const comments = [];
let nextId = 1;

comments.push({ id: nextId++, author: 'admin', text: 'Welcome to the board!' });

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/comments', (req, res) => {
  const { author, text } = req.body || {};

  if (typeof author !== 'string' || typeof text !== 'string') {
    return res.status(400).json({ ok: false, error: 'author and text must be strings' });
  }

  const id = nextId++;
  comments.push({ id, author, text });
  res.json({ ok: true, id });
});

// VULNERABLE RENDER ENDPOINT
// This intentionally concatenates user input directly into HTML.
// This is the vulnerability users must find and fix.
app.get('/comments', (req, res) => {
  res.setHeader('Content-Type', 'text/html');

  const rendered = comments
    .map((c) => `<div class="comment"><b>${c.author}</b>: ${c.text}</div>`)
    .join('\n');

  res.send(
    `<!doctype html>
<html>
  <head><title>Comments</title></head>
  <body>
    <h1>Comments</h1>
    ${rendered}
  </body>
</html>`
  );
});

app.post('/reset', (req, res) => {
  comments.length = 0;
  nextId = 1;
  comments.push({ id: nextId++, author: 'admin', text: 'Welcome to the board!' });
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`xss-comments vulnerable app listening on port ${PORT}`);
});
