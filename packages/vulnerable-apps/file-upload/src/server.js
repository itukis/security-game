const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// VULNERABLE UPLOAD ENDPOINT
// Accepts any file extension and serves uploads directly from /files with
// Express's static middleware. An attacker can upload a .html (or .svg, .js)
// file containing JavaScript and the browser will execute it when /files/X
// is opened — same-origin XSS via stored file.
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ ok: true, path: `/files/${req.file.originalname}` });
});

app.use('/files', express.static(uploadDir));

app.get('/uploads', (_req, res) => {
  const files = fs.readdirSync(uploadDir);
  res.json({ files });
});

app.post('/reset', (_req, res) => {
  fs.readdirSync(uploadDir).forEach((f) => fs.unlinkSync(path.join(uploadDir, f)));
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`file-upload listening on ${PORT}`));
