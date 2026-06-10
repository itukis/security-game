const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

const publicDir = path.join(__dirname, 'public');
const secretDir = path.join(__dirname, 'secret');
const uploadDir = path.join(__dirname, 'uploads');
for (const dir of [publicDir, secretDir, uploadDir]) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'readme.txt'), 'public readme');
fs.writeFileSync(path.join(secretDir, 'flag.txt'), 'FLAG{review_file_workbench}');

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// VULNERABLE: path traversal can escape publicDir.
app.get('/download', (req, res) => {
  const name = req.query.name;
  const filePath = path.join(publicDir, name);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).send('File not found');
    res.send(data);
  });
});

// VULNERABLE: host is interpolated into a shell command.
app.post('/ping', (req, res) => {
  const { host } = req.body || {};
  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {
    res.json({ output: stdout || stderr || (err && err.message) });
  });
});

// VULNERABLE: executable files are accepted and served from the app origin.
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ ok: true, path: `/files/${req.file.originalname}` });
});

app.use('/files', express.static(uploadDir));

app.get('/uploads', (_req, res) => {
  res.json({ files: fs.readdirSync(uploadDir) });
});

app.post('/reset', (_req, res) => {
  fs.readdirSync(uploadDir).forEach((file) => fs.unlinkSync(path.join(uploadDir, file)));
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`review-file-workbench listening on ${PORT}`));
