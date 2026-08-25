const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// ディレクトリ構成:
//   public/readme.txt  — 一般公開ファイル
//   public/terms.txt   — 一般公開ファイル
//   secret/flag.txt    — 非公開・外部に出してはいけない

// VULNERABLE DOWNLOAD ENDPOINT
// ユーザー指定のファイル名を直接 path.join に渡しているため、
// ../ を含む名前で public ディレクトリの外に脱出できてしまう。
app.get('/download', (req, res) => {
  const name = req.query.name;
  const filePath = path.join(__dirname, 'public', name);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).send('File not found');
    res.send(data);
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`path-traversal-files listening on ${PORT}`));
